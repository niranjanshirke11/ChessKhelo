# ♟ KnightOS — Competitive Chess SaaS Platform

Full-stack chess platform with ranked Elo play, AI training, real-time multiplayer,
leaderboards, player profiles, and a premium monetisation tier.

---

## 🌐 Live Deployment

| Service | URL |
|---|---|
| 🖥 **Frontend** | https://knight-os-frontend.vercel.app |
| 🔧 **Backend API** | https://humorous-ambition-production-e96b.up.railway.app |
| 🗄 **Database** | MongoDB Atlas (cloud) |

---

## 🗂 Project Structure

```
knightos/
├── backend/          Node.js + Express + TypeScript + MongoDB + Socket.io
├── frontend/         React 18 + TypeScript + Vite + Zustand + Framer Motion
├── nginx/            Reverse-proxy config (production)
├── docker-compose.yml
└── README.md         ← you are here
```

---

## 🛠 Tools You Need to Install

| Tool | Version | Download |
|------|---------|----------|
| Node.js | 20 LTS | https://nodejs.org |
| npm | 10+ | (comes with Node) |
| Git | any | https://git-scm.com |
| VS Code | any | https://code.visualstudio.com |
| Docker *(prod only)* | 25+ | https://docker.com |

**MongoDB Atlas (free cloud DB — no local install needed)**
1. Go to https://cloud.mongodb.com
2. Sign up free → Create Organisation → New Project → Create Cluster (M0 Free)
3. Database Access → Add user (username + password)
4. Network Access → Add IP → Allow from Anywhere (0.0.0.0/0) for dev
5. Connect → Drivers → copy the connection string — looks like:
   `mongodb+srv://youruser:yourpass@cluster0.abc123.mongodb.net/?retryWrites=true&w=majority`

---

## ⚡ Quick Start (Development)

### 1 — Clone / extract the project
```bash
# If from zip:
unzip knightos.zip && cd knightos
```

### 2 — Install all dependencies
```bash
npm run install:all
# This installs root + backend + frontend packages
```

### 3 — Configure backend environment
```bash
cd backend
cp .env.example .env
# Open .env and fill in:
#   MONGODB_URI=  ← paste your Atlas connection string
#   JWT_SECRET=   ← any 32+ char random string
#   JWT_REFRESH_SECRET= ← another 32+ char random string
```

### 4 — Configure frontend environment
```bash
cd ../frontend
cp .env.example .env
# Default values work for local dev — no changes needed
```

### 5 — Run both servers
```bash
cd ..             # back to project root
npm run dev       # starts backend :5000 + frontend :5173 simultaneously
```

Open http://localhost:5173 — you're live! 🎉

> **No MongoDB?** Click "Try Demo Account" on the auth page — fully functional offline demo.

---

## 🔑 Environment Variables Reference

### backend/.env
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/knightos
JWT_SECRET=at-least-32-random-characters-here
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=another-32-random-characters-here
JWT_REFRESH_EXPIRES_IN=30d
FRONTEND_URL=http://localhost:5173
```

### frontend/.env
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

---

## 🚀 Production Deployment

### Option A — Vercel (Frontend) + Railway (Backend)

**Backend → Railway**
```bash
# 1. Push to GitHub
# 2. railway.app → New Project → Deploy from GitHub → select backend/
# 3. Add env vars in Railway dashboard
# 4. Railway gives you a URL like: https://knightos-api.up.railway.app
```

**Frontend → Vercel**
```bash
cd frontend
# Set VITE_API_URL=https://knightos-api.up.railway.app/api  in frontend/.env
# Then:
npx vercel --prod
```

### Option B — Docker Compose (Self-hosted VPS)
```bash
# Copy project to your VPS, then:
cp backend/.env.example backend/.env   # fill in vars
docker-compose up -d --build
# Nginx listens on port 80/443
```

---

## 📡 API Endpoints

```
POST   /api/auth/register      Register new user → JWT
POST   /api/auth/login         Login → JWT + refresh token
POST   /api/auth/refresh       Refresh access token
GET    /api/auth/me            Get current user (auth required)
POST   /api/auth/logout        Logout

GET    /api/games/:gameId      Get game by ID
GET    /api/games/user/:userId User's game history
POST   /api/games/ai           Create AI game

GET    /api/users/search       Search users by username
GET    /api/users/:username    Public profile
PATCH  /api/users/me           Update profile (auth required)

GET    /api/leaderboard        Ranked leaderboard (cached 60s)

GET    /health                 Health check
```

## 🔌 Socket.io Events

```
Client → Server:
  matchmaking:join    { timeControl: "600+0" }
  matchmaking:leave
  game:join           { gameId }
  game:move           { gameId, from, to, promotion }
  game:resign         { gameId }
  game:offer_draw     { gameId }
  game:accept_draw    { gameId }
  game:chat           { gameId, message }

Server → Client:
  matchmaking:searching   { queueSize }
  matchmaking:found       { gameId, color, opponent, timeControl }
  game:state              { game }
  game:move               { from, to, promotion, playerId }
  game:end                { result, termination }
  game:offer_draw         { offeredBy, username }
  game:chat               { userId, username, message, timestamp }
```

---

## 🏆 Rank Tiers

| Tier     | Rating     | Color   |
|----------|-----------|---------|
| Bronze   | < 1000    | #CD7F32 |
| Silver   | 1000–1400 | #C0C0C0 |
| Gold     | 1400–1800 | #f5c842 |
| Platinum | 1800–2200 | #a855f7 |
| Diamond  | 2200+     | #00d4ff |

---

## 💡 Tech Stack

**Backend:** Node.js · Express · TypeScript · MongoDB Atlas (Mongoose) · Socket.io · JWT · bcryptjs · Winston logging

**Frontend:** React 18 · TypeScript · Vite · Zustand · Framer Motion · chess.js · Socket.io-client · React Router v6 · React Hot Toast

**DevOps:** Docker · Docker Compose · Nginx · GitHub Actions CI/CD

---

## 👨‍💻 Author

**Chandana B**
- GitHub: [@ChandanaB-Source](https://github.com/ChandanaB-Source)

---

## 📄 License

This project is licensed under the MIT License.

MIT License — free to use, modify and distribute with attribution.
