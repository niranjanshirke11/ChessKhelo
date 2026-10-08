import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import logger from '../services/logger';

const signAccess  = (userId: string, email: string) => jwt.sign({ userId, email }, process.env.JWT_SECRET!,  { expiresIn: (process.env.JWT_EXPIRES_IN  || '7d') as any });
const signRefresh = (userId: string)                => jwt.sign({ userId },        process.env.JWT_REFRESH_SECRET!, { expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '30d') as any });

const safeUser = (u: any) => ({
  id: u._id, username: u.username, email: u.email, rating: u.rating, rankTier: u.rankTier,
  plan: u.plan, avatar: u.avatar, country: u.country, stats: u.stats, badges: u.badges, createdAt: u.createdAt,
});

// POST /api/auth/google
export const googleAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { credential, userInfo } = req.body;
    if (!credential || !userInfo) { 
      res.status(400).json({ success: false, message: 'Google credential required' }); 
      return; 
    }

    const { email, name, picture, sub: googleId } = userInfo;
    if (!email) { res.status(400).json({ success: false, message: 'Email not found in Google account' }); return; }

    // Check if user already exists
    let user = await User.findOne({ email });

    if (user) {
      // Existing user — just login
      await User.findByIdAndUpdate(user._id, { isOnline: true, lastSeen: new Date() });
      const token = signAccess(user._id.toString(), user.email);
      const refreshToken = signRefresh(user._id.toString());
      res.json({ success: true, message: `Welcome back, ${user.username}! ♟`, data: { token, refreshToken, user: safeUser(user) } });
    } else {
      // New user — create account
      let baseUsername = (name || email.split('@')[0]).replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 18);
      let username = baseUsername;
      let counter = 1;

      while (await User.findOne({ username })) {
        username = `${baseUsername}${counter}`;
        counter++;
      }

      user = await User.create({
        username,
        email,
        passwordHash: `google_oauth_${googleId}_${Date.now()}`,
        avatar: picture || '♟',
        country: '🌍',
        ratingHistory: [{ rating: 1200, date: new Date() }],
      });

      const token = signAccess(user._id.toString(), user.email);
      const refreshToken = signRefresh(user._id.toString());
      logger.info(`New Google user: ${username} (${email})`);
      res.status(201).json({ success: true, message: `Welcome to KnightOS, ${username}! 🎉`, data: { token, refreshToken, user: safeUser(user) } });
    }
  } catch (err) {
    next(err);
  }
};
