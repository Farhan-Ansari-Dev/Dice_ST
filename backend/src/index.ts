/**
 * Sanyog Conformity Solutions — Backend API
 *
 * MongoDB-backed, production-ready entry point.
 * Features: graceful shutdown, error boundaries, Socket.io, rate limiting,
 * helmet, CORS, audit logs, background jobs.
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { cspMiddleware, securityHeaders } from './middleware/security';
import { generalLimiter } from './middleware/rateLimiters';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import path from 'path';

import { connectMongo, disconnectMongo, pingMongo } from './db/mongo';
import routes from './routes/index';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

async function main() {
  // 1. Connect to MongoDB FIRST
  await connectMongo();

  const app = express();
  const httpServer = createServer(app);

  // 2. Middleware
  app.use(cspMiddleware);
  app.use(securityHeaders);

  app.use(cors({
    origin: [
      process.env.FRONTEND_URL ?? 'http://localhost:8081',
      process.env.ADMIN_URL ?? 'http://localhost:5173',
      'https://admin.sanyogconformity.com',
      'http://sanyog-admin-prod-panel-9x2b.s3-website.ap-south-1.amazonaws.com',
      'http://localhost:19006',  // Expo web
      'http://localhost:19000',  // Expo dev
    ],
    credentials: true,
  }));
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.set('trust proxy', 1);
  app.use(morgan('combined', { stream: { write: (msg) => logger.http(msg.trim()) } }));

  // 3. Socket.io for real-time updates
  const io = new SocketServer(httpServer, {
    cors: {
      origin: [
        process.env.FRONTEND_URL ?? 'http://localhost:8081',
        process.env.ADMIN_URL ?? 'http://localhost:5173',
        'https://admin.sanyogconformity.com',
        'http://sanyog-admin-prod-panel-9x2b.s3-website.ap-south-1.amazonaws.com',
      ],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });
  io.on('connection', (socket) => {
    socket.on('join_org', (orgId: string) => socket.join(`org:${orgId}`));
    socket.on('join_application', (appId: string) => socket.join(`app:${appId}`));
  });
  app.locals.io = io;

  // 4. Serve uploaded files in dev
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // 5. Health check
  app.get('/health', async (_req, res) => {
    const mongo = await pingMongo();
    res.status(mongo ? 200 : 503).json({
      status: mongo ? 'ok' : 'degraded',
      mongo,
      version: '2.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  // 6. API routes
  app.use('/api/v1', generalLimiter, routes);
  app.use('/api/v2', generalLimiter, routes);

  // 7. Error handler (must be last)
  app.use(errorHandler);

  // 8. Start
  const PORT = parseInt(process.env.PORT ?? '5000', 10);
  httpServer.listen(PORT, () => {
    logger.info(`🚀 Sanyog Conformity API running on :${PORT}`);
    logger.info(`📊 Environment: ${process.env.NODE_ENV ?? 'development'}`);

    // Tell PM2 cluster mode we're ready
    if (process.send) process.send('ready');
  });

  // 9. Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully`);
    httpServer.close(async () => {
      await disconnectMongo();
      logger.info('Server closed');
      process.exit(0);
    });
    setTimeout(() => {
      logger.error('Forced shutdown after 30s');
      process.exit(1);
    }, 30_000);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // 10. Crash safety net
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection:', reason);
  });
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception:', err);
  });
}

main().catch((err) => {
  logger.error('Fatal: failed to start', err);
  process.exit(1);
});
