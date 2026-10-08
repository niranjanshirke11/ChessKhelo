# 📋 SIMPLIFICATION & REFACTORING PLAN: ChessKhelo

**Project:** ChessKhelo (formerly KnightOS)  
**Date:** October 2026  
**Document Purpose:** Plan for streamlining the codebase, renaming project entities safely, removing dead code, and preparing for local testing and AWS deployment.

---

## 1. Code Classification Matrix

### [KEEP] — Essential for ChessKhelo Core Functionality
These files and modules form the core engine and must be preserved:

| File / Component | Functionality | Rationale | Verification Method |
|---|---|---|---|
| `backend/src/index.ts` & `app.ts` | Server bootstrap, Express setup, Socket.IO binding | Core entry point for REST & WebSockets | Start server; test `/health` & `/api` |
| `backend/src/services/socket.ts` | Real-time matchmaking, move broadcasting, game rooms | Powers multiplayer gameplay | Connect 2 browser tabs; verify moves and timers |
| `backend/src/controllers/authController.ts` | User signup, login, JWT issuance, profile retrieval | Core user authentication | Register test user & login |
| `backend/src/controllers/gameController.ts` | Elo updates, game finalization, match history | Manages game outcomes and ratings | Complete a game; check DB rating change |
| `backend/src/controllers/userController.ts` | User profile, leaderboard, online count | Powers player statistics & leaderboards | View leaderboard and profile pages |
| `backend/src/models/User.ts` & `Game.ts` | MongoDB schemas for players and games | Primary data entities | Verify document creation in MongoDB |
| `backend/src/middleware/auth.ts` | JWT bearer token verification | Protects private endpoints | Query protected route without token (expect 401) |
| `backend/src/services/elo.ts` | FIDE-style Elo calculation formula | Accurately computes ranking points | Test win/loss/draw Elo calculations |
| `frontend/src/components/Board/ChessBoard.tsx` | Interactive 8x8 chessboard UI | Main board rendering and piece moves | Test pawn, knight, castle, promotion moves |
| `frontend/src/store/gameStore.ts` | Game state, clocks, moves, eval, audio | Client-side game engine coordinator | Test timers, move history, and sounds |
| `frontend/src/store/authStore.ts` | Client auth state & localStorage persistence | Manages login session & demo mode | Test login, logout, and demo account mode |
| `frontend/src/services/sounds.ts` | Native Web Audio synthesis | Delivers move, capture, check, win sounds | Play moves with sound on |
| `frontend/src/pages/GamePage.tsx` | Main arena (Play vs Human, Play vs AI) | The primary screen of the application | Play full match vs bot and vs player |
| `frontend/src/pages/AuthPage.tsx` | Sign In, Sign Up, and Demo Account access | Gate for player entry | Test account creation & demo login |
| `frontend/src/pages/LeaderboardPage.tsx` | Global Elo rankings with tier filters | Showcases rankings for project viva | Verify leaderboard list and tier filter |
| `frontend/src/pages/ProfilePage.tsx` | Match history, win rate, Elo graph | Visual proof of user progress | Check match history list and rating graph |

---

### [SIMPLIFY] — Useful Features to Refactor for Readability & Viva
Code that is useful but has unnecessary jargon, excessive complexity, or missing comments:

| File / Component | Current Issue | Simplification Action | Risk & Safeguard |
|---|---|---|---|
| `backend/.env.example` | Contains hardcoded MongoDB connection string with real credentials | Replace with clean, standard environment variable placeholders | **Zero risk**; prevents credential leakage |
| `frontend/src/services/api.ts` | Contains old storage key references (`ko-auth`) | Update storage key to `chesskhelo-auth` and add comments explaining Axios interceptor | Verify token refresh works after edit |
| `frontend/src/components/Layout/Layout.tsx` | Header shows `KnightOS` branding; complex tier styling | Rename branding to `ChessKhelo`; simplify styling and navigation labels | Visual check on desktop and mobile viewports |
| `frontend/src/pages/LandingPage.tsx` | Mentions "KnightOS Season 4", SaaS marketing text | Streamline hero text to focus on ChessKhelo as a cloud-based chess web application | Visual check of landing page elements |
| `backend/src/index.ts` | Log output displays "KnightOS API running" | Update console banner to "♟ ChessKhelo API running" with route summaries | Verify server startup log |
| `package.json` files | Workspace names are `knightos-backend` / `knightos-frontend` | Update to `chesskhelo-backend` and `chesskhelo-frontend` | Run `npm run build` to verify workspace linkage |

