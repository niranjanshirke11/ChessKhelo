# 📝 ChessKhelo — Final Year Project Report Material

**Project Title:** ChessKhelo — A Cloud-Based Real-Time Multiplayer Chess Application  
**Degree / Course:** Bachelor of Science in Computer Science (B.Sc. CS)  
**Academic Year:** 2025–2026  

---

## 1. Abstract

Online multiplayer gaming requires highly responsive, bidirectional communication channels and fault-tolerant cloud architecture to support simultaneous user interactions with minimal latency. **ChessKhelo** is a cloud-based web application that implements real-time online chess matches, automated matchmaking, interactive offline AI practice, tactical puzzle solving, and post-game move accuracy analysis. 

The system is developed using React 18, TypeScript, and Zustand on the frontend, alongside Node.js, Express, and Socket.IO on the backend, with MongoDB Atlas providing persistent data storage. The application is containerized with Docker and deployed on Amazon Web Services (AWS) using an optimized decoupled architecture comprising Amazon EC2 for the real-time server, Amazon S3 and CloudFront for global static content delivery, and Amazon CloudWatch for health monitoring. The implementation strictly adheres to FIDE chess regulations and standard Elo rating mathematics, demonstrating a reliable, scalable, and modern cloud application architecture.

---

## 2. Introduction & Problem Statement

### 2.1 Introduction
Chess is a strategic board game played by millions worldwide. In modern web environments, players expect real-time multiplayer matchmaking, instant move synchronization, accurate rating tracking, and tactical analysis accessible from any modern web browser without third-party plugins.

### 2.2 Problem Statement
Traditional web architectures relying on HTTP request-response patterns suffer from latency, excessive header overhead, and server load when applied to multiplayer board games. Furthermore, many existing open-source chess applications are either overly complex with bloated dependencies or lack production-grade cloud deployment documentation. 

ChessKhelo addresses this by delivering a lightweight, clean, and reliable web application utilizing WebSockets for sub-50ms latency, synthesized Web Audio for zero asset overhead, and a production deployment guide tailored for AWS.

---

## 3. Objectives of the Project

1. **Real-Time Multiplayer:** Implement low-latency, bidirectional communication using Socket.IO for matchmaking and move relaying.
2. **Standard Chess Engine Integration:** Accurately enforce all official rules of chess (castling, en passant, promotion, check, checkmate, stalemate, draws).
3. **Competitive Rating System:** Implement the FIDE Elo rating algorithm with dynamic K-factors and automated rank tier categorization.
4. **Offline Capability & AI:** Integrate an in-browser Stockfish engine running inside a Web Worker to allow offline play against 8 difficulty levels.
5. **Secure Authentication:** Implement JWT-based access and refresh token management with bcrypt password encryption.
6. **Cloud Deployment on AWS:** Deploy the frontend on AWS S3/CloudFront and the backend on an AWS EC2 instance configured with Nginx and PM2.

---

## 4. System Architecture & Modules

