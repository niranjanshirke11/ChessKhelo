import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { Game } from '../models/Game';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/errorHandler';

// Simple in-memory cache (replace with Redis in prod)
const _cache = new Map<string, { v: any; exp: number }>();
const memo = async (key: string, ttl: number, fn: () => Promise<any>) => {
  const hit = _cache.get(key);
  if (hit && Date.now() < hit.exp) return hit.v;
  const v = await fn();
  _cache.set(key, { v, exp: Date.now() + ttl * 1000 });
  return v;
};

export const getUserProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select('-passwordHash');
    if (!user) throw new AppError('User not found', 404);
    const recentGames = await Game.find({ $or: [{ white: user._id }, { black: user._id }], result: { $ne: '*' } })
      .sort({ createdAt: -1 }).limit(10)
      .populate('white', 'username rating avatar').populate('black', 'username rating avatar');
    res.json({ success: true, data: { user, recentGames } });
  } catch (err) { next(err); }
};

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const picks: any = {};
    ['avatar', 'country'].forEach(f => { if (req.body[f] !== undefined) picks[f] = req.body[f]; });
    const user = await User.findByIdAndUpdate(req.user?.userId, picks, { new: true }).select('-passwordHash');
    res.json({ success: true, data: { user } });
  } catch (err) { next(err); }
};

export const searchUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = (req.query.q as string)?.trim();
    if (!q || q.length < 2) { res.json({ success: true, data: { users: [] } }); return; }
    const users = await User.find({ username: { $regex: q, $options: 'i' } })
      .select('username rating rankTier avatar country isOnline').limit(10);
    res.json({ success: true, data: { users } });
  } catch (err) { next(err); }
};

export const getOnlineCount = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const count = await User.countDocuments({ isOnline: true });
    res.json({ success: true, data: { count } });
  } catch (err) { next(err); }
};

export const getLeaderboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tier = req.query.tier as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const key = `lb:${tier || 'all'}:${page}:${limit}`;

    const result = await memo(key, 60, async () => {
      const filter: any = {};
      if (tier && tier !== 'all') filter.rankTier = tier;
      const [users, total] = await Promise.all([
        User.find(filter).sort({ rating: -1 }).skip((page - 1) * limit).limit(limit)
          .select('username rating rankTier avatar country stats isOnline'),
        User.countDocuments(filter),
      ]);
      return {
        success: true,
        data: {
          players: users.map((u, i) => ({
            rank: (page - 1) * limit + i + 1,
            id: u._id, username: u.username, rating: u.rating,
            rankTier: u.rankTier, avatar: u.avatar, country: u.country, isOnline: u.isOnline,
            winRate: u.stats.gamesPlayed > 0 ? Math.round((u.stats.wins / u.stats.gamesPlayed) * 100) : 0,
            gamesPlayed: u.stats.gamesPlayed, winStreak: u.stats.winStreak,
          })),
          pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        },
      };
    });
    res.json(result);
  } catch (err) { next(err); }
};
