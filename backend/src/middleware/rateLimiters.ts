/**
 * Shared API rate limiters (built on express-rate-limit).
 *
 * When REDIS_URL is configured the counters live in Redis via a dedicated
 * connection, so limits are shared across all PM2 workers / EC2 instances
 * (an in-memory store would give each worker its own counter, effectively
 * multiplying every limit by the worker count and resetting on restart).
 * Without REDIS_URL (local/dev/test) it falls back to the in-memory store.
 */
import rateLimit, { Options } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import Redis from 'ioredis';
import { logger } from '../utils/logger';

const common = {
  standardHeaders: true as const,
  legacyHeaders: false as const,
};

// Dedicated ioredis client for rate limiting (separate from the cache facade).
let rlClient: Redis | null = null;
if (process.env.NODE_ENV !== 'test' && process.env.REDIS_URL) {
  try {
    rlClient = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 2 });
    rlClient.on('error', (e) => logger.warn(`[rate-limit] redis error: ${e?.message}`));
    logger.info('[rate-limit] using shared Redis store');
  } catch (err) {
    logger.warn('[rate-limit] failed to init Redis store — using in-memory store');
    rlClient = null;
  }
}

/** A Redis-backed store (shared across workers) or undefined → express-rate-limit MemoryStore. */
function sharedStore(prefix: string) {
  if (!rlClient) return undefined;
  try {
    return new RedisStore({
      sendCommand: (command: string, ...args: string[]) => (rlClient as Redis).call(command, ...args) as any,
      prefix,
    });
  } catch {
    return undefined;
  }
}

/** Factory so auth-specific limiters can reuse the same shared store. */
export function makeLimiter(prefix: string, opts: Partial<Options>) {
  return rateLimit({ ...common, ...opts, store: sharedStore(prefix) });
}

/** Baseline protection for the whole API surface (incl. search/list/query endpoints). */
export const generalLimiter = makeLimiter('rl:general:', {
  windowMs: 15 * 60 * 1000, // 15 min
  max: 300,                 // 300 requests / 15 min / IP
  message: { error: 'too_many_requests', message: 'Rate limit exceeded. Please slow down.' },
});

/** Tighter limit for expensive AI endpoints (OpenAI cost + latency). */
export const aiLimiter = makeLimiter('rl:ai:', {
  windowMs: 15 * 60 * 1000,
  max: 30,                  // 30 AI calls / 15 min / IP
  message: { error: 'too_many_ai_requests', message: 'AI request limit reached. Try again shortly.' },
});

/** Limit for file upload / document mutation endpoints. */
export const uploadLimiter = makeLimiter('rl:upload:', {
  windowMs: 15 * 60 * 1000,
  max: 60,                  // 60 upload-related requests / 15 min / IP
  message: { error: 'too_many_uploads', message: 'Upload rate limit reached. Try again shortly.' },
});
