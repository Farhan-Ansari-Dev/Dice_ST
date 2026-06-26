/**
 * v2 background jobs scheduler.
 * Single in-process scheduler — fine at this scale (single EC2).
 * Migrate to BullMQ when you scale to multiple workers.
 */
import { runCertExpiryReminders } from './certExpiryReminder';
import { logger } from '../../utils/logger';

const HOUR = 60 * 60 * 1000;

export function startV2Jobs(): void {
  logger.info('🔄 Starting v2 background jobs (MongoDB)...');

  // Run 5 seconds after server boot
  setTimeout(async () => {
    await runCertExpiryReminders().catch(e => logger.error('[expiry] startup run failed', e));
    logger.info('✅ Initial v2 job run complete');
  }, 5000);

  // Daily check — every hour, run when IST is 09:00
  setInterval(async () => {
    const now = new Date();
    // IST = UTC+5:30 → check current UTC hour
    const istHour = (now.getUTCHours() + 5) % 24;
    const istMin = now.getUTCMinutes() + 30;
    if (istHour === 9 && istMin >= 30 && istMin < 60) {
      try {
        await runCertExpiryReminders();
      } catch (e) {
        logger.error('[expiry] scheduled run failed', e);
      }
    }
  }, HOUR);

  logger.info('✅ v2 background jobs scheduled (cert expiry daily @ 09:30 IST)');
}
