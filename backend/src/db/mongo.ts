/**
 * MongoDB connection with production-grade settings.
 *
 * In development without a real MongoDB:
 *   - Automatically starts mongodb-memory-server (in-memory MongoDB)
 *   - Zero config needed — just `npm run dev`
 *
 * In production / staging:
 *   - Uses MONGODB_URI or DATABASE_URL environment variable
 *   - Tuned for Atlas M2+ clusters
 */
import mongoose from 'mongoose';
import { logger } from '../utils/logger';

let isConnected = false;
let memoryServer: any = null;

export async function connectMongo(): Promise<typeof mongoose> {
  if (isConnected) return mongoose;

  let uri = process.env.MONGODB_URI || process.env.DATABASE_URL;

  // If no MongoDB URI or it's a PostgreSQL URL, use in-memory MongoDB
  if (!uri || uri.startsWith('postgresql://') || uri.startsWith('postgres://')) {
    logger.info('🧪 No MongoDB URI found — starting in-memory MongoDB for development...');
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      memoryServer = await MongoMemoryServer.create({
        instance: { dbName: 'sanyog_conformity' },
      });
      uri = memoryServer.getUri();
      logger.info(`✅ In-memory MongoDB started at ${uri}`);
    } catch (err) {
      logger.error('Failed to start in-memory MongoDB. Install it: npm i -D mongodb-memory-server', err);
      throw err;
    }
  }

  // Connection event listeners
  mongoose.connection.on('connected', () => {
    isConnected = true;
    logger.info(`✅ MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
  });
  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    logger.warn('⚠️  MongoDB disconnected');
  });
  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB error:', err);
  });
  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected');
  });

  await mongoose.connect(uri as string, {
    maxPoolSize: 50,
    minPoolSize: 5,
    serverSelectionTimeoutMS: 10_000,
    heartbeatFrequencyMS: 10_000,
    retryWrites: true,
    w: 'majority',
    autoIndex: process.env.NODE_ENV !== 'production',
  });

  return mongoose;
}

export async function disconnectMongo(): Promise<void> {
  if (!isConnected) return;
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
  isConnected = false;
}

export async function pingMongo(): Promise<boolean> {
  try {
    if (!isConnected) return false;
    await mongoose.connection.db?.admin().ping();
    return true;
  } catch {
    return false;
  }
}
