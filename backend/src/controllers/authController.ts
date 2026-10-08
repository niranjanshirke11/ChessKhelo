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

// ── Validators ───────────────────────────────────────────────
export const registerValidators = [
  body('username').trim().isLength({ min: 3, max: 20 }).withMessage('Username must be 3–20 chars')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Letters, numbers, underscores only'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Min 8 characters')
    .matches(/[A-Z]/).withMessage('Must include uppercase letter')
    .matches(/[0-9]/).withMessage('Must include a number'),
];
export const loginValidators = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty().withMessage('Password required'),
];

// ── Register ──────────────────────────────────────────────────
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ success: false, errors: errors.array() }); return; }
    const { username, email, password, country = '🌍' } = req.body;
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) throw new AppError(existing.email === email ? 'Email already registered' : 'Username already taken', 409);
    const user = await User.create({ username, email, passwordHash: password, country, ratingHistory: [{ rating: 1200, date: new Date() }] });
    const token = signAccess(user._id.toString(), user.email);
    const refreshToken = signRefresh(user._id.toString());
    logger.info(`New user registered: ${username} (${email})`);
    res.status(201).json({ success: true, message: `Welcome to KnightOS, ${username}! 🎉`, data: { token, refreshToken, user: safeUser(user) } });
  } catch (err) { next(err); }
};

// ── Login ─────────────────────────────────────────────────────
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ success: false, errors: errors.array() }); return; }
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !(await user.comparePassword(password))) throw new AppError('Invalid email or password', 401);
    await User.findByIdAndUpdate(user._id, { isOnline: true, lastSeen: new Date() });
    const token = signAccess(user._id.toString(), user.email);
    const refreshToken = signRefresh(user._id.toString());
    res.json({ success: true, message: `Welcome back, ${user.username}! ♟`, data: { token, refreshToken, user: safeUser(user) } });
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
