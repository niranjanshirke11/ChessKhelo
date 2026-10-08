import { create } from 'zustand';
import { Chess } from 'chess.js';
import { sounds } from '../services/sounds';
import { detectOpening } from '../data/openings';

export type Phase = 'idle' | 'searching' | 'playing' | 'ended';
export type Color = 'white' | 'black';
export interface ChatMsg { userId: string; username: string; message: string; timestamp: Date; emoji?: string; }
export interface MoveRec { san: string; from: string; to: string; color: 'w' | 'b'; captured?: string; }
export interface Reaction { userId: string; username: string; emoji: string; id: number; }

interface GS {
  chess: Chess; fen: string; phase: Phase; gameId: string | null; playerColor: Color; isSpectator: boolean;
  whitePlayer: { username: string; rating: number } | null;
  blackPlayer: { username: string; rating: number } | null;
  selectedSq: string | null; validMoves: string[];
  lastMove: { from: string; to: string } | null; moves: MoveRec[];
  capW: string[]; capB: string[];
  evalScore: number; thinking: boolean;
  chat: ChatMsg[]; result: string | null; termination: string | null; eloChange: number | null;
  flipped: boolean; timeW: number; timeB: number; increment: number;
  opponent: { username: string; rating: number; id?: string } | null;
  opening: string | null;
  reactions: Reaction[];
  rematchOffered: boolean; rematchAccepted: boolean;
  spectators: number;

  initSpectator(id: string, whiteName: string, blackName: string, fen: string, moves: any[], whiteRating?: number, blackRating?: number): void;
  initGame(id: string, color: Color, opp: { username: string; rating: number; id?: string }, tc: number, inc?: number): void;
  selectSq(sq: string): void;
  applyMove(from: string, to: string, promo?: string): boolean;
  receiveMove(from: string, to: string, promo?: string): void;
  setEval(v: number): void;
  setThinking(v: boolean): void;
  addChat(m: ChatMsg): void;
  addReaction(r: Omit<Reaction, 'id'>): void;
  endGame(r: string, t: string, e: number): void;
  flip(): void;
  reset(): void;
  tick(): void;
  setSearching(): void;
  setRematchOffered(v: boolean): void;
  setSpectators(n: number): void;
}

const init = () => ({
  chess: new Chess(), fen: new Chess().fen(), phase: 'idle' as Phase, gameId: null,
  playerColor: 'white' as Color, selectedSq: null, validMoves: [],
  lastMove: null, moves: [], capW: [], capB: [],
  evalScore: 0, thinking: false, chat: [], result: null, termination: null, eloChange: null,
  flipped: false, timeW: 600, timeB: 600, increment: 0,
  opponent: null, opening: null, reactions: [],
  rematchOffered: false, rematchAccepted: false, spectators: 0, isSpectator: false,
  whitePlayer: null, blackPlayer: null,
});

let reactionId = 0;

