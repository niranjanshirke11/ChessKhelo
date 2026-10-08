import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';
import { authRouter, gameRouter, userRouter, leaderboardRouter, friendRouter } from './routes/index';
import { googleAuth } from './controllers/googleAuthController';
import { errorHandler, notFound } from './middleware/errorHandler';

const app = express();
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      process.env.FRONTEND_URL,
      'http://localhost:5173',
      'http://localhost:4173',
    ].filter(Boolean);
    // Allow requests with no origin (mobile apps, curl, etc)
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
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Too many attempts' } }));
app.get('/health', (_, res) => res.json({ status: 'ok', time: new Date().toISOString(), env: process.env.NODE_ENV }));
app.post('/api/auth/google', googleAuth);
app.use('/api/auth', authRouter);
app.use('/api/games', gameRouter);
app.use('/api/users', userRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/friends', friendRouter);
app.use(notFound);
app.use(errorHandler);
export default app;
