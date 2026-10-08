# ♟ ChessKhelo — Cloud-Based Real-Time Multiplayer Chess Application

**ChessKhelo** is a modern, responsive, and minimalist full-stack web application designed for competitive online chess, AI practice, real-time multiplayer matchmaking, tactical puzzle solving, and post-game move analysis.

Built as a **B.Sc. Computer Science Final-Semester Project**, this application emphasizes clean architecture, low-latency WebSocket communication, robust Elo ranking mathematics, and containerized cloud deployment on **Amazon Web Services (AWS)**.

---

## 🌟 Key Features

- **⚡ Real-Time Multiplayer:** Instant matchmaking by time control (`1 min Bullet`, `3 min Blitz`, `10 min Rapid`, `15 min Classical`) powered by Socket.IO.
- **🤖 Offline & AI Engine:** Play against 8 adjustable difficulty tiers powered by Stockfish WebAssembly with zero server lag.
- **🏆 FIDE Elo Rating System:** Dynamic rating calculations using the standard logistic Elo formula with automated rank tier classification (`Bronze`, `Silver`, `Gold`, `Platinum`, `Diamond`).
- **🛡 Complete Chess Rule Enforcement:** Move validation, castling, en passant, promotion, check, checkmate, stalemate, 50-move rule, and draw agreement handled via `chess.js`.
- **🎵 Procedural Web Audio:** Zero static audio file dependencies; procedural sound synthesis for piece moves, captures, checks, and victories.
- **🧩 Tactical Chess Puzzles:** Daily offline tactical challenges with immediate move validation and streak tracking.
- **📊 Post-Game Analysis:** Move-by-move position evaluator detecting blunders, inaccuracies, and calculating player accuracy percentages.
- **👥 Social & Spectator Mode:** Friend requests, direct match challenges, in-game chat, and live game spectating with viewer counts.
- **🔒 Secure Authentication:** JWT Access & Refresh token rotation, bcrypt salted password hashing (12 rounds), and an instant **"Demo Account"** mode for offline evaluation.

---

## 🛠 Technology Stack

### Frontend
- **Framework:** React 18 (TypeScript)
- **Bundler / Dev Server:** Vite 5
- **State Management:** Zustand 4 with `localStorage` persistence
- **Routing:** React Router v6
- **Animations:** Framer Motion
- **Chess Engine:** `chess.js` & Stockfish (Web Worker)
- **Audio:** Native Browser Web Audio API

### Backend
- **Runtime:** Node.js 20 LTS
- **Server Framework:** Express.js 4 (TypeScript)
- **Real-Time Communication:** Socket.IO 4
- **Database:** MongoDB Atlas (Mongoose ODM 8)
- **Security:** Helmet, CORS, Express-Rate-Limit, bcryptjs, jsonwebtoken
- **Logging:** Winston + Morgan

### DevOps & Cloud
- **Containers:** Docker & Docker Compose
- **Reverse Proxy:** Nginx (Alpine)
- **Cloud Hosting Target:** AWS (EC2, S3/CloudFront, Security Groups, CloudWatch)

---

## 📂 Project Structure

```
ChessKhelo/
├── backend/                   # Node.js + Express + TypeScript Backend
│   ├── src/
│   │   ├── controllers/       # Route logic (auth, games, users, friends)
│   │   ├── middleware/        # JWT auth, error handling, rate limiting
│   │   ├── models/            # Mongoose schemas (User, Game, FriendRequest)
│   │   ├── routes/            # REST API endpoints
│   │   ├── services/          # Socket.IO, database connection, Elo math, logger
│   │   ├── types/             # Shared TypeScript interfaces
│   │   ├── app.ts             # Express app & middleware configuration
│   │   └── index.ts           # Server bootstrap & port listener
│   ├── .env.example           # Backend environment template
│   ├── Dockerfile             # Multi-stage Node production container
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                  # React + Vite + TypeScript Frontend
│   ├── src/
│   │   ├── components/        # ChessBoard, Layout shell, Avatar
│   │   ├── data/              # Tactical puzzles & opening book databases
│   │   ├── pages/             # Landing, Play Arena, Leaderboard, Profile, Puzzles
│   │   ├── services/          # Axios API client, Socket.IO client, Audio synthesis
│   │   ├── store/             # Zustand global stores (authStore, gameStore)
│   │   ├── styles/            # CSS Design System & typography tokens
│   │   ├── App.tsx            # Protected client routes
│   │   └── main.tsx           # React entry point
│   ├── .env.example           # Frontend environment template
│   ├── Dockerfile             # Multi-stage Nginx static container
│   ├── index.html             # HTML root shell
│   ├── package.json
│   └── vite.config.ts
│
├── nginx/
│   └── nginx.conf             # Reverse proxy routing /api, /socket.io, and /
├── docker-compose.yml         # Multi-container orchestration
├── PROJECT_AUDIT.md           # In-depth architectural audit
├── SIMPLIFICATION_PLAN.md     # Code simplification and refactoring plan
├── DEPENDENCY_AUDIT.md        # Package-by-package justification
├── DATABASE.md                # Comprehensive MongoDB schema documentation
├── AWS_DEPLOYMENT.md          # Step-by-step beginner guide to AWS deployment
├── VIVA_PREPARATION.md        # Q&A guide for final semester viva exam
├── PROJECT_REPORT_NOTES.md    # Documentation for university project report
└── package.json               # Root monorepo workspace scripts
```

---

## ⚡ Quick Start (Local Development)

