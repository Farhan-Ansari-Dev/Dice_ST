import { runExpiryReminders, runStaleApplicationCheck } from './expiryReminder'
import { seedInsights } from './insightsScraper'
import { logger } from '../utils/logger'

const HOUR = 60 * 60 * 1000
const DAY  = 24 * HOUR

/**
 * Start all background jobs.
 * In production, use node-cron or Bull/BullMQ with Redis.
 * For now, simple setInterval is sufficient.
 */
export function startBackgroundJobs(): void {
  logger.info('🔄 Starting background jobs...')

  // Run immediately on startup, then daily
  setTimeout(async () => {
    await seedInsights().catch((e) => logger.error('Insights seed failed:', e))
    await runExpiryReminders().catch((e) => logger.error('Expiry reminders failed:', e))
    await runStaleApplicationCheck().catch((e) => logger.error('Stale app check failed:', e))
    logger.info('✅ Initial job run complete')
  }, 5000) // 5s after server starts

  // Daily: expiry reminders at 9:00 AM IST
  setInterval(async () => {
    const now = new Date()
    const istHour = (now.getUTCHours() + 5) % 24 // IST = UTC+5:30, approximate
    if (istHour === 9) {
      await runExpiryReminders().catch((e) => logger.error('Expiry reminders failed:', e))
      await runStaleApplicationCheck().catch((e) => logger.error('Stale app check failed:', e))
    }
  }, HOUR)

  // Daily: seed insights
  setInterval(async () => {
    await seedInsights().catch((e) => logger.error('Insights seed failed:', e))
  }, DAY)

  logger.info('✅ Background jobs scheduled')
}
