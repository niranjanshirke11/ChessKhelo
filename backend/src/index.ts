// ============================================================================
// ChessKhelo — Server Entry Point (REST API Only, No WebSockets)
// ============================================================================
// This server provides only:
//  - Auth: /api/auth  (register, login, guest, me, logout)
//  - Users: /api/users  (leaderboard, online count, profile)
//
// No Socket.IO. No database. All data is in-memory.
// ============================================================================

import 'dotenv/config';
import http from 'http';
import app from './app';

const PORT = parseInt(process.env.PORT || '5000', 10);

const server = http.createServer(app);

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n♟  ChessKhelo API running');
  console.log(`   → Health:  http://localhost:${PORT}/health`);
  console.log(`   → Auth:    http://localhost:${PORT}/api/auth`);
  console.log(`   → Users:   http://localhost:${PORT}/api/users\n`);
});
