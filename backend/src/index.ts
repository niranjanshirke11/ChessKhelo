import 'dotenv/config';
import http from 'http';
import app from './app';
import { connectDB } from './services/database';
import { initSocket } from './services/socket';
import logger from './services/logger';

const PORT = parseInt(process.env.PORT || '5000', 10);

async function main() {
  await connectDB();
  const httpServer = http.createServer(app);
  initSocket(httpServer);
  httpServer.listen(PORT, '0.0.0.0', () => {
    logger.info(`\n♟  KnightOS API running`);
    logger.info(`   → REST:   http://localhost:${PORT}/api`);
    logger.info(`   → Health: http://localhost:${PORT}/health`);
    logger.info(`   → Socket: ws://localhost:${PORT}\n`);
  });
}

main().catch(err => {
  logger.error('Fatal startup error', err);
  process.exit(1);
});
