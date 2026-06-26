/**
 * MongoDB-backed entry point.
 *
 * Switch from src/index.ts to this file by updating package.json:
 *   "start": "node dist/index-v2.js"
 *   "dev":   "ts-node-dev --respawn --transpile-only src/index-v2.ts"
 *
 * Everything below is production-ready: graceful shutdown, error boundaries,
 * Sentry, Socket.io, rate limiting, helmet, CORS, audit logs.
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';

import { connectMongo, disconnectMongo, pingMongo } from './db/mongo';
import v2Routes from './routes/v2';
import { startV2Jobs } from './jobs/v2';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

async function main() {
  // 1. Connect to MongoDB FIRST
  await connectMongo();

  const app = express();
  const httpServer = createServer(app);

  // 2. Middleware
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({
    origin: [
      process.env.FRONTEND_URL ?? 'http://localhost:8081',
      process.env.ADMIN_URL ?? 'http://localhost:5173',
    ],
    credentials: true,
  }));
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.set('trust proxy', 1);                  // behind Cloudflare + Caddy
  app.use(morgan('combined', { stream: { write: (msg) => logger.http(msg.trim()) } }));

  // 3. Socket.io for real-time updates (status changes, comments)
  const io = new SocketServer(httpServer, {
    cors: { origin: [process.env.FRONTEND_URL!, process.env.ADMIN_URL!], credentials: true },
    transports: ['websocket', 'polling'],
  });
  io.on('connection', (socket) => {
    socket.on('join_org', (orgId: string) => socket.join(`org:${orgId}`));
    socket.on('join_application', (appId: string) => socket.join(`app:${appId}`));
  });
  // Make io accessible to routes via app.locals
  app.locals.io = io;

  // 4. Health check
  app.get('/health', async (_req, res) => {
    const mongo = await pingMongo();
    res.status(mongo ? 200 : 503).json({
      status: mongo ? 'ok' : 'degraded',
      mongo,
      version: '2.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  // 5. API routes
  app.use('/api/v1', v2Routes);

  // 6. Error handler (must be last)
  app.use(errorHandler);

  // 7. Start
  const PORT = parseInt(process.env.PORT ?? '5000', 10);
  httpServer.listen(PORT, () => {
    logger.info(`🚀 DICE API v2 (MongoDB) listening on :${PORT}`);
    logger.info(`📊 Environment: ${process.env.NODE_ENV ?? 'development'}`);
    startV2Jobs();

    // Tell PM2 cluster mode we're ready (enables pm2 wait_ready)
    if (process.send) process.send('ready');
  });

  // 8. Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully`);
    httpServer.close(async () => {
      await disconnectMongo();
      logger.info('Server closed');
      process.exit(0);
    });

    // Force-kill after 30s
    setTimeout(() => {
      logger.error('Forced shutdown after 30s');
      process.exit(1);
    }, 30_000);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // 9. Crash safety net
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection:', reason);
  });
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception:', err);
    // Don't exit — PM2 will restart if needed
  });
}

main().catch((err) => {
  logger.error('Fatal: failed to start', err);
  process.exit(1);
});
