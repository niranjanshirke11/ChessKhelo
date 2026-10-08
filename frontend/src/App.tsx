import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './store/authStore';
import Layout from './components/Layout/Layout';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import GamePage from './pages/GamePage';
import LeaderboardPage from './pages/LeaderboardPage';
import ProfilePage from './pages/ProfilePage';
import PricingPage from './pages/PricingPage';
import PuzzlePage from './pages/PuzzlePage';
import AnalysisPage from './pages/AnalysisPage';
import FriendsPage from './pages/FriendsPage';

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
          <Route index element={<Navigate to="/app/play" replace />} />
          <Route path="play"              element={<GamePage />} />
          <Route path="play/:gameId"      element={<GamePage />} />
          <Route path="leaderboard"       element={<LeaderboardPage />} />
          <Route path="profile"           element={<ProfilePage />} />
          <Route path="profile/:username" element={<ProfilePage />} />
          <Route path="pricing"           element={<PricingPage />} />
          <Route path="puzzles"           element={<PuzzlePage />} />
          <Route path="analysis"          element={<AnalysisPage />} />
          <Route path="friends"           element={<FriendsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
