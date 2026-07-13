/**
 * Shared API rate limiters (built on express-rate-limit).
 *
 * Centralised so limits are consistent and reused across route groups
 * rather than redefined per-file. Auth-specific limiters remain local to
 * routes/v2/auth.ts (tighter, endpoint-specific windows).
 *
 * Applied at mount points in routes/index.ts + a baseline limiter in index.ts.
 * In-memory store is sufficient for the current single-instance deployment;
 * swap to a shared store (Redis) when scaling to multiple instances.
 */
import rateLimit from 'express-rate-limit';

const common = {
  standardHeaders: true as const,
  legacyHeaders: false as const,
};

/** Baseline protection for the whole API surface (incl. search/list/query endpoints). */
export const generalLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000, // 15 min
  max: 300,                 // 300 requests / 15 min / IP
  message: { error: 'too_many_requests', message: 'Rate limit exceeded. Please slow down.' },
});

/** Tighter limit for expensive AI endpoints (OpenAI cost + latency). */
export const aiLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  max: 30,                  // 30 AI calls / 15 min / IP
  message: { error: 'too_many_ai_requests', message: 'AI request limit reached. Try again shortly.' },
});

/** Limit for file upload / document mutation endpoints. */
export const uploadLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  max: 60,                  // 60 upload-related requests / 15 min / IP
  message: { error: 'too_many_uploads', message: 'Upload rate limit reached. Try again shortly.' },
});
