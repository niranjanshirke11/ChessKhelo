// ============================================================================
// ChessKhelo — Frontend API Service
// ============================================================================
// Axios instance that auto-attaches JWT from localStorage.
// No refresh token logic — when token expires, user re-logs in.
// ============================================================================

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 12000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token from Zustand persisted state
api.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem('chesskhelo-auth');
    if (stored) {
      const token = JSON.parse(stored)?.state?.token;
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (_) {}
  return config;
});

export default api;
