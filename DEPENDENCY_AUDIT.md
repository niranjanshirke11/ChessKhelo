# 📦 DEPENDENCY AUDIT: ChessKhelo

**Date:** October 2026  
**Scope:** Complete inspection of all dependencies in `backend/package.json` and `frontend/package.json`.

---

## 1. Backend Dependencies (`backend/package.json`)

| Dependency | Category | Status | Explanation / Justification |
|---|---|:---:|---|
| `express` (`^4.18.3`) | HTTP Server | **KEEP** | Core REST API framework routing HTTP requests |
| `socket.io` (`^4.7.5`) | WebSockets | **KEEP** | Essential for real-time multiplayer matchmaking & move broadcast |
| `mongoose` (`^8.2.2`) | Database ODM | **KEEP** | MongoDB object modeling for User, Game, and Friend schemas |
| `chess.js` (`^1.0.0`) | Chess Logic | **KEEP** | Validates moves and computes FEN on the server during spectator replay |
| `bcryptjs` (`^2.4.3`) | Cryptography | **KEEP** | Securely hashes passwords with 12 salt rounds before storing in DB |
| `jsonwebtoken` (`^9.0.2`) | Authentication | **KEEP** | Issues and verifies signed JWT access and refresh tokens |
| `cors` (`^2.8.5`) | Security | **KEEP** | Enables Cross-Origin Resource Sharing for the React frontend |
| `helmet` (`^7.1.0`) | Security | **KEEP** | Sets critical HTTP security headers against common web exploits |
| `express-rate-limit` (`^7.2.0`) | Security | **KEEP** | Prevents brute force password guessing and API spam |
| `express-validator` (`^7.0.1`) | Validation | **KEEP** | Validates email format, password complexity, and username strings |
| `dotenv` (`^16.4.5`) | Configuration | **KEEP** | Loads environment variables from `.env` file into `process.env` |
| `uuid` (`^9.0.1`) | Utility | **KEEP** | Generates 8-character unique game room identifiers |
| `winston` (`^3.13.0`) | Logging | **KEEP** | Writes structured application and error logs to file/console |
| `morgan` (`^1.10.0`) | Logging | **KEEP** | Logs incoming HTTP requests and response status codes |
| `google-auth-library` (`^10.6.1`) | OAuth | **OPTIONAL** | Verifies Google ID tokens if Google login is enabled |
| `typescript` (`^5.4.4`) | Dev Tool | **KEEP** | Provides type safety during development |
| `ts-node-dev` (`^2.0.0`) | Dev Server | **KEEP** | Hot-reloading TypeScript execution server for local development |
| `@types/*` | Type Definitions | **KEEP** | Required for TypeScript compilation of Node, Express, JWT, etc. |

---

## 2. Frontend Dependencies (`frontend/package.json`)

| Dependency | Category | Status | Explanation / Justification |
|---|---|:---:|---|
| `react` & `react-dom` (`^18.2.0`) | Core UI | **KEEP** | Core UI library for component-based interface |
| `react-router-dom` (`^6.22.3`) | Navigation | **KEEP** | Client-side SPA routing (`/app/play`, `/app/leaderboard`, etc.) |
| `zustand` (`^4.5.2`) | State Store | **KEEP** | Lightweight, high-performance global store for auth and game state |
| `chess.js` (`^1.0.0`) | Chess Logic | **KEEP** | Core chess rule engine: legal move generator, check/checkmate detector |
| `socket.io-client` (`^4.7.5`) | WebSockets | **KEEP** | Client library connecting to backend WebSocket server |
| `axios` (`^1.6.8`) | HTTP Client | **KEEP** | REST API calls with automated JWT auth header injection & token refresh |
| `framer-motion` (`^11.1.1`) | Animations | **KEEP** | Smooth micro-animations for cards, boards, modals, and route transitions |
| `react-hot-toast` (`^2.4.1`) | UI Alerts | **KEEP** | Clean notifications for login, game events, errors, and friend requests |
| `lucide-react` (`^0.368.0`) | Icons | **KEEP** | Lightweight modern icon set |
| `@react-oauth/google` (`^0.13.4`) | OAuth | **OPTIONAL** | Google sign-in button provider |
| `vite` (`^5.2.7`) | Build Tool | **KEEP** | Fast bundler and dev server |
| `@vitejs/plugin-react` (`^4.2.1`) | Vite Plugin | **KEEP** | React JSX/TSX support and Fast Refresh |
| `typescript` (`^5.4.4`) | Dev Tool | **KEEP** | Type checker for frontend components |
| `@types/react` & `@types/react-dom` | Types | **KEEP** | Type definitions for React 18 |

---

## 3. Dependency Cleanup Recommendation

1. **No bloat packages found:** The project does not have unnecessary heavy dependencies (e.g. Redux, Lodash, Moment.js, Webpack, Babel).
2. **Audio is 0-dependency:** Audio effects use browser Web Audio API synthesis instead of third-party sound libraries or heavy MP3 files.
3. **Keep all existing dependencies intact:** Every dependency is actively imported and serves a distinct architectural purpose.