### 1. Prerequisites
Ensure you have installed:
- [Node.js](https://nodejs.org) (v18 or v20 LTS)
- [npm](https://npmjs.com) (comes with Node.js)
- [Git](https://git-scm.com)

---

### 2. Clone and Install Dependencies

```bash
# Navigate to project root
cd ChessKhelo

# Install dependencies across root, backend, and frontend
npm run install:all
```

---

### 3. Configure Environment Variables

#### A. Backend Environment
```bash
cd backend
cp .env.example .env
```
Open `backend/.env` in your editor and configure:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/chesskhelo?retryWrites=true&w=majority
JWT_SECRET=any_long_random_string_with_32_or_more_characters_here
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=another_long_random_string_for_refresh_tokens_here
JWT_REFRESH_EXPIRES_IN=30d
FRONTEND_URL=http://localhost:5173
```

> **Note:** If you do not have a MongoDB Atlas account yet, sign up for free at [MongoDB Cloud](https://cloud.mongodb.com) and create an M0 Free cluster in 2 minutes.

#### B. Frontend Environment
```bash
cd ../frontend
cp .env.example .env
```
Default values work out of the box for local development:
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

---

### 4. Run the Application

Return to the project root directory and start both servers simultaneously:
```bash
cd ..
npm run dev
```

- **Frontend Application:** Open [http://localhost:5173](http://localhost:5173) in your browser.
- **Backend API:** [http://localhost:5000/api](http://localhost:5000/api)
- **API Health Check:** [http://localhost:5000/health](http://localhost:5000/health)

> **Quick Testing Tip:** On the authentication page, click **"♟ Try Demo Account"** to immediately explore the full application without setting up a database!

---

## 📡 API Endpoints Reference

### Authentication
- `POST /api/auth/register` — Register a new account
- `POST /api/auth/login` — Sign in and receive JWT tokens
- `POST /api/auth/refresh` — Refresh expired access token
- `GET /api/auth/me` — Fetch currently authenticated user profile
- `POST /api/auth/logout` — Set user online status to false

### Games & Matches
- `GET /api/games/:gameId` — Retrieve game details and player info
- `GET /api/games/user/:userId` — Retrieve past game history for a player
- `POST /api/games/ai` — Create an unranked practice match vs AI

### Users & Leaderboard
- `GET /api/users/online` — Count active online players
- `GET /api/users/search?q=name` — Search players by partial handle
- `GET /api/users/:username` — View public player profile and recent matches
- `PATCH /api/users/me` — Update avatar icon and country flag
- `GET /api/leaderboard?tier=Gold` — Get ranked player leaderboard (cached 60s)

### Social & Friends
- `POST /api/friends/request` — Send friend request
- `POST /api/friends/respond` — Accept or decline friend request
- `GET /api/friends` — List accepted friends
- `GET /api/friends/incoming` — List incoming pending requests
- `DELETE /api/friends/:friendId` — Remove friend

---

## 🔌 WebSocket Events Reference

| Event Name | Direction | Payload | Description |
|---|---|---|---|
| `matchmaking:join` | Client → Server | `{ timeControl: "600+0" }` | Enters player into matchmaking queue |
| `matchmaking:leave` | Client → Server | `{}` | Removes player from queue |
| `matchmaking:searching` | Server → Client | `{ queueSize: 2 }` | Queue status notification |
| `matchmaking:found` | Server → Client | `{ gameId, color, opponent, timeControl }` | Triggers match start for both players |
| `game:join` | Client → Server | `{ gameId, spectate?: boolean }` | Connects socket to room `game:<gameId>` |
| `game:move` | Client ⇄ Server | `{ gameId, from, to, promotion }` | Broadcasts validated chess move |
| `game:resign` | Client → Server | `{ gameId }` | Forfeits game and assigns victory to opponent |
| `game:offer_draw` | Client ⇄ Server | `{ gameId }` | Sends draw proposal to opponent |
| `game:accept_draw` | Client → Server | `{ gameId }` | Finalizes match as a draw (`1/2-1/2`) |
| `game:chat` | Client ⇄ Server | `{ gameId, message }` | In-game text messaging |
| `game:end` | Server → Client | `{ result, termination }` | Concludes game and updates Elo in database |

---

## ☁️ Deployment on AWS

ChessKhelo is designed for straightforward deployment on **Amazon Web Services (AWS)** using standard, cost-effective services:
- **Frontend:** AWS S3 static website hosting with CloudFront CDN distribution.
- **Backend:** AWS EC2 (Ubuntu 22.04 LTS / Amazon Linux 2023) running Node.js with PM2 and Nginx.
- **Database:** MongoDB Atlas M0 Cloud Cluster.
- **Monitoring:** AWS CloudWatch for server CPU, memory, and application log monitoring.

For complete, step-by-step instructions with exact AWS Console click-by-click screenshots and CLI commands, refer to:  
👉 **[AWS_DEPLOYMENT.md](file:///d:/KnightOS-main/AWS_DEPLOYMENT.md)**

---

## 🎓 Viva & Academic Report Resources

For university viva presentations and project report preparation:
- 📖 **[DATABASE.md](file:///d:/KnightOS-main/DATABASE.md):** Complete database schema and relationships.
- 🎓 **[VIVA_PREPARATION.md](file:///d:/KnightOS-main/VIVA_PREPARATION.md):** 30+ viva examination questions with concise, technically sound answers.
- 📝 **[PROJECT_REPORT_NOTES.md](file:///d:/KnightOS-main/PROJECT_REPORT_NOTES.md):** Pre-written academic report content (Abstract, Problem Statement, System Architecture, Testing, and Future Scope).

---

## 📄 License & Attribution

This project is licensed under the **MIT License**.

- **Project Name:** ChessKhelo
- **Derived / Adapted From:** KnightOS (Original Author: Chandana B — `@ChandanaB-Source`)
- **License Terms:** Free for educational, commercial, and personal use with attribution.
