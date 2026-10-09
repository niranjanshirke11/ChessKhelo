// ============================================================================
// ChessKhelo — Express App (No Database)
// ============================================================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';
import { authRouter, userRouter } from './routes/index';
import { errorHandler, notFound } from './middleware/errorHandler';

const app = express();

app.set('trust proxy', 1);

// Security headers
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// CORS — allow frontend dev server and production URL
app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      process.env.FRONTEND_URL,
      'http://localhost:5173',
      'http://localhost:4173',
      'http://10.107.162.69:5173',   // LAN access for testing on other devices
    ].filter(Boolean);
    // Allow requests with no origin (curl, Postman, mobile)
    if (!origin || allowed.some(o => origin.startsWith(o!))) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging (skip in test env)
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// Rate limiting — prevent abuse
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 500, standardHeaders: true, legacyHeaders: false }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: { error: 'Too many attempts, try again later' } }));

// ── Health Check ─────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), env: process.env.NODE_ENV || 'development' });
});

// ── API Routes ───────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);

// ── 404 & Error Handlers ─────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