---

### [REMOVE] — Dead Code, Unused Files, or Leaked Data

| Item | What it does | Why it isn't required | What could break | Verification |
|---|---|---|---|---|
| Leaked MongoDB URI in `backend/.env.example` | Points to an external test cluster with hardcoded credentials | Security hazard; user must provide their own clean Atlas URI or local DB | Nothing; students must configure their own `.env` | Test local `.env` creation |
| Unused redundant configuration / dangling Docker reference | `docker-compose.yml` referenced `./frontend` without a `frontend/Dockerfile` | Create a simple production `frontend/Dockerfile` (multi-stage Nginx build) so Docker Compose works cleanly | Ensures `docker-compose up` builds frontend without failing | Run `docker-compose config` |

---

### [OPTIONAL] — Secondary Features (Keep Functional & Clean)

| Feature | Location | Status | Action |
|---|---|---|---|
| **Chess Puzzles (`/app/puzzles`)** | `PuzzlePage.tsx`, `puzzles.ts` | Retain | Fully functional offline feature; excellent for project viva demonstrations. |
| **Move Analysis (`/app/analysis`)** | `AnalysisPage.tsx` | Retain | Instant 1-ply position analysis; great showcase feature. |
| **Friends & Challenges (`/app/friends`)** | `FriendsPage.tsx`, `friendController.ts` | Retain | Allows direct 1v1 challenges between users. |
| **Pricing Demo (`/app/pricing`)** | `PricingPage.tsx` | Retain/Simplify | Demonstrates SaaS product architecture; clearly label as academic demo. |
| **Google OAuth** | `googleAuthController.ts` | Retain | Works if Google Client ID is supplied; email/password and demo accounts work out-of-the-box. |

---

## 2. Renaming Plan: KnightOS → ChessKhelo

To ensure zero broken dependencies and complete consistency:

1. **Root `package.json`:** `"name": "chesskhelo"`
2. **Backend `package.json`:** `"name": "chesskhelo-backend"`
3. **Frontend `package.json`:** `"name": "chesskhelo-frontend"`
4. **HTML Title & Meta (`frontend/index.html`):** `<title>ChessKhelo — Online Multiplayer Chess</title>`
5. **Storage Key in Zustand:** Update `ko-auth` to `chesskhelo-auth`
6. **UI Headers, Navbars, Footers:** Replace `KnightOS` with `ChessKhelo` in `Layout.tsx`, `LandingPage.tsx`, `AuthPage.tsx`
7. **Backend Startup Banner:** `backend/src/index.ts` → `ChessKhelo API running`
8. **Auth Welcome Messages:** `backend/src/controllers/authController.ts` → `Welcome to ChessKhelo, ${username}!`
9. **Preserve Chess Terminology:** DO NOT change "Knight" when referring to the chess piece (e.g., "Knight Fork", "Four Knights Game", `wN`, `bN`).

---

## 3. Step-by-Step Refactoring Workflow

```
[Phase 1: Project Audit & Plan] (Completed)
           │
           ▼
[Phase 2: Git Initialization & Checkpoint Branch]
           │
           ▼
[Phase 3: Sanitize Secrets & Rename Project to ChessKhelo]
           │
           ▼
[Phase 4: Streamline UI & Add Viva-Friendly Code Comments]
           │
           ▼
[Phase 5: Local Validation & End-to-End Testing]
           │
           ▼
[Phase 6: Beginner-Friendly Documentation (README, DATABASE, VIVA, AWS)]
```
