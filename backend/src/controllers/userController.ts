// ============================================================================
// ChessKhelo — User & Leaderboard Controller (In-Memory)
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import { users, publicUser, rankTierOf } from '../services/store';

// ── GET /api/users/leaderboard ───────────────────────────────
// Returns top 50 players sorted by rating descending
export const getLeaderboard = (_req: Request, res: Response): void => {
  const sorted = [...users.values()]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 50)
    .map((u, i) => ({ rank: i + 1, ...publicUser(u) }));

  res.json({ success: true, data: { leaderboard: sorted } });
};

// ── GET /api/users/online ────────────────────────────────────
export const getOnlineCount = (_req: Request, res: Response): void => {
  const count = [...users.values()].filter(u => u.isOnline).length;
  res.json({ success: true, data: { count } });
};

// ── GET /api/users/:username ─────────────────────────────────
export const getUserProfile = (req: Request, res: Response): void => {
  const user = [...users.values()].find(u =>
    u.username.toLowerCase() === req.params.username.toLowerCase()
  );
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }
  res.json({ success: true, data: { user: publicUser(user) } });
};
