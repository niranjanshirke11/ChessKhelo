import mongoose from 'mongoose';
import logger from './logger';

export async function connectDB(): Promise<boolean> {
  const uri = process.env.MONGODB_URI;
  
  if (!uri || uri.includes('<username>') || uri.includes('cluster0.abcde')) {
    logger.warn('⚠  MONGODB_URI contains placeholder credentials or is not configured.');
    logger.warn('ℹ  Server is running in resilient in-memory mode (HTTP & WebSockets active on :5000).');
    return false;
  }

  try {
    await mongoose.connect(uri, { maxPoolSize: 10, serverSelectionTimeoutMS: 5000 });
    logger.info(`✅ MongoDB Atlas connected — db: ${mongoose.connection.name}`);
    mongoose.connection.on('error', e => logger.error('MongoDB error:', e));
    mongoose.connection.on('disconnected', () => logger.warn('⚠  MongoDB disconnected'));
    return true;
  } catch (err: any) {
    logger.warn(`⚠  MongoDB connection failed (${err.message || 'Connection error'}).`);
    logger.warn('ℹ  Server is running in resilient in-memory mode. Set valid MONGODB_URI in backend/.env for cloud DB storage.');
    return false;
  }
}

