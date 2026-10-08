// ============================================================================
// ChessKhelo — Server Entry Point
// ============================================================================
// Architecture Flow:
// 1. Loads environment variables from .env via dotenv
// 2. Connects to MongoDB Atlas database
// 3. Wraps the Express application in an HTTP server
// 4. Initializes Socket.IO for real-time WebSocket communication
// 5. Listens on PORT 5000 (0.0.0.0 for container & cloud compatibility)
// ============================================================================

import 'dotenv/config';
import http from 'http';
import app from './app';
import { connectDB } from './services/database';
import { initSocket } from './services/socket';
import logger from './services/logger';

const PORT = parseInt(process.env.PORT || '5000', 10);

async function main() {
  // Step 1: Connect to database
  await connectDB();

  // Step 2: Create HTTP server wrapping Express
  const httpServer = http.createServer(app);

  // Step 3: Attach Socket.IO for real-time multiplayer chess
  initSocket(httpServer);

  // Step 4: Start listening on all network interfaces
  httpServer.listen(PORT, '0.0.0.0', () => {
    logger.info(`\n♟  ChessKhelo API running`);
    logger.info(`   → REST API:  http://localhost:${PORT}/api`);
    logger.info(`   → Health:    http://localhost:${PORT}/health`);
    logger.info(`   → WebSocket: ws://localhost:${PORT}\n`);
  });
}

main().catch(err => {
  logger.error('Fatal startup error', err);
  process.exit(1);
});

