import { Request } from 'express';
import { Document, Types } from 'mongoose';

export interface JwtPayload { userId: string; email: string; iat?: number; exp?: number; }
export interface AuthRequest extends Request {
  user?: JwtPayload;
  userId?: string;   // shorthand set by auth middleware
  userEmail?: string;
}
export type RankTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';
export type PlanType = 'free' | 'premium' | 'elite';
export type GameResult = '1-0' | '0-1' | '1/2-1/2' | '*';
export type GameTermination =
  | 'checkmate' | 'resignation' | 'timeout' | 'draw_agreement'
  | 'stalemate' | 'insufficient_material' | 'repetition' | 'abandoned' | 'in_progress';

export interface IUser extends Document {
  _id: Types.ObjectId;
  username: string; email: string; passwordHash: string;
  avatar: string; country: string; rating: number;
  ratingHistory: { rating: number; date: Date }[];
  rankTier: RankTier; plan: PlanType; planExpiresAt?: Date;
  stats: { gamesPlayed: number; wins: number; losses: number; draws: number; winStreak: number; bestStreak: number; accuracy: number; };
  badges: string[]; isOnline: boolean; lastSeen: Date;
  createdAt: Date; updatedAt: Date;
  comparePassword(p: string): Promise<boolean>;
  getRankTier(): RankTier;
}

export interface IGame extends Document {
  _id: Types.ObjectId; gameId: string;
  white: Types.ObjectId | string; black: Types.ObjectId | string;
  timeControl: { initial: number; increment: number };
  moves: { from: string; to: string; piece: string; captured?: string; promotion?: string; san: string; fen: string; timestamp: Date; timeLeft: number; }[];
  moveList: string[];
  pgn: string; fen: string; result: GameResult; termination: GameTermination;
  ratingChange: { white: number; black: number }; accuracy: { white: number; black: number };
  isRanked: boolean; spectators: number; startedAt: Date; endedAt?: Date; createdAt: Date;
}
