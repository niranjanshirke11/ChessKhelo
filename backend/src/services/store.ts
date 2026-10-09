// ============================================================================
// ChessKhelo — In-Memory Store
// ============================================================================
// No database required. All users, games, and matchmaking queues live in
// server RAM. Data resets when the server restarts — perfect for demos and
// simple AWS deployments.
// ============================================================================

import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';
import { InMemoryUser, InMemoryGame, RankTier, GameResult, GameTermination } from '../types';

// ── User store: userId → InMemoryUser ───────────────────────
export const users = new Map<string, InMemoryUser>();

// ── Game store: gameId → InMemoryGame ───────────────────────
export const games = new Map<string, InMemoryGame>();

// ─────────────────────────────────────────────────────────────
// Helper: compute rank tier from rating
// ─────────────────────────────────────────────────────────────
export function rankTierOf(r: number): RankTier {
  if (r >= 2200) return 'Diamond';
  if (r >= 1800) return 'Platinum';
  if (r >= 1400) return 'Gold';
  if (r >= 1000) return 'Silver';
  return 'Bronze';
}

// ─────────────────────────────────────────────────────────────
// Helper: safe public view of a user (no password)
// ─────────────────────────────────────────────────────────────
export function publicUser(u: InMemoryUser) {
  return {
    id: u.id,
    username: u.username,
    rating: u.rating,
    rankTier: u.rankTier,
    country: u.country,
    avatar: u.avatar,
    stats: u.stats,
    badges: u.badges,
    isOnline: u.isOnline,
    createdAt: u.createdAt,
  };
}

// ─────────────────────────────────────────────────────────────
// Create a new user (used by register and guest routes)
// ─────────────────────────────────────────────────────────────
export async function createUser(
  username: string,
  plainPassword: string,
  country = '🌍',
  avatar = '♟'
): Promise<InMemoryUser> {
  const passwordHash = await bcrypt.hash(plainPassword, 10);
  const id = uuid();
  const user: InMemoryUser = {
    id,
    username,
    passwordHash,
    rating: 1200,
    rankTier: 'Bronze',
    country,
    avatar,
    stats: { gamesPlayed: 0, wins: 0, losses: 0, draws: 0, winStreak: 0, bestStreak: 0 },
    badges: ['Newcomer'],
    isOnline: false,
    createdAt: new Date(),
  };
  users.set(id, user);
  return user;
}

// ─────────────────────────────────────────────────────────────
// Create a guest user (random password, won't be remembered)
// ─────────────────────────────────────────────────────────────
export async function createGuestUser(
  preferredName = '',
  country = '🌍'
): Promise<InMemoryUser> {
  // Clean username
  let base = preferredName.trim().replace(/[^a-zA-Z0-9_]/g, '') || `Player_${Math.floor(1000 + Math.random() * 9000)}`;
  // Ensure uniqueness
  let username = base;
  let attempt = 1;
  while ([...users.values()].some(u => u.username === username)) {
    username = `${base}_${attempt++}`;
  }
  return createUser(username, `guest_${uuid()}`, country, '♟');
}

// ─────────────────────────────────────────────────────────────
// Find user by username (case-insensitive)
// ─────────────────────────────────────────────────────────────
export function findUserByUsername(username: string): InMemoryUser | undefined {
  return [...users.values()].find(u => u.username.toLowerCase() === username.toLowerCase());
}

// ─────────────────────────────────────────────────────────────
// Create a new in-memory game record
// ─────────────────────────────────────────────────────────────
export function createGame(
  whiteId: string,
  blackId: string,
  timeControl: { initial: number; increment: number },
  isRanked = true
): InMemoryGame {
  const gameId = uuid().slice(0, 8).toUpperCase();
  const game: InMemoryGame = {
    gameId,
    white: whiteId,
    black: blackId,
    timeControl,
    result: '*',
    termination: 'in_progress',
    moveList: [],
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    startedAt: new Date(),
    isRanked,
    ratingChange: { white: 0, black: 0 },
  };
  games.set(gameId, game);
  return game;
}

// ─────────────────────────────────────────────────────────────
// Finalize a game: update result, Elo, stats
// ─────────────────────────────────────────────────────────────
export function finalizeGame(
  gameId: string,
  result: GameResult,
  termination: GameTermination
): void {
  const game = games.get(gameId);
  if (!game || game.result !== '*') return;

  game.result = result;
  game.termination = termination;
  game.endedAt = new Date();

  const white = users.get(game.white);
  const black = users.get(game.black);
  if (!white || !black || !game.isRanked) return;

  // Elo calculation (FIDE K-factor)
  const kFactor = (r: number) => r < 1000 ? 40 : r < 1600 ? 32 : r < 2000 ? 24 : r < 2400 ? 16 : 12;
  const expected = (a: number, b: number) => 1 / (1 + Math.pow(10, (b - a) / 400));

  const e = expected(white.rating, black.rating);
  const score = result === '1-0' ? 1 : result === '0-1' ? 0 : 0.5;

  const wChange = Math.round(kFactor(white.rating) * (score - e));
  const bChange = Math.round(kFactor(black.rating) * ((1 - score) - (1 - e)));

  white.rating = Math.max(100, white.rating + wChange);
  black.rating = Math.max(100, black.rating + bChange);
  white.rankTier = rankTierOf(white.rating);
  black.rankTier = rankTierOf(black.rating);

  game.ratingChange = { white: wChange, black: bChange };

  // Update stats
  white.stats.gamesPlayed++;
  black.stats.gamesPlayed++;

  if (result === '1-0') {
    white.stats.wins++;
    black.stats.losses++;
    white.stats.winStreak++;
    black.stats.winStreak = 0;
    white.stats.bestStreak = Math.max(white.stats.winStreak, white.stats.bestStreak);
  } else if (result === '0-1') {
    black.stats.wins++;
    white.stats.losses++;
    black.stats.winStreak++;
    white.stats.winStreak = 0;
    black.stats.bestStreak = Math.max(black.stats.winStreak, black.stats.bestStreak);
  } else {
    white.stats.draws++;
    black.stats.draws++;
    white.stats.winStreak = 0;
    black.stats.winStreak = 0;
  }
}
