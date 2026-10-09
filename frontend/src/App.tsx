// ============================================================================
// ChessKhelo — App Router
// ============================================================================
// Pages:
//  /           → Landing page
//  /auth       → Login / Register / Guest
//  /app/play   → Chess game (vs AI or vs Human)
//  /app/play/:gameId  → Rejoin specific multiplayer game
//  /app/leaderboard   → Top players (in-memory)
//  /app/puzzles       → Chess puzzles (offline, no DB needed)
//  /app/analysis      → Board analysis (offline)
// ============================================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './store/authStore';
import Layout from './components/Layout/Layout';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import GamePage from './pages/GamePage';
import LeaderboardPage from './pages/LeaderboardPage';
import PuzzlePage from './pages/PuzzlePage';
import AnalysisPage from './pages/AnalysisPage';

// Guard: redirects to /auth if not logged in
function Guard({ children }: { children: React.ReactNode }) {
  return useAuth(s => s.isAuthenticated) ? <>{children}</> : <Navigate to="/auth" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"     element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/app"  element={<Guard><Layout /></Guard>}>
          <Route index                   element={<Navigate to="/app/play" replace />} />
          <Route path="play"             element={<GamePage />} />
          <Route path="leaderboard"      element={<LeaderboardPage />} />
          <Route path="puzzles"          element={<PuzzlePage />} />
          <Route path="analysis"         element={<AnalysisPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
