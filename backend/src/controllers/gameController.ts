import { Response, NextFunction } from 'express';
import { Game } from '../models/Game';
import { User } from '../models/User';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/errorHandler';
import { calcElo } from '../services/elo';

export const getGame = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const game = await Game.findOne({ gameId: req.params.gameId })
      .populate('white', 'username rating avatar country rankTier')
      .populate('black', 'username rating avatar country rankTier');
    if (!game) throw new AppError('Game not found', 404);
    res.json({ success: true, data: { game } });
  } catch (err) { next(err); }
};

export const getUserGames = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const uid = req.params.userId || req.user?.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const [games, total] = await Promise.all([
      Game.find({ $or: [{ white: uid }, { black: uid }], result: { $ne: '*' } })
        .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
        .populate('white', 'username rating avatar').populate('black', 'username rating avatar'),
      Game.countDocuments({ $or: [{ white: uid }, { black: uid }], result: { $ne: '*' } }),
    ]);
    res.json({ success: true, data: { games, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
  } catch (err) { next(err); }
};

export const createAiGame = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { timeControl = '600+0' } = req.body;
    const [initial, increment] = timeControl.split('+').map(Number);
    const game = await Game.create({ white: req.user?.userId, black: 'ai', timeControl: { initial, increment }, isRanked: false });
    res.status(201).json({ success: true, data: { game } });
  } catch (err) { next(err); }
};

// Called from socket service when game ends
export const finalizeGame = async (gameId: string, result: '1-0' | '0-1' | '1/2-1/2', termination: string): Promise<void> => {
  const game = await Game.findOne({ gameId });
  if (!game || game.result !== '*') return;
  game.result = result; game.termination = termination as any; game.endedAt = new Date();
  const wId = game.white?.toString();
  const bId = typeof game.black === 'string' ? null : game.black?.toString();
  if (wId && bId) {
    const [wu, bu] = await Promise.all([User.findById(wId), User.findById(bId)]);
    if (wu && bu) {
      const score = result === '1-0' ? 1 : result === '0-1' ? 0 : 0.5;
      const { whiteChange, blackChange } = calcElo(wu.rating, bu.rating, score);
      game.ratingChange = { white: whiteChange, black: blackChange };
      const wWins = result === '1-0' ? 1 : 0;
      const wLoss = result === '0-1' ? 1 : 0;
      const wDraw = result === '1/2-1/2' ? 1 : 0;
      const bWins = result === '0-1' ? 1 : 0;
      const bLoss = result === '1-0' ? 1 : 0;
      const bDraw = wDraw;
      await Promise.all([
        User.findByIdAndUpdate(wId, { $inc: { rating: whiteChange, 'stats.gamesPlayed': 1, 'stats.wins': wWins, 'stats.losses': wLoss, 'stats.draws': wDraw }, $push: { ratingHistory: { rating: wu.rating + whiteChange, date: new Date() } } }),
        User.findByIdAndUpdate(bId, { $inc: { rating: blackChange, 'stats.gamesPlayed': 1, 'stats.wins': bWins, 'stats.losses': bLoss, 'stats.draws': bDraw }, $push: { ratingHistory: { rating: bu.rating + blackChange, date: new Date() } } }),
      ]);
    }
  }
  await game.save();
};
