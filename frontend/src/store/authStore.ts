import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';
import toast from 'react-hot-toast';

export interface AppUser {
  id: string; username: string; email: string; rating: number; rankTier: string;
  plan: 'free' | 'premium' | 'elite'; avatar: string; country: string;
  stats: { gamesPlayed: number; wins: number; losses: number; draws: number; winStreak: number; bestStreak: number; accuracy: number; };
  badges: string[];
}

interface AuthStore {
  user: AppUser | null; token: string | null; refreshToken: string | null;
  isAuthenticated: boolean; isLoading: boolean; error: string | null;
  login(loginId: string, pwd: string): Promise<void>;
  register(username: string, email: string, pwd: string, country?: string): Promise<void>;
  guestLogin(username?: string, country?: string): Promise<void>;
  googleLogin(accessToken: string, userInfo: any): Promise<void>;
  logout(): Promise<void>;
  refreshUser(): Promise<void>;
  updateUser(u: Partial<AppUser>): void;
  clearError(): void;
  loadDemo(): void;
}

const DEMO: AppUser = {
  id: 'demo-001', username: 'GrandMaster_X', email: 'demo@chesskhelo.app',
  rating: 1847, rankTier: 'Gold', plan: 'free', avatar: '♛', country: '🇮🇳',
  stats: { gamesPlayed: 312, wins: 200, losses: 96, draws: 16, winStreak: 5, bestStreak: 12, accuracy: 87 },
  badges: ['Gold League', 'Speed Demon', 'Top 500'],
};

export const useAuth = create<AuthStore>()(
  persist(
    (set) => ({
      user: null, token: null, refreshToken: null,
      isAuthenticated: false, isLoading: false, error: null,

      login: async (loginId, pwd) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.post('/auth/login', { loginId, password: pwd });
          const { token, refreshToken, user } = data.data;
          set({ token, refreshToken, user, isAuthenticated: true, isLoading: false });
          toast.success(`Welcome back, ${user.username}! ♟`);
        } catch (e: any) {
          const msg = e.response?.data?.message || e.response?.data?.error || 'Login failed';
          set({ error: msg, isLoading: false }); 
          toast.error(msg); 
          throw e;
        }
      },

      register: async (username, email, pwd, country = '🌍') => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.post('/auth/register', { username, email, password: pwd, country });
          const { token, refreshToken, user } = data.data;
          set({ token, refreshToken, user, isAuthenticated: true, isLoading: false });
          toast.success(`Welcome to ChessKhelo, ${username}! 🎉`);
        } catch (e: any) {
          // If server fails or is offline, provide graceful local fallback
          if (!e.response) {
            const fallbackUser: AppUser = {
              id: `local-${Date.now()}`,
              username: username.trim() || 'Player_1',
              email: email || `${username}@chesskhelo.local`,
              rating: 1200,
              rankTier: 'Bronze',
              plan: 'free',
              avatar: '♟',
              country,
              stats: { gamesPlayed: 0, wins: 0, losses: 0, draws: 0, winStreak: 0, bestStreak: 0, accuracy: 0 },
              badges: ['Newcomer'],
            };
            set({ token: 'offline-token', refreshToken: 'offline-refresh', user: fallbackUser, isAuthenticated: true, isLoading: false });
            toast.success(`Registered as ${fallbackUser.username} (Offline Mode)! ♟`);
            return;
          }
          const msg = e.response?.data?.message || e.response?.data?.error || e.response?.data?.errors?.[0]?.msg || 'Registration failed';
          set({ error: msg, isLoading: false }); 
          toast.error(msg); 
          throw e;
        }
      },

      guestLogin: async (username = '', country = '🌍') => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.post('/auth/guest', { username, country });
          const { token, refreshToken, user } = data.data;
          set({ token, refreshToken, user, isAuthenticated: true, isLoading: false });
          toast.success(`Welcome, ${user.username}! ♟`);
        } catch (e: any) {
          // Fallback to local guest profile if backend is unreachable
          const cleanName = username.trim() || `Player_${Math.floor(1000 + Math.random() * 9000)}`;
          const guestUser: AppUser = {
            id: `guest-${Date.now()}`,
            username: cleanName,
            email: `${cleanName.toLowerCase()}@guest.chesskhelo.local`,
            rating: 1200,
            rankTier: 'Bronze',
            plan: 'free',
            avatar: '♟',
            country,
            stats: { gamesPlayed: 0, wins: 0, losses: 0, draws: 0, winStreak: 0, bestStreak: 0, accuracy: 0 },
            badges: ['Guest Player'],
          };
          set({ token: 'guest-token', refreshToken: 'guest-refresh', user: guestUser, isAuthenticated: true, isLoading: false });
          toast.success(`Playing as ${guestUser.username}! ♟`);
        }
      },

      googleLogin: async (accessToken: string, userInfo: any) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.post('/auth/google', { credential: accessToken, userInfo });
          const { token, refreshToken, user } = data.data;
          set({ token, refreshToken, user, isAuthenticated: true, isLoading: false });
          toast.success(`Welcome, ${user.username}! ♟`);
        } catch (e: any) {
          const msg = e.response?.data?.error || 'Google login failed';
          set({ error: msg, isLoading: false }); toast.error(msg); throw e;
        }
      },

      logout: async () => {
        try { await api.post('/auth/logout'); } catch(_) {}
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
        toast.success('Signed out');
      },

      refreshUser: async () => {
        try { const { data } = await api.get('/auth/me'); set({ user: data.data.user }); } catch(_) {}
      },

      updateUser: (u) => set(s => ({ user: s.user ? { ...s.user, ...u } : null })),
      clearError: () => set({ error: null }),

      loadDemo: () => {
        set({ isAuthenticated: true, token: 'demo', refreshToken: 'demo-refresh', user: DEMO });
        toast.success('Demo loaded — explore freely! ♟');
      },
    }),
    { name: 'chesskhelo-auth', partialize: s => ({ token: s.token, refreshToken: s.refreshToken, user: s.user, isAuthenticated: s.isAuthenticated }) }
  )
);