### 4.1 System Modules

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ChessKhelo Architecture                         │
├───────────────────┬───────────────────┬────────────────────────────────┤
│  Frontend Modules │  Backend Modules  │       Database Modules         │
├───────────────────┼───────────────────┼────────────────────────────────┤
│ 1. Board & Clocks │ 1. Auth & JWT API │ 1. User Collection (Profiles)  │
│ 2. Game Store     │ 2. Matchmaker     │ 2. Game Collection (PGN, moves)│
│ 3. Audio Engine   │ 3. Socket Manager │ 3. FriendRequest Collection    │
│ 4. AI Worker (SF) │ 4. Elo Calculator │                                │
│ 5. Puzzle Engine  │ 5. Logger Service │                                │
└───────────────────┴───────────────────┴────────────────────────────────┘
```

1. **Authentication Module:** Handles account registration, login, JWT validation, token refresh, and session management.
2. **Matchmaking Module:** Groups queued players according to time control and initiates multiplayer game rooms.
3. **Game State & Movement Module:** Validates moves locally using `chess.js`, synchronizes FEN notation, and broadcasts moves across WebSocket channels.
4. **Elo & Ranking Module:** Evaluates match outcomes and updates player skill ratings based on historical performance.
5. **Tactics & Puzzle Module:** Presents curated tactical chess puzzles with interactive solution validation.
6. **Cloud Deployment Module:** Serves static frontend assets via CDN and manages persistent WebSocket server processes on EC2.

---

## 5. Database Design (Schema Definition)

The database consists of three primary MongoDB collections:

1. **`users`:** Stores player identities, salted bcrypt password hashes, Elo ratings, historical rating data points, win-loss statistics, and online status indicators.
2. **`games`:** Stores match records including White and Black player references, initial and increment time controls, full move histories, FEN strings, match outcomes, and rating changes.
3. **`friendrequests`:** Manages social connections, pending friend requests, and direct match invitations between registered users.

---

## 6. Functional & Non-Functional Requirements

### 6.1 Functional Requirements
- Users can register, log in, or use a guest demo account.
- Players can select time controls (`1 min`, `3 min`, `10 min`, `15 min`) and join a live matchmaking queue.
- Legal chess moves can be made by clicking or dragging pieces on an interactive 8×8 board.
- Games conclude automatically upon checkmate, stalemate, resignation, draw agreement, or timeout.
- Players can review historical matches and view their rating progression on a dynamic chart.

### 6.2 Non-Functional Requirements
- **Performance:** Move synchronization across sockets completes in less than 50 milliseconds.
- **Availability:** High availability achieved through AWS S3 static hosting and PM2 process monitoring.
- **Security:** Zero plaintext password storage (12-round bcrypt), CORS origin restrictions, and rate-limited authentication endpoints.
- **Usability:** Fully responsive layout accessible across desktop and mobile viewports.

---

## 7. Testing & Verification

| Test Case | Purpose | Input | Expected Output | Status |
|---|---|---|---|:---:|
| `TC-01` | User Registration | Valid email, username, password | User created, JWT returned, status 201 | **PASSED** |
| `TC-02` | Invalid Login | Incorrect password | Error 401: Invalid credentials | **PASSED** |
| `TC-03` | Move Validation | Attempting illegal move (pawn backwards) | Move rejected, piece reverts to origin | **PASSED** |
| `TC-04` | Checkmate Detection | Scholar's Mate move sequence | Game ends, result `1-0`, Elo updated | **PASSED** |
| `TC-05` | Multiplayer Sync | Move emitted from Browser Tab 1 | Browser Tab 2 renders move in <50ms | **PASSED** |
| `TC-06` | AI Bot Game | Playing vs Level 4 AI | Stockfish calculates legal response within 0.5s | **PASSED** |
| `TC-07` | Health Check | `GET /health` | Status 200 `{"status":"ok"}` | **PASSED** |

---

## 8. Limitations & Future Scope

### 8.1 Limitations
- WebSocket connections are tied to a single EC2 instance unless a Redis Pub/Sub adapter is configured.
- Stockfish AI computation is executed on the client device; very low-end mobile devices may experience slight evaluation delays on high depths.

### 8.2 Future Scope
- **Horizontal Scaling:** Adding AWS Application Load Balancer (ALB) and Redis adapter for multi-instance WebSocket distribution.
- **Tournament Engine:** Swiss and Round-Robin automated tournament brackets.
- **Video & Voice Integration:** WebRTC peer-to-peer audio/video streaming during private friend matches.

---

## 9. Conclusion

ChessKhelo successfully satisfies all requirements for a modern, scalable, and responsive real-time multiplayer chess web application. By integrating React 18, Node.js, Socket.IO, and MongoDB with AWS cloud infrastructure, the project demonstrates how modern web standards and cloud services can be combined to build high-performance distributed web applications.
