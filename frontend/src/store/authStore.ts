// ============================================================================
// ChessKhelo — Auth Store (Zustand)
// ============================================================================
// Manages client-side authentication state.
// Supports: register, login, guest login, demo mode, logout.
// No Google OAuth, no refresh tokens — keeps it simple.
// ============================================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';
import toast from 'react-hot-toast';

export interface AppUser {
  id: string;
  username: string;
  rating: number;
  rankTier: string;
  country: string;
  avatar: string;
  stats: {
    gamesPlayed: number; wins: number; losses: number;
    draws: number; winStreak: number; bestStreak: number;
  };
  badges: string[];
  isOnline: boolean;
}

interface AuthStore {
  user: AppUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login(username: string, password: string): Promise<void>;
  register(username: string, password: string, country?: string): Promise<void>;
  guestLogin(username?: string, country?: string): Promise<void>;
  logout(): Promise<void>;
  refreshUser(): Promise<void>;
  updateUser(u: Partial<AppUser>): void;
  clearError(): void;
  loadDemo(): void;
}

// ── Demo account (works without backend) ──────────────────────
const DEMO: AppUser = {
  id: 'demo-001',
  username: 'GrandMaster_X',
  rating: 1847,
  rankTier: 'Gold',
  country: '🇮🇳',
  avatar: '♛',
  stats: { gamesPlayed: 312, wins: 200, losses: 96, draws: 16, winStreak: 5, bestStreak: 12 },
  badges: ['Gold League', 'Speed Demon', 'Top 500'],
  isOnline: true,
};

export const useAuth = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // ── Login ─────────────────────────────────────────────
      login: async (username, password) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.post('/auth/login', { username, password });
          const { token, user } = data.data;
          set({ token, user, isAuthenticated: true, isLoading: false });
          toast.success(`Welcome back, ${user.username}! ♟`);
        } catch (e: any) {
          const msg = e.response?.data?.message || 'Login failed';
          set({ error: msg, isLoading: false });
          toast.error(msg);
          throw e;
        }
      },

      // ── Register ──────────────────────────────────────────
      register: async (username, password, country = '🌍') => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.post('/auth/register', { username, password, country });
          const { token, user } = data.data;
          set({ token, user, isAuthenticated: true, isLoading: false });
          toast.success(`Welcome to ChessKhelo, ${user.username}! 🎉`);
        } catch (e: any) {
          // Graceful offline fallback
          if (!e.response) {
            const fallback: AppUser = {
              id: `local-${Date.now()}`,
              username: username.trim() || 'Player_1',
              rating: 1200, rankTier: 'Bronze', country,
              avatar: '♟',
              stats: { gamesPlayed: 0, wins: 0, losses: 0, draws: 0, winStreak: 0, bestStreak: 0 },
              badges: ['Newcomer'],
              isOnline: true,
            };
            set({ token: 'offline-token', user: fallback, isAuthenticated: true, isLoading: false });
            toast.success(`Playing as ${fallback.username} (Offline Mode) ♟`);
            return;
          }
          const msg = e.response?.data?.message || 'Registration failed';
          set({ error: msg, isLoading: false });
          toast.error(msg);
          throw e;
        }
      },

      // ── Guest Login ───────────────────────────────────────
      guestLogin: async (username = '', country = '🌍') => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.post('/auth/guest', { username, country });
          const { token, user } = data.data;
          set({ token, user, isAuthenticated: true, isLoading: false });
          toast.success(`Welcome, ${user.username}! ♟`);
        } catch (_) {
          // Fallback to local guest if backend is unreachable
          const name = username.trim() || `Player_${Math.floor(1000 + Math.random() * 9000)}`;
          const guest: AppUser = {
            id: `guest-${Date.now()}`,
            username: name, rating: 1200, rankTier: 'Bronze', country,
            avatar: '♟',
            stats: { gamesPlayed: 0, wins: 0, losses: 0, draws: 0, winStreak: 0, bestStreak: 0 },
            badges: ['Guest Player'],
            isOnline: true,
          };
          set({ token: 'guest-token', user: guest, isAuthenticated: true, isLoading: false });
          toast.success(`Playing as ${guest.username}! ♟`);
        }
      },

      // ── Logout ────────────────────────────────────────────
      logout: async () => {
        try { await api.post('/auth/logout'); } catch (_) {}
        set({ user: null, token: null, isAuthenticated: false });
        toast.success('Signed out');
      },

      // ── Refresh user from server ──────────────────────────
      refreshUser: async () => {
        try {
          const { data } = await api.get('/auth/me');
          set({ user: data.data.user });
        } catch (_) {}
      },

      updateUser: (u) => set(s => ({ user: s.user ? { ...s.user, ...u } : null })),
      clearError: () => set({ error: null }),

      // ── Demo Mode (works without any backend) ─────────────
      loadDemo: () => {
        set({ isAuthenticated: true, token: 'demo', user: DEMO });
        toast.success('Demo loaded — explore freely! ♟');
      },
    }),
    {
      name: 'chesskhelo-auth',
      partialize: s => ({ token: s.token, user: s.user, isAuthenticated: s.isAuthenticated }),
    }
  )
);
