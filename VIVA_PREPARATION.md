# 🎓 ChessKhelo — Final Semester Project Viva Examination Guide

This document contains curated questions and beginner-friendly, technically accurate answers to help you confidently explain **ChessKhelo** during your university viva examination.

---

## 📌 Section 1: Project Overview & Objectives

### Q1: What is ChessKhelo?
**Answer:**  
ChessKhelo is a full-stack, cloud-deployed real-time multiplayer chess web application. It allows players to compete in ranked matches, play offline against an integrated AI engine, solve tactical puzzles, review match accuracy, and climb a global Elo leaderboard.

### Q2: What real-world problem does this project solve?
**Answer:**  
Traditional web applications rely on standard HTTP request-response cycles, which are unsuitable for fast-paced multiplayer games due to high latency and polling overhead. ChessKhelo solves this by establishing persistent, bidirectional WebSocket channels that achieve sub-50ms move synchronization alongside cloud persistence and FIDE standard ranking mathematics.

### Q3: What is the technology stack used in ChessKhelo?
**Answer:**  
- **Frontend:** React 18, TypeScript, Vite, Zustand (state management), Framer Motion (animations), and `chess.js`.
- **Backend:** Node.js, Express.js, TypeScript, and Socket.IO.
- **Database:** MongoDB Atlas (NoSQL document store via Mongoose ODM).
- **Cloud & DevOps:** AWS (EC2, S3, CloudFront), Nginx reverse proxy, PM2 process manager, and Docker.

---

## ⚛️ Section 2: Frontend & Client Architecture

### Q4: Why did you choose React for the frontend?
**Answer:**  
React's virtual DOM and component-based architecture allow us to isolate the 64 chessboard squares into individual state-aware components. When a piece moves, only the source square, destination square, and clock components re-render, ensuring optimal 60 FPS performance without unnecessary full-page redraws.

### Q5: Why did you choose Zustand over Redux for state management?
**Answer:**  
Zustand is lightweight (less than 3KB), eliminates boilerplate code (actions, reducers, dispatchers), supports asynchronous actions natively, and includes built-in `localStorage` persistence middleware.

### Q6: How are sound effects generated without audio files?
**Answer:**  
ChessKhelo uses the browser's native **Web Audio API** (`sounds.ts`). It synthesizes audio waves (sine, square, sawtooth) with procedural envelopes directly through the sound card. This eliminates MP3 file loading delays and reduces project bandwidth.

### Q7: How does the offline AI bot work in the browser?
**Answer:**  
The AI engine utilizes **Stockfish WebAssembly** running in a background Web Worker. It communicates via the standard UCI (Universal Chess Interface) protocol to evaluate board positions and calculate optimal candidate moves across 8 selectable difficulty levels.

---

## ⚡ Section 3: WebSockets & Real-Time Multiplayer

### Q8: What is a WebSocket and how does it differ from HTTP?
**Answer:**  
- **HTTP (REST):** Unidirectional and stateless. The client sends a request and the server replies. The server cannot push data independently without polling.
- **WebSocket (Socket.IO):** Starts as an HTTP handshake and upgrades to a full-duplex, persistent TCP connection. Both client and server can transmit lightweight binary/JSON frames instantly with minimal header overhead (2 bytes vs ~800 bytes in HTTP).

### Q9: Trace the exact sequence of events when Player A makes a chess move.
**Answer:**  
1. **User Action:** Player A clicks/drags a piece from `e2` to `e4` on the React chessboard.
2. **Local Validation:** `chess.js` checks whether `e2-e4` is a legal move.
3. **Optimistic Update:** The client board updates immediately, and a move sound plays.
4. **Socket Emission:** The frontend emits `game:move` with `{ gameId, from: 'e2', to: 'e4' }`.
5. **Server Processing:** The Node.js server receives the event, verifies player turns, saves the move to MongoDB, and broadcasts the event to the room `game:<gameId>`.
6. **Player B Reception:** Player B's client receives `game:move`, applies it to their local `chess.js` instance, flips the turn, and switches the active clock.

