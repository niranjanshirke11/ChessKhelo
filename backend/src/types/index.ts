import { Request } from 'express';

// ── JWT Payload ──────────────────────────────────────────────
export interface JwtPayload { userId: string; username: string; iat?: number; exp?: number; }

// ── Express Request with auth ────────────────────────────────
export interface AuthRequest extends Request {
  user?: JwtPayload;
  userId?: string;
  username?: string;
}

// ── Rank Tiers (purely cosmetic, computed from in-memory rating) ──
export type RankTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';

// ── Game Types ───────────────────────────────────────────────
export type GameResult = '1-0' | '0-1' | '1/2-1/2' | '*';
export type GameTermination =
  | 'checkmate' | 'resignation' | 'timeout' | 'draw_agreement'
  | 'stalemate' | 'insufficient_material' | 'repetition' | 'abandoned' | 'in_progress';

// ── In-Memory User ───────────────────────────────────────────
export interface InMemoryUser {
  id: string;
  username: string;
  passwordHash: string;   // bcrypt hash
  rating: number;
  rankTier: RankTier;
  country: string;
  avatar: string;
  stats: {
    gamesPlayed: number; wins: number; losses: number; draws: number;
    winStreak: number; bestStreak: number;
  };
  badges: string[];
  isOnline: boolean;
  createdAt: Date;
}

// ── In-Memory Game ───────────────────────────────────────────
export interface InMemoryGame {
  gameId: string;
  white: string;   // userId
  black: string;   // userId
  timeControl: { initial: number; increment: number };
  result: GameResult;
  termination: GameTermination;
  moveList: string[];  // 'e2,e4' strings
  fen: string;
  startedAt: Date;
  endedAt?: Date;
  isRanked: boolean;
  ratingChange: { white: number; black: number };
}