export const useGame = create<GS>((set, get) => ({
  ...init(),

  initSpectator: (id: string, whiteName: string, blackName: string, fen: string, moves: any[], whiteRating = 1200, blackRating = 1200) => {
    const chess = new Chess();
    const replayedMoves: any[] = [];

    // Strategy 1: replay moves if we have them
    if (moves && moves.length > 0) {
      moves.forEach((m: any) => {
        try {
          let result: any = null;
          if (typeof m === 'string') {
            if (m.includes(',')) {
              // New format: "e2,e4" or "e2,e4,q"
              const parts = m.split(',');
              result = chess.move({ from: parts[0], to: parts[1], promotion: parts[2] || undefined });
            } else if (m.length >= 4) {
              // Legacy format: "e2e4"
              result = chess.move({ from: m.slice(0,2), to: m.slice(2,4), promotion: m[4] || undefined });
            }
          } else if (m && m.from && m.to) {
            result = chess.move({ from: m.from, to: m.to, promotion: m.promotion || undefined });
          } else if (m && m.san) {
            result = chess.move(m.san);
          }
          if (result) {
            replayedMoves.push({
              san: result.san, from: result.from, to: result.to,
              color: result.color, captured: result.captured,
            });
          }
        } catch(e) {}
      });
    }

    // Strategy 2: if moves replay failed or no moves, load directly from fen
    const startingFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    let finalChess = chess;
    if (replayedMoves.length === 0 && fen && fen !== startingFen && fen !== 'start') {
      try {
        finalChess = new Chess(fen);
        console.log('[Spectator] using fen directly:', fen);
      } catch(e) {
        finalChess = chess;
      }
    }

    const lastMove = replayedMoves.length > 0
      ? { from: replayedMoves[replayedMoves.length-1].from, to: replayedMoves[replayedMoves.length-1].to }
      : null;

    console.log(`[Spectator] initSpectator: ${replayedMoves.length} moves replayed, fen: ${finalChess.fen()}`);

    set({ ...init(), chess: finalChess, fen: finalChess.fen(), phase: 'playing', gameId: id,
      playerColor: 'white', isSpectator: true, flipped: false,
      moves: replayedMoves,
      lastMove,
      opponent: { username: blackName, rating: blackRating, id: '' },
      whitePlayer: { username: whiteName, rating: whiteRating },
      blackPlayer: { username: blackName, rating: blackRating },
    });
  },

  initGame: (id, color, opp, tc, inc = 0) => {
    const c = new Chess();
    set({ ...init(), chess: c, fen: c.fen(), phase: 'playing', gameId: id,
      playerColor: color, opponent: opp, timeW: tc, timeB: tc, increment: inc,
      flipped: color === 'black' });
  },

  selectSq: (sq) => {
    const { chess, selectedSq, validMoves, playerColor, phase, isSpectator } = get();
    if (phase !== 'playing') return;
    if (isSpectator) return; // spectators cannot move
    if (chess.turn() !== (playerColor === 'white' ? 'w' : 'b')) return;
    if (selectedSq && validMoves.includes(sq)) { get().applyMove(selectedSq, sq); return; }
    const p = chess.get(sq as any);
    if (p && p.color === chess.turn()) {
      set({ selectedSq: sq, validMoves: chess.moves({ square: sq as any, verbose: true }).map(m => m.to) });
    } else { set({ selectedSq: null, validMoves: [] }); }
  },

  applyMove: (from, to, promo = 'q') => {
    const { chess, capW, capB, moves, increment, timeW, timeB } = get();
    try {
      const mv = chess.move({ from: from as any, to: to as any, promotion: promo as any });
      if (!mv) return false;
      const cW = [...capW], cB = [...capB];
      if (mv.captured) { mv.color === 'w' ? cW.push(mv.captured) : cB.push(mv.captured); }

      // Apply increment to the player who just moved
      const newTimeW = mv.color === 'w' ? Math.min(timeW + increment, timeW + increment) : timeW;
      const newTimeB = mv.color === 'b' ? Math.min(timeB + increment, timeB + increment) : timeB;

      // Detect opening
      const newMoves = [...moves, { san: mv.san, from, to, color: mv.color as 'w'|'b', captured: mv.captured }];
      const opening = detectOpening(newMoves.map(m => m.san));

      // Sound effects
      if (mv.san.includes('#')) sounds.win();
      else if (mv.san.includes('+')) sounds.check();
      else if (mv.flags.includes('k') || mv.flags.includes('q')) sounds.castle();
      else if (mv.flags.includes('p')) sounds.promote();
      else if (mv.captured) sounds.capture();
      else sounds.move();

      set({
        fen: chess.fen(),
        lastMove: { from, to },
        selectedSq: null, validMoves: [],
        capW: cW, capB: cB,
        moves: newMoves,
        timeW: newTimeW,
        timeB: newTimeB,
        opening: opening?.name || get().opening,
      });
      return true;
    } catch { return false; }
  },

  receiveMove: (f, t, p) => { get().applyMove(f, t, p); },
  setEval: (v) => set({ evalScore: v }),
  setThinking: (v) => set({ thinking: v }),
  addChat: (m) => set(s => ({ chat: [...s.chat, m].slice(-80) })),
  addReaction: (r) => {
    const reaction = { ...r, id: ++reactionId };
    set(s => ({ reactions: [...s.reactions.slice(-20), reaction] }));
    setTimeout(() => {
      set(s => ({ reactions: s.reactions.filter(x => x.id !== reaction.id) }));
    }, 3000);
  },
  endGame: (r, t, e) => {
    set({ phase: 'ended', result: r, termination: t, eloChange: e });
    if (r === '1/2-1/2') sounds.draw();
    else {
      const { playerColor } = get();
      const iWon = (r === '1-0' && playerColor === 'white') || (r === '0-1' && playerColor === 'black');
      iWon ? sounds.win() : sounds.lose();
    }
  },
  flip: () => set(s => ({ flipped: !s.flipped })),
  reset: () => set({ ...init(), chess: new Chess(), fen: new Chess().fen() }),
  setSearching: () => set({ phase: 'searching' }),
  setRematchOffered: (v) => set({ rematchOffered: v }),
  setSpectators: (n) => set({ spectators: n }),
  tick: () => {
    const { chess, timeW, timeB, phase } = get();
    if (phase !== 'playing') return;
    if (chess.turn() === 'w') {
      const t = Math.max(0, timeW - 1);
      set({ timeW: t });
      if (t <= 10) sounds.lowTime();
      if (t === 0) {
        get().endGame('0-1', 'timeout', -15);
        // Report to backend
        const { gameId } = get();
        if (gameId) {
          import('../services/socket').then(({ getSocket }) => {
            getSocket().emit('game:report_result', { gameId, result: '0-1', termination: 'timeout' });
          });
        }
      }
    } else {
      const t = Math.max(0, timeB - 1);
      set({ timeB: t });
      if (t <= 10) sounds.lowTime();
      if (t === 0) {
        get().endGame('1-0', 'timeout', 15);
        const { gameId } = get();
        if (gameId) {
          import('../services/socket').then(({ getSocket }) => {
            getSocket().emit('game:report_result', { gameId, result: '1-0', termination: 'timeout' });
          });
        }
      }
    }
  },
}));
