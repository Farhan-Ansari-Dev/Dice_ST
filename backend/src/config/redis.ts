/**
 * Redis client with in-memory fallback.
 *
 * When Redis is available (Docker / ElastiCache / Upstash), this module
 * uses ioredis as usual. When Redis is NOT reachable (local dev without
 * Docker), it silently degrades to a Map-based in-memory cache so the
 * backend still starts and runs.
 */
import Redis from 'ioredis';
import { logger } from '../utils/logger';

// ── In-memory fallback (dev-only, single-process) ────────────────────────────
// Node's setTimeout silently clamps delays > 2^31-1 ms (~24.8 days) to 1 ms,
// which would evict long-TTL keys almost immediately. Only schedule a proactive
// cleanup timer when it fits; longer TTLs rely on lazy expiry in get().
const MAX_TIMEOUT_MS = 2_147_483_647;

class MemoryCache {
  private store = new Map<string, { value: string; expiresAt?: number }>();
  private timers = new Map<string, NodeJS.Timeout>();

  private schedule(key: string, ms: number) {
    const existing = this.timers.get(key);
    if (existing) clearTimeout(existing);
    if (ms <= MAX_TIMEOUT_MS) {
      this.timers.set(key, setTimeout(() => this.store.delete(key), ms));
    }
  }

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string): Promise<'OK'> {
    this.store.set(key, { value });
    return 'OK';
  }

  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    this.store.set(key, { value, expiresAt: Date.now() + seconds * 1000 });
    this.schedule(key, seconds * 1000);
    return 'OK';
  }

  async del(key: string): Promise<number> {
    const had = this.store.has(key);
    this.store.delete(key);
    const timer = this.timers.get(key);
    if (timer) { clearTimeout(timer); this.timers.delete(key); }
    return had ? 1 : 0;
  }

  async incr(key: string): Promise<number> {
    const current = await this.get(key);
    const next = (parseInt(current ?? '0', 10) || 0) + 1;
    const entry = this.store.get(key);
    this.store.set(key, { value: String(next), expiresAt: entry?.expiresAt });
    return next;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return 0;
    entry.expiresAt = Date.now() + seconds * 1000;
    this.schedule(key, seconds * 1000);
    return 1;
  }

  // No-op methods for compatibility
  on(_event: string, _handler: (...args: any[]) => void) { return this; }
  async ping() { return 'PONG'; }
  async quit() { return 'OK'; }
  get status() { return 'ready'; }
}

// ── Try real Redis, fallback to memory ───────────────────────────────────────

let redisClient: any;

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

try {
  const client = new Redis(redisUrl, {
    retryStrategy: (times) => {
      if (times > 3) {
        logger.warn('⚠️  Redis unavailable — switching to in-memory cache');
        return null; // stop retrying
      }
      return Math.min(times * 200, 1000);
    },
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    connectTimeout: 3000,
    lazyConnect: true,
  });

  // Try to connect — if it fails, swap to memory
  client.connect().then(() => {
    logger.info('✅ Redis connected');
    redisClient = client;
  }).catch(() => {
    logger.warn('⚠️  Redis not available — using in-memory cache (dev mode)');
    redisClient = new MemoryCache();
  });

  client.on('error', () => {
    if (!(redisClient instanceof MemoryCache)) {
      logger.warn('⚠️  Redis error — falling back to in-memory cache');
      redisClient = new MemoryCache();
    }
  });

  // Start with memory cache until Redis connects
  redisClient = new MemoryCache();
} catch {
  logger.warn('⚠️  Redis init failed — using in-memory cache');
  redisClient = new MemoryCache();
}

export default redisClient as {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<'OK'>;
  setex(key: string, seconds: number, value: string): Promise<'OK'>;
  del(key: string): Promise<number>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  on(event: string, handler: (...args: any[]) => void): any;
  quit(): Promise<string>;
};
