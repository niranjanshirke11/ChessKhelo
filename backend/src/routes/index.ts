import { Router } from 'express';
import { register, login, refreshToken, getMe, logout, registerValidators, loginValidators } from '../controllers/authController';
import { googleAuth } from '../controllers/googleAuthController';
import { getGame, getUserGames, createAiGame } from '../controllers/gameController';
import { getUserProfile, updateProfile, searchUsers, getOnlineCount, getLeaderboard } from '../controllers/userController';
import { sendRequest, respondRequest, getFriends, getIncoming, removeFriend, searchUsers as searchFriendUsers } from '../controllers/friendController';
import { authenticate, optionalAuth } from '../middleware/auth';

export const authRouter = Router();
authRouter.post('/register', registerValidators, register);
authRouter.post('/login', loginValidators, login);
authRouter.post('/refresh', refreshToken);
authRouter.get('/me', authenticate, getMe);
authRouter.post('/logout', authenticate, logout);
authRouter.post('/google', googleAuth);

export const gameRouter = Router();
gameRouter.get('/user/:userId', optionalAuth, getUserGames);
gameRouter.get('/:gameId', optionalAuth, getGame);
gameRouter.post('/ai', authenticate, createAiGame);

export const userRouter = Router();
userRouter.get('/online', getOnlineCount);
userRouter.get('/search', searchUsers);
userRouter.get('/:username', optionalAuth, getUserProfile);
userRouter.patch('/me', authenticate, updateProfile);

export const leaderboardRouter = Router();
leaderboardRouter.get('/', getLeaderboard);

export const friendRouter = Router();
friendRouter.post('/request', authenticate, sendRequest);
friendRouter.post('/respond', authenticate, respondRequest);
friendRouter.get('/', authenticate, getFriends);
friendRouter.get('/incoming', authenticate, getIncoming);
friendRouter.delete('/:friendId', authenticate, removeFriend);
friendRouter.get('/search', authenticate, searchFriendUsers);
