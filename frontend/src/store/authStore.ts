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
  login(email: string, pwd: string): Promise<void>;
  register(username: string, email: string, pwd: string, country?: string): Promise<void>;
  googleLogin(accessToken: string, userInfo: any): Promise<void>;
  logout(): Promise<void>;
  refreshUser(): Promise<void>;
  updateUser(u: Partial<AppUser>): void;
  clearError(): void;
  loadDemo(): void;
}

const DEMO: AppUser = {
  id: 'demo-001', username: 'GrandMaster_X', email: 'demo@knightos.app',
  rating: 1847, rankTier: 'Gold', plan: 'free', avatar: '♛', country: '🇮🇳',
  stats: { gamesPlayed: 312, wins: 200, losses: 96, draws: 16, winStreak: 5, bestStreak: 12, accuracy: 87 },
  badges: ['Gold League', 'Speed Demon', 'Top 500'],
};

export const useAuth = create<AuthStore>()(
  persist(
    (set) => ({
      user: null, token: null, refreshToken: null,
      isAuthenticated: false, isLoading: false, error: null,

      login: async (email, pwd) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.post('/auth/login', { email, password: pwd });
          const { token, refreshToken, user } = data.data;
          set({ token, refreshToken, user, isAuthenticated: true, isLoading: false });
          toast.success(`Welcome back, ${user.username}! ♟`);
        } catch (e: any) {
          const msg = e.response?.data?.error || 'Login failed';
          set({ error: msg, isLoading: false }); toast.error(msg); throw e;
        }
      },

      register: async (username, email, pwd, country = '🌍') => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.post('/auth/register', { username, email, password: pwd, country });
          const { token, refreshToken, user } = data.data;
          set({ token, refreshToken, user, isAuthenticated: true, isLoading: false });
          toast.success(`Welcome to KnightOS, ${username}! 🎉`);
        } catch (e: any) {
          const msg = e.response?.data?.error || e.response?.data?.errors?.[0]?.msg || 'Registration failed';
          set({ error: msg, isLoading: false }); toast.error(msg); throw e;
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
    { name: 'ko-auth', partialize: s => ({ token: s.token, refreshToken: s.refreshToken, user: s.user, isAuthenticated: s.isAuthenticated }) }
  )
);