### Q10: How does matchmaking work?
**Answer:**  
The backend maintains in-memory queues keyed by time control (`60+0`, `180+0`, `600+0`, `900+10`). When a user emits `matchmaking:join`, the server checks the queue for a waiting player. If found, both sockets are paired into a newly generated MongoDB match document and notified simultaneously via `matchmaking:found`.

---

## ♟ Section 4: Chess Rules & Ranking Logic

### Q11: How is a chess move validated?
**Answer:**  
Move validation is handled by `chess.js`, which maintains internal bitboards and validates piece move trajectories, pinned pieces, king safety, castling permissions, and en passant availability. Invalid moves are rejected immediately.

### Q12: How does the Elo rating calculation work?
**Answer:**  
ChessKhelo implements the standard **FIDE Elo formula**:
1. Calculate Expected Score: $E_A = \frac{1}{1 + 10^{(R_B - R_A) / 400}}$
2. Update Rating: $\Delta R = K \times (S_A - E_A)$ where $S_A$ is the actual score (1 for win, 0.5 for draw, 0 for loss) and $K$ is the dynamic K-factor (40 for beginners, 12 for high ratings).

---

## 🗄 Section 5: Database & Authentication

### Q13: Why did you choose MongoDB over SQL?
**Answer:**  
Chess games contain hierarchical and variable-length data (such as arrays of moves with timestamps, FEN strings, and rating histories). Storing complete match records as self-contained JSON documents is natural, eliminates multi-table joins, and scales efficiently.

### Q14: How does authentication and password security work?
**Answer:**  
1. **Passwords:** Passwords are never stored in plaintext. They are salted and hashed using **bcrypt** with 12 computational rounds before being persisted.
2. **Tokens:** Authentication uses **JSON Web Tokens (JWT)**. The client receives an Access Token (valid for 7 days) and a Refresh Token (valid for 30 days) stored securely in client state.
3. **Route Protection:** Protected Express endpoints pass through `authenticate` middleware, which decodes and validates the Bearer token signature.

---

## ☁️ Section 6: Cloud Computing & AWS Deployment

### Q15: Why did you deploy ChessKhelo on AWS?
**Answer:**  
AWS provides global scalability, 99.99% infrastructure availability, cost-effective Free Tier resources, and a modular ecosystem where frontend static distribution (S3/CloudFront) is decoupled from the compute server (EC2).

### Q16: What AWS services did you use and why?
- **AWS EC2:** Virtual server hosting the Node.js Express API and managing persistent Socket.IO WebSocket connections.
- **AWS S3:** Simple Storage Service bucket hosting the pre-built static React SPA assets.
- **AWS CloudFront:** Global Content Delivery Network (CDN) providing low-latency edge caching and automatic SSL/HTTPS encryption.
- **AWS Security Groups:** Acts as a virtual firewall controlling inbound/outbound port traffic (SSH Port 22, HTTP Port 80, HTTPS Port 443).
- **AWS CloudWatch:** Collects system metrics (CPU utilization, network traffic) and monitors server health.

### Q17: What is PM2 and why is it needed on EC2?
**Answer:**  
PM2 is a production process manager for Node.js. It runs the backend server in the background, automatically restarts the process if an uncaught exception occurs, and reboots the server automatically if the EC2 instance restarts.

### Q18: What is Nginx and why is it used as a reverse proxy?
**Answer:**  
Nginx sits on Port 80/443 and acts as the public entry point. It forwards REST requests to `http://localhost:5000/api` and upgrades WebSocket connections to `ws://localhost:5000`. This adds security, shields the internal Node.js port, and handles SSL termination efficiently.

### Q19: How would you scale ChessKhelo for 100,000 concurrent players?
**Answer:**  
1. **Horizontal Scaling:** Deploy multiple EC2 backend instances behind an **AWS Application Load Balancer (ALB)**.
2. **WebSocket Adapter:** Implement the **Socket.IO Redis Adapter** so that players connected to different EC2 instances can broadcast moves across servers via Redis Pub/Sub.
3. **Database Caching:** Add **Amazon ElastiCache (Redis)** to cache leaderboard queries and active match states.
