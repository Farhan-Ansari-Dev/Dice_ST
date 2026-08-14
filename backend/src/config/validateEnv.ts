import { logger } from '../utils/logger';

/**
 * Fail-fast environment validation.
 *
 * In production a missing security/payment secret must stop the process rather
 * than silently degrade (which is how a Razorpay TEST key reached production).
 * Outside production we only warn so local/dev boots stay frictionless.
 */
const REQUIRED_IN_PROD = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'RAZORPAY_WEBHOOK_SECRET',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'REDIS_URL',
];

export function validateEnv(): void {
  const isProd = process.env.NODE_ENV === 'production';

  const missing = REQUIRED_IN_PROD.filter((k) => !process.env[k]);
  if (!process.env.MONGODB_URI && !process.env.DATABASE_URL) {
    missing.push('MONGODB_URI (or DATABASE_URL)');
  }

  if (missing.length > 0) {
    const msg = `Missing required environment variables: ${missing.join(', ')}`;
    if (isProd) {
      throw new Error(`[env] ${msg} — refusing to start in production.`);
    }
    logger.warn(`[env] ${msg} (non-production: continuing).`);
  }

  // A test Razorpay key in production means no real money can be collected.
  if (isProd && (process.env.RAZORPAY_KEY_ID ?? '').startsWith('rzp_test_')) {
    throw new Error(
      '[env] RAZORPAY_KEY_ID is a TEST key (rzp_test_*) — refusing to start in production. Provide a live key (rzp_live_*).'
    );
  }

  // Push (AWS SNS) — only enforced when explicitly turned on. Default PUSH_PROVIDER
  // is "off" (safe no-op), so a missing SNS config never blocks startup.
  if ((process.env.PUSH_PROVIDER ?? 'off').toLowerCase() === 'sns') {
    const needed = ['SNS_PLATFORM_APP_ARN_IOS', 'SNS_PLATFORM_APP_ARN_ANDROID'].filter(
      (k) => !process.env[k]
    );
    if (needed.length > 0) {
      const msg = `PUSH_PROVIDER=sns but missing: ${needed.join(', ')}`;
      if (isProd) throw new Error(`[env] ${msg} — refusing to start in production.`);
      logger.warn(`[env] ${msg} (non-production: continuing).`);
    }
  }

  logger.info('[env] environment validation passed');
}
