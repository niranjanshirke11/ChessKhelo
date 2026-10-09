// ============================================================================
// ChessKhelo — API Routes
// ============================================================================

import { Router } from 'express';
import { register, login, guestLogin, getMe, logout } from '../controllers/authController';
import { getLeaderboard, getOnlineCount, getUserProfile } from '../controllers/userController';
import { authenticate } from '../middleware/auth';

// ── Auth Routes ──────────────────────────────────────────────
export const authRouter = Router();
authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/guest', guestLogin);
authRouter.get('/me', authenticate, getMe);
authRouter.post('/logout', authenticate, logout);

// ── User / Leaderboard Routes ────────────────────────────────
export const userRouter = Router();
userRouter.get('/leaderboard', getLeaderboard);
userRouter.get('/online', getOnlineCount);
userRouter.get('/:username', getUserProfile);
