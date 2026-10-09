import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { User } from '../models/User';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../types';
import logger from '../services/logger';

const signAccess  = (userId: string, email: string) => jwt.sign({ userId, email }, process.env.JWT_SECRET!,  { expiresIn: (process.env.JWT_EXPIRES_IN  || '7d') as any });
const signRefresh = (userId: string)                => jwt.sign({ userId },        process.env.JWT_REFRESH_SECRET!, { expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '30d') as any });

const safeUser = (u: any) => ({
  id: u._id, username: u.username, email: u.email, rating: u.rating, rankTier: u.rankTier,
  plan: u.plan, avatar: u.avatar, country: u.country, stats: u.stats, badges: u.badges, createdAt: u.createdAt,
});

// ── Validators (Simple & Friendly) ───────────────────────────
export const registerValidators = [
  body('username').trim().isLength({ min: 2, max: 30 }).withMessage('Username must be at least 2 characters'),
  body('password').isLength({ min: 3 }).withMessage('Password must be at least 3 characters'),
];

export const loginValidators = [
  body('password').notEmpty().withMessage('Password is required'),
];

// ── Register (Simple & Fast) ──────────────────────────────────
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { 
      res.status(400).json({ success: false, errors: errors.array(), message: errors.array()[0]?.msg || 'Validation failed' }); 
      return; 
    }
    
    let { username, email, password, country = '🌍' } = req.body;
    username = username.trim();
    
    // If no email is provided, generate a clean local identifier
    if (!email || !email.trim()) {
      email = `${username.toLowerCase().replace(/[^a-z0-9_]/g, '')}_${Date.now().toString().slice(-4)}@chesskhelo.local`;
    } else {
      email = email.trim().toLowerCase();
    }

    // Check existing
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      throw new AppError(existing.username.toLowerCase() === username.toLowerCase() ? 'Username already taken. Please choose another.' : 'Email already registered', 409);
    }

    const user = await User.create({ 
      username, 
      email, 
      passwordHash: password, 
      country, 
      ratingHistory: [{ rating: 1200, date: new Date() }] 
    });

    const token = signAccess(user._id.toString(), user.email);
    const refreshToken = signRefresh(user._id.toString());
    logger.info(`New user registered: ${username} (${email})`);
    
    res.status(201).json({ 
      success: true, 
      message: `Welcome to ChessKhelo, ${username}! 🎉`, 
      data: { token, refreshToken, user: safeUser(user) } 
    });
  } catch (err) { next(err); }
};

// ── Quick Guest / Temporary Registration ──────────────────────
export const guestLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let { username = '', country = '🌍' } = req.body;
    username = username.trim().replace(/[^a-zA-Z0-9_]/g, '');
    
    if (!username || username.length < 2) {
      username = `Player_${Math.floor(1000 + Math.random() * 9000)}`;
    }
    
    let uniqueUsername = username;
    let count = 1;
    while (await User.findOne({ username: uniqueUsername })) {
      uniqueUsername = `${username}_${count++}`;
    }

    const tempEmail = `${uniqueUsername.toLowerCase()}@guest.chesskhelo.local`;
    const user = await User.create({
      username: uniqueUsername,
      email: tempEmail,
      passwordHash: `guest_${Date.now()}_${Math.random()}`,
      country,
      ratingHistory: [{ rating: 1200, date: new Date() }],
    });

    const token = signAccess(user._id.toString(), user.email);
    const refreshToken = signRefresh(user._id.toString());
    logger.info(`Guest session created: ${uniqueUsername}`);
    
    res.status(201).json({
      success: true,
      message: `Welcome, ${user.username}! ♟`,
      data: { token, refreshToken, user: safeUser(user) },
    });
  } catch (err) { next(err); }
};

// ── Login (Accepts Username or Email) ──────────────────────────
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, username, loginId, password } = req.body;
    const identifier = (loginId || email || username || '').trim();
    
    if (!identifier) {
      res.status(400).json({ success: false, message: 'Please enter your username or email' });
      return;
    }
    if (!password) {
      res.status(400).json({ success: false, message: 'Please enter your password' });
      return;
    }

    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { username: identifier },
      ],
    }).select('+passwordHash');

    if (!user || !(await user.comparePassword(password))) {
      throw new AppError('Invalid username/email or password', 401);
    }

    await User.findByIdAndUpdate(user._id, { isOnline: true, lastSeen: new Date() });
    const token = signAccess(user._id.toString(), user.email);
    const refreshToken = signRefresh(user._id.toString());
    
    res.json({ 
      success: true, 
      message: `Welcome back, ${user.username}! ♟`, 
      data: { token, refreshToken, user: safeUser(user) } 
    });
  } catch (err) { next(err); }
};

// ── Refresh ───────────────────────────────────────────────────
export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken: rt } = req.body;
    if (!rt) throw new AppError('Refresh token required', 400);
    const decoded = jwt.verify(rt, process.env.JWT_REFRESH_SECRET!) as { userId: string };
    const user = await User.findById(decoded.userId);
    if (!user) throw new AppError('User not found', 404);
    res.json({ success: true, data: { token: signAccess(user._id.toString(), user.email) } });
  } catch (err) { next(err); }
};

// ── Get me ────────────────────────────────────────────────────
export const getMe = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findById(req.user?.userId);
    if (!user) throw new AppError('User not found', 404);
    res.json({ success: true, data: { user: safeUser(user) } });
  } catch (err) { next(err); }
};

// ── Logout ────────────────────────────────────────────────────
export const logout = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await User.findByIdAndUpdate(req.user?.userId, { isOnline: false, lastSeen: new Date() });
    res.json({ success: true, message: 'Signed out successfully' });
  } catch (err) { next(err); }
};
