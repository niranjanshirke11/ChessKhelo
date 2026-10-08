import { Schema, model } from 'mongoose';
import { v4 as uuid } from 'uuid';
import { IGame } from '../types';

const gameSchema = new Schema<IGame>({
  gameId:       { type: String, default: () => uuid().slice(0,8).toUpperCase(), unique: true },
  white:        { type: Schema.Types.Mixed, required: true },
  black:        { type: Schema.Types.Mixed, required: true },
  timeControl:  { initial: { type: Number, required: true }, increment: { type: Number, default: 0 } },
  moves: [{ from: String, to: String, piece: String, captured: String, promotion: String, san: String, fen: String, timestamp: { type: Date, default: Date.now }, timeLeft: Number, _id: false }],
  moveList: [{ type: String }], // simple 'e2e4' strings for spectator replay
  pgn:          { type: String, default: '' },
  fen:          { type: String, default: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' },
  result:       { type: String, enum: ['1-0','0-1','1/2-1/2','*'], default: '*' },
  termination:  { type: String, enum: ['checkmate','resignation','timeout','draw_agreement','stalemate','insufficient_material','repetition','abandoned','in_progress'], default: 'in_progress' },
  ratingChange: { white: { type: Number, default: 0 }, black: { type: Number, default: 0 } },
  accuracy:     { white: { type: Number, default: 0 }, black: { type: Number, default: 0 } },
  isRanked:     { type: Boolean, default: true },
  spectators:   { type: Number, default: 0 },
  startedAt:    { type: Date, default: Date.now },
  endedAt:      Date,
}, { timestamps: true });

gameSchema.index({ white: 1, createdAt: -1 });
gameSchema.index({ black: 1, createdAt: -1 });
gameSchema.index({ gameId: 1 });

export const Game = model<IGame>('Game', gameSchema);
