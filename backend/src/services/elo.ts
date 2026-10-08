// ============================================================================
// ChessKhelo — Elo Rating Calculation Service (FIDE Standard)
// ============================================================================
// Formula:
// 1. Expected Score: E = 1 / (1 + 10^((Rating_B - Rating_A) / 400))
// 2. Rating Change: ΔR = K * (Actual_Score - Expected_Score)
//    - Actual_Score = 1 (Win), 0.5 (Draw), 0 (Loss)
//    - K-Factor determines volatility (higher for beginners, lower for masters)
// ============================================================================

import { RankTier } from '../types';

/**
 * Dynamic K-Factor based on player rating.
 * Beginners adjust faster (K=40), Grandmasters are more stable (K=12).
 */
export const kFactor = (r: number): number =>
  r < 1000 ? 40 : r < 1600 ? 32 : r < 2000 ? 24 : r < 2400 ? 16 : 12;

/**
 * Expected score probability between 0 and 1.
 */
export const expected = (a: number, b: number): number =>
  1 / (1 + Math.pow(10, (b - a) / 400));

/**
 * Calculates rating changes for White and Black given the final match score.
 * @param wr White player's current rating
 * @param br Black player's current rating
 * @param score Result from White's perspective (1 = White won, 0 = Black won, 0.5 = Draw)
 */
export function calcElo(wr: number, br: number, score: number) {
  const e = expected(wr, br);
  return {
    whiteChange: Math.round(kFactor(wr) * (score - e)),
    blackChange: Math.round(kFactor(br) * ((1 - score) - (1 - e))),
  };
}

/**
 * Determines competitive rank tier from current rating.
 */
export function rankTierOf(r: number): RankTier {
  if (r >= 2200) return 'Diamond';
  if (r >= 1800) return 'Platinum';
  if (r >= 1400) return 'Gold';
  if (r >= 1000) return 'Silver';
  return 'Bronze';
}

