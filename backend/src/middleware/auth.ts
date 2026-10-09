// ============================================================================
// ChessKhelo — Auth Middleware
// ============================================================================
// Verifies JWT bearer token on protected routes.
// No database lookup — token payload contains userId and username directly.
// ============================================================================

import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, JwtPayload } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'chesskhelo-dev-secret-change-in-production';

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = payload;
    req.userId = payload.userId;
    req.username = payload.username;
    next();
  } catch (e) {
    res.status(401).json({
      success: false,
      error: e instanceof jwt.TokenExpiredError ? 'Token expired — please log in again' : 'Invalid token',
    });
  }
};
