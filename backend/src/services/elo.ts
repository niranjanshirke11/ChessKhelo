import { RankTier } from '../types';

export const kFactor = (r: number) => r < 1000 ? 40 : r < 1600 ? 32 : r < 2000 ? 24 : r < 2400 ? 16 : 12;
export const expected = (a: number, b: number) => 1 / (1 + Math.pow(10, (b - a) / 400));

export function calcElo(wr: number, br: number, score: number) {
  const e = expected(wr, br);
  return {
    whiteChange: Math.round(kFactor(wr) * (score - e)),
    blackChange: Math.round(kFactor(br) * ((1 - score) - (1 - e))),
  };
}

export function rankTierOf(r: number): RankTier {
  if (r >= 2200) return 'Diamond'; if (r >= 1800) return 'Platinum';
  if (r >= 1400) return 'Gold';    if (r >= 1000) return 'Silver'; return 'Bronze';
}
