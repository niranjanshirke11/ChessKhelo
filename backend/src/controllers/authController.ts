// ============================================================================
// ChessKhelo — Auth Controller (No Database)
// ============================================================================
// Uses in-memory user store. Users are created with bcrypt-hashed passwords
// and authenticated via JWT. Data lives in RAM — resets on server restart.
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../types';
import { users, createUser, createGuestUser, findUserByUsername, publicUser } from '../services/store';

const JWT_SECRET = process.env.JWT_SECRET || 'chesskhelo-dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// ── Sign a JWT for a user ────────────────────────────────────
function signToken(userId: string, username: string): string {
  return jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });
}

// ── POST /api/auth/register ──────────────────────────────────
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { username, password, country = '🌍' } = req.body;

    if (!username || username.trim().length < 2) {
      res.status(400).json({ success: false, message: 'Username must be at least 2 characters' });
      return;
    }
    if (!password || password.length < 3) {
      res.status(400).json({ success: false, message: 'Password must be at least 3 characters' });
      return;
    }

    const clean = username.trim().replace(/[^a-zA-Z0-9_]/g, '');
    if (findUserByUsername(clean)) {
      res.status(409).json({ success: false, message: 'Username already taken. Please choose another.' });
      return;
    }

    const user = await createUser(clean, password, country);
    const token = signToken(user.id, user.username);

    res.status(201).json({
      success: true,
      message: `Welcome to ChessKhelo, ${user.username}! 🎉`,
      data: { token, user: publicUser(user) },
    });
  } catch (err) { next(err); }
};

// ── POST /api/auth/login ─────────────────────────────────────
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ success: false, message: 'Username and password are required' });
      return;
    }

    const user = findUserByUsername(username.trim());
    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid username or password' });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ success: false, message: 'Invalid username or password' });
      return;
    }

    user.isOnline = true;
    const token = signToken(user.id, user.username);

    res.json({
      success: true,
      message: `Welcome back, ${user.username}! ♟`,
      data: { token, user: publicUser(user) },
    });
  } catch (err) { next(err); }
};

// ── POST /api/auth/guest ─────────────────────────────────────
export const guestLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { username = '', country = '🌍' } = req.body;
    const user = await createGuestUser(username, country);
    user.isOnline = true;
    const token = signToken(user.id, user.username);

    res.status(201).json({
      success: true,
      message: `Welcome, ${user.username}! ♟`,
      data: { token, user: publicUser(user) },
    });
  } catch (err) { next(err); }
};

// ── GET /api/auth/me ─────────────────────────────────────────
export const getMe = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const user = users.get(req.userId!);
    if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }
    res.json({ success: true, data: { user: publicUser(user) } });
  } catch (err) { next(err); }
};

// ── POST /api/auth/logout ────────────────────────────────────
export const logout = (req: AuthRequest, res: Response): void => {
  const user = users.get(req.userId!);
  if (user) user.isOnline = false;
  res.json({ success: true, message: 'Signed out successfully' });
};
