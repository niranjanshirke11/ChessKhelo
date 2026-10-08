import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, JwtPayload } from '../types';

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    req.user = payload;
    req.userId = payload.userId;
    req.userEmail = payload.email;
    next();
  }
  catch (e) { res.status(401).json({ success: false, error: e instanceof jwt.TokenExpiredError ? 'Token expired' : 'Invalid token' }); }
};

export const optionalAuth = (req: AuthRequest, _r: Response, next: NextFunction): void => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    req.user = payload;
    req.userId = payload.userId;
    req.userEmail = payload.email;
  } catch(_) {}
  next();
};
