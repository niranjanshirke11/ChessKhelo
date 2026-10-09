import { Request, Response, NextFunction } from 'express';

// Simple custom error class with an HTTP status code
export class AppError extends Error {
  constructor(public message: string, public statusCode = 500) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// Global error handler — converts errors to clean JSON responses
export const errorHandler = (err: any, req: Request, res: Response, _n: NextFunction): void => {
  const status = err.statusCode || 500;
  console.error(`[Error] ${req.method} ${req.url} → ${status}: ${err.message}`);
  res.status(status).json({ success: false, error: err.message || 'Internal server error' });
};

// 404 handler for unknown routes
export const notFound = (req: Request, res: Response): void => {
  res.status(404).json({ success: false, error: `Route ${req.originalUrl} not found` });
};
