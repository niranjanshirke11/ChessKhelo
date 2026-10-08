import mongoose from 'mongoose';
import logger from './logger';

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not defined — check backend/.env');
  try {
    await mongoose.connect(uri, { maxPoolSize: 10, serverSelectionTimeoutMS: 8000 });
    logger.info(`✅ MongoDB Atlas connected — db: ${mongoose.connection.name}`);
    mongoose.connection.on('error', e => logger.error('MongoDB error:', e));
    mongoose.connection.on('disconnected', () => logger.warn('⚠  MongoDB disconnected'));
  } catch (err) {
    logger.error('❌ MongoDB connection failed. Check MONGODB_URI in .env', err);
    throw err;
  }
}
