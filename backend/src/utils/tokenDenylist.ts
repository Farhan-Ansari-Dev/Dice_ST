import redis from '../config/redis';
import { logger } from './logger';

/**
 * Session revocation via a Redis denylist keyed by JWT `jti`.
 *
 * issueTokens() gives the access + refresh pair a shared `jti` (a session id).
 * Denylisting that jti kills the whole session: authenticate() rejects the
 * access token and /refresh rejects the refresh token.
 *
 * Reads fail OPEN — if Redis is unavailable we do not lock every user out; the
 * short access-token TTL bounds the exposure. (In the in-memory Redis fallback
 * the denylist is per-process; documented as a scaling caveat.)
 */
const keyFor = (jti: string) => `denylist:jti:${jti}`;

export const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60;

export async function denylistJti(jti: string, ttlSeconds: number): Promise<void> {
  if (!jti) return;
  try {
    await redis.setex(keyFor(jti), Math.max(1, Math.floor(ttlSeconds)), '1');
  } catch (err) {
    logger.error('denylistJti failed', err);
  }
}

export async function isJtiDenylisted(jti?: string): Promise<boolean> {
  if (!jti) return false;
  try {
    return (await redis.get(keyFor(jti))) !== null;
  } catch (err) {
    logger.error('isJtiDenylisted check failed (failing open)', err);
    return false;
  }
}

/** Remaining lifetime of a decoded JWT (seconds), floored at 0, default 30d. */
export function remainingTtl(exp?: number): number {
  if (!exp) return THIRTY_DAYS_SECONDS;
  const secs = exp - Math.floor(Date.now() / 1000);
  return secs > 0 ? secs : THIRTY_DAYS_SECONDS;
}
