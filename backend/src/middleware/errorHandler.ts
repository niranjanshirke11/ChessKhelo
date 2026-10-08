import { Request, Response, NextFunction } from 'express';
import logger from '../services/logger';

export class AppError extends Error {
  constructor(public message: string, public statusCode = 500) {
    super(message); Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (err: any, req: Request, res: Response, _n: NextFunction): void => {
  const status = err.statusCode || 500;
  logger.error({ message: err.message, url: req.url, status });
  res.status(status).json({ success: false, error: err.message || 'Internal server error' });
};

export const notFound = (req: Request, res: Response): void => {
  res.status(404).json({ success: false, error: `${req.originalUrl} not found` });
};
