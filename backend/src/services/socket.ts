import { Server as HttpServer } from 'http';
import { Chess } from 'chess.js';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Game } from '../models/Game';
import { finalizeGame } from '../controllers/gameController';
import logger from './logger';
import { JwtPayload } from '../types';

interface GSocket extends Socket { userId?: string; username?: string; rating?: number; }

const queues: Record<string, { userId: string; username: string; rating: number; socketId: string }[]> = {
  '60+0': [], '180+0': [], '300+0': [], '600+0': [], '900+10': [],
};

// Rematch offers: gameId -> { offeredBy: userId }
const rematchOffers: Record<string, string> = {};
// Spectator counts: gameId -> count
const spectatorCounts: Record<string, number> = {};

let io: Server;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true },
    pingTimeout: 60000, pingInterval: 25000,
  });

  io.use(async (socket: GSocket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('No token'));
      const d = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
      const user = await User.findById(d.userId).select('username rating');
      if (!user) return next(new Error('User not found'));
      socket.userId = d.userId; socket.username = user.username; socket.rating = user.rating;
      next();
    } catch { next(new Error('Invalid token')); }
  });

  io.on('connection', (socket: GSocket) => {
    logger.info(`Socket connected: ${socket.username} [${socket.id}]`);
    User.findByIdAndUpdate(socket.userId, { isOnline: true }).exec();

    // ── Matchmaking ──────────────────────────────────────────
    socket.on('matchmaking:join', async ({ timeControl }: { timeControl: string }) => {
      try {
        logger.info(`Matchmaking join: ${socket.username} (${socket.rating}) for ${timeControl}`);
        const q = queues[timeControl];
        if (!q) {
          logger.warn(`Invalid timeControl: ${timeControl}, valid: ${Object.keys(queues).join(',')}`);
          return socket.emit('error', { message: 'Invalid time control' });
        }
        // Remove from all queues first
        Object.values(queues).forEach(qq => { const i = qq.findIndex(p => p.userId === socket.userId); if (i !== -1) qq.splice(i, 1); });

        logger.info(`Queue for ${timeControl} has ${q.length} players: ${q.map(p=>p.username).join(',')}`);

        // Find opponent with any rating (remove ELO restriction for easier matching)
        const oi = q.findIndex(p => p.userId !== socket.userId);
        if (oi !== -1) {
          const opp = q.splice(oi, 1)[0];
          const [init, inc] = timeControl.split('+').map(Number);
          logger.info(`Matched: ${opp.username} vs ${socket.username}`);
          const game = await Game.create({ white: opp.userId, black: socket.userId, timeControl: { initial: init, increment: inc }, isRanked: true });
          logger.info(`Game created: ${game.gameId}`);
          const os = io.sockets.sockets.get(opp.socketId) as GSocket | undefined;
          logger.info(`Opponent socket found: ${!!os}`);
          socket.join(`game:${game.gameId}`); os?.join(`game:${game.gameId}`);
          socket.emit('matchmaking:found', { gameId: game.gameId, color: 'black', timeControl, increment: inc, opponent: { username: opp.username, rating: opp.rating, id: opp.userId } });
          os?.emit('matchmaking:found', { gameId: game.gameId, color: 'white', timeControl, increment: inc, opponent: { username: socket.username, rating: socket.rating, id: socket.userId } });
          logger.info(`Match complete: ${opp.username} vs ${socket.username} → ${game.gameId}`);
        } else {
          q.push({ userId: socket.userId!, username: socket.username!, rating: socket.rating || 1200, socketId: socket.id });
          logger.info(`Added ${socket.username} to queue. Queue size: ${q.length}`);
          socket.emit('matchmaking:searching', { queueSize: q.length });
        }
      } catch (err) {
        logger.error(`Matchmaking error: ${err}`);
        socket.emit('error', { message: 'Matchmaking failed' });
      }
    });

    socket.on('matchmaking:leave', () => {
      Object.values(queues).forEach(q => { const i = q.findIndex(p => p.userId === socket.userId); if (i !== -1) q.splice(i, 1); });
    });

    // ── Game room ─────────────────────────────────────────────
    socket.on('game:join', async ({ gameId, spectate }: { gameId: string; spectate?: boolean }) => {
      socket.join(`game:${gameId}`);
      // Only send game:state to spectators — real players already have state from matchmaking:found
      if (spectate) {
        spectatorCounts[gameId] = (spectatorCounts[gameId] || 0) + 1;
        io.to(`game:${gameId}`).emit('game:spectators', { count: spectatorCounts[gameId] });
        const game = await Game.findOne({ gameId })
          .populate('white', 'username rating avatar').populate('black', 'username rating avatar');
        if (game) {
          const ml = (game as any).moveList || [];
          logger.info(`[spectate] sending game:state for ${gameId}: ${ml.length} moves, fen: ${(game as any).fen}`);
          socket.emit('game:state', {
            game: {
              gameId: game.gameId,
              white: game.white,
              black: game.black,
              moves: ml,
              fen: (game as any).fen,
              result: game.result,
              timeControl: game.timeControl,
            }
          });
        }
      }
    });

    socket.on('game:leave', ({ gameId, spectate }: { gameId: string; spectate?: boolean }) => {
      socket.leave(`game:${gameId}`);
      if (spectate && spectatorCounts[gameId]) {
        spectatorCounts[gameId] = Math.max(0, spectatorCounts[gameId] - 1);
        io.to(`game:${gameId}`).emit('game:spectators', { count: spectatorCounts[gameId] });
      }
    });

    socket.on('game:move', ({ gameId, from, to, promotion }: any) => {
      // Broadcast move to entire room including spectators (use io.to not socket.to)
      socket.to(`game:${gameId}`).emit('game:move', { from, to, promotion, playerId: socket.userId });
      // Save move as "from,to,promo" so spectator replay can parse from/to correctly
      const moveStr = `${from},${to}${promotion ? ',' + promotion : ''}`;
      // Also rebuild fen by loading game and applying move
      Game.findOne({ gameId }).then(g => {
        if (!g) return;
        try {
          const { Chess: ChessEngine } = require('chess.js');
          const ch = new ChessEngine((g as any).fen || undefined);
          const mv = ch.move({ from, to, promotion: promotion || 'q' });
          if (mv) {
            Game.updateOne({ gameId }, { 
              $push: { moveList: moveStr },
              $set: { fen: ch.fen() }
            }).exec();
          } else {
            Game.updateOne({ gameId }, { $push: { moveList: moveStr } }).exec();
          }
        } catch {
          Game.updateOne({ gameId }, { $push: { moveList: moveStr } }).exec();
        }
      }).catch(() => {});
    });

    // Frontend detects checkmate/draw and reports result
    socket.on('game:report_result', async ({ gameId, result, termination }: any) => {
      try {
        logger.info(`game:report_result: ${gameId} → ${result} (${termination}) by ${socket.username}`);
        const game = await Game.findOne({ gameId });
        if (!game) { logger.warn(`game:report_result: game not found ${gameId}`); return; }
        if (game.result !== '*') { logger.info(`game:report_result: already finalized ${gameId}`); return; }
        await finalizeGame(gameId, result, termination);
        io.to(`game:${gameId}`).emit('game:end', { result, termination });
        logger.info(`Game finalized: ${gameId} → ${result}`);
      } catch (err) {
        logger.error(`game:report_result error: ${err}`);
      }
    });

    socket.on('game:resign', async ({ gameId }: { gameId: string }) => {
      const game = await Game.findOne({ gameId });
      if (!game || game.result !== '*') return;
      const result = game.white?.toString() === socket.userId ? '0-1' : '1-0';
      await finalizeGame(gameId, result, 'resignation');
      io.to(`game:${gameId}`).emit('game:end', { result, termination: 'resignation', resignedBy: socket.userId });
    });

    socket.on('game:offer_draw', ({ gameId }: { gameId: string }) => {
      socket.to(`game:${gameId}`).emit('game:offer_draw', { offeredBy: socket.userId, username: socket.username });
    });

    socket.on('game:accept_draw', async ({ gameId }: { gameId: string }) => {
      await finalizeGame(gameId, '1/2-1/2', 'draw_agreement');
      io.to(`game:${gameId}`).emit('game:end', { result: '1/2-1/2', termination: 'draw_agreement' });
    });

    socket.on('game:chat', ({ gameId, message }: { gameId: string; message: string }) => {
      if (!message?.trim() || message.length > 200) return;
      io.to(`game:${gameId}`).emit('game:chat', {
        userId: socket.userId, username: socket.username,
        message: message.trim(), timestamp: new Date()
      });
    });

    // ── Emoji reactions ───────────────────────────────────────
    socket.on('game:reaction', ({ gameId, emoji }: { gameId: string; emoji: string }) => {
      const allowed = ['👏','😮','🔥','😂','🤔','💪','😤','🎯','♟','⚡'];
      if (!allowed.includes(emoji)) return;
      io.to(`game:${gameId}`).emit('game:reaction', {
        userId: socket.userId, username: socket.username, emoji
      });
    });

    // ── Rematch ───────────────────────────────────────────────
    socket.on('game:rematch_offer', ({ gameId }: { gameId: string }) => {
      rematchOffers[gameId] = socket.userId!;
      socket.to(`game:${gameId}`).emit('game:rematch_offered', { username: socket.username });
    });

    socket.on('game:rematch_accept', async ({ gameId }: { gameId: string }) => {
      const offeredBy = rematchOffers[gameId];
      if (!offeredBy || offeredBy === socket.userId) return;
      delete rematchOffers[gameId];

      // Find original game to get players and time control
      const orig = await Game.findOne({ gameId });
      if (!orig) return;

      // Swap colors
      const newWhite = orig.black?.toString();
      const newBlack = orig.white?.toString();
      const [wUser, bUser] = await Promise.all([
        User.findById(newWhite).select('username rating'),
        User.findById(newBlack).select('username rating'),
      ]);

      const newGame = await Game.create({
        white: newWhite, black: newBlack,
        timeControl: orig.timeControl, isRanked: true
      });

      const tc = `${orig.timeControl.initial}+${orig.timeControl.increment}`;

      // Get sockets for both players
      const allSockets = await io.fetchSockets();
      const wSocket = allSockets.find(s => (s as any).userId === newWhite);
      const bSocket = allSockets.find(s => (s as any).userId === newBlack);

      wSocket?.join(`game:${newGame.gameId}`);
      bSocket?.join(`game:${newGame.gameId}`);

      io.to(wSocket?.id || '').emit('game:rematch_start', {
        gameId: newGame.gameId, color: 'white', timeControl: tc,
        increment: orig.timeControl.increment,
        opponent: { username: bUser?.username, rating: bUser?.rating, id: newBlack }
      });
      io.to(bSocket?.id || '').emit('game:rematch_start', {
        gameId: newGame.gameId, color: 'black', timeControl: tc,
        increment: orig.timeControl.increment,
        opponent: { username: wUser?.username, rating: wUser?.rating, id: newWhite }
      });
    });

    socket.on('game:rematch_decline', ({ gameId }: { gameId: string }) => {
      delete rematchOffers[gameId];
      socket.to(`game:${gameId}`).emit('game:rematch_declined');
    });

    // ── Spectator: list live games ────────────────────────────
    socket.on('spectate:list', async () => {
      try {
        const liveGames = await Game.find({ result: '*' })
          .populate('white', 'username rating')
          .populate('black', 'username rating')
          .sort({ createdAt: -1 }).limit(20);
        socket.emit('spectate:list', liveGames.map(g => ({
          gameId: g.gameId,
          white: (g.white as any)?.username,
          black: (g.black as any)?.username,
          whiteRating: (g.white as any)?.rating,
          blackRating: (g.black as any)?.rating,
          spectators: spectatorCounts[g.gameId] || 0,
          timeControl: `${g.timeControl.initial}+${g.timeControl.increment}`,
          moves: g.moves?.length || 0,
        })));
      } catch {}
    });


    // ── Friends & Challenges ──────────────────────────────────
    const findSocket = (userId: string): GSocket | undefined =>
      [...io.sockets.sockets.values()].find(s => (s as GSocket).userId === userId) as GSocket | undefined;

    // Notify someone when they receive a friend request
    socket.on('friend:notify_request', ({ toUserId }: { toUserId: string }) => {
      findSocket(toUserId)?.emit('friend:request_received', { username: socket.username });
    });

    // Notify challenger when request accepted
    socket.on('friend:notify_accept', ({ toUserId }: { toUserId: string }) => {
      findSocket(toUserId)?.emit('friend:accepted', { username: socket.username });
    });

    // Send challenge to a friend
    socket.on('friend:challenge', ({ toUserId, timeControl }: { toUserId: string; timeControl: string }) => {
      const target = findSocket(toUserId);
      if (!target) {
        socket.emit('friend:challenge_failed', { message: 'Player is offline' });
        return;
      }
      target.emit('friend:challenge_received', {
        fromUserId: socket.userId,
        fromUsername: socket.username,
        fromRating: socket.rating,
        timeControl,
      });
      logger.info(`Challenge: ${socket.username} → ${toUserId} (${timeControl})`);
    });

    // Accept challenge — create game and start for both
    socket.on('friend:challenge_accept', async ({ fromUserId, timeControl }: any) => {
      try {
        const [init, inc] = timeControl.split('+').map(Number);
        const game = await Game.create({
          white: fromUserId, black: socket.userId,
          timeControl: { initial: init, increment: inc }, isRanked: true,
        });
        const fromSocket = findSocket(fromUserId);
        socket.join(`game:${game.gameId}`);
        fromSocket?.join(`game:${game.gameId}`);
        // Challenger = white, acceptor = black
        fromSocket?.emit('matchmaking:found', {
          gameId: game.gameId, color: 'white', timeControl, increment: inc,
          opponent: { username: socket.username, rating: socket.rating, id: socket.userId },
        });
        socket.emit('matchmaking:found', {
          gameId: game.gameId, color: 'black', timeControl, increment: inc,
          opponent: { username: fromSocket ? (fromSocket as GSocket).username : 'Opponent', rating: fromSocket ? (fromSocket as GSocket).rating : 1200, id: fromUserId },
        });
        logger.info(`Friend game started: ${game.gameId}`);
      } catch (err) {
        logger.error(`friend:challenge_accept error: ${err}`);
      }
    });

    // Decline challenge
    socket.on('friend:challenge_decline', ({ fromUserId }: { fromUserId: string }) => {
      findSocket(fromUserId)?.emit('friend:challenge_declined', { username: socket.username });
    });

    socket.on('disconnect', () => {
      Object.values(queues).forEach(q => { const i = q.findIndex(p => p.userId === socket.userId); if (i !== -1) q.splice(i, 1); });
      setTimeout(async () => {
        const ss = await io.fetchSockets();
        if (!ss.some(s => (s as any).userId === socket.userId))
          await User.findByIdAndUpdate(socket.userId, { isOnline: false, lastSeen: new Date() });
      }, 30_000);
    });
  });

  return io;
}

export { io };
