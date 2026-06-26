/**
 * Daily cron: scan certifications for upcoming expiry, notify owners.
 *
 * Tiers (days before expiry):
 *   90  → "Heads up — plan renewal soon"     (low priority)
 *   30  → "Renewal action required"          (medium)
 *   7   → "URGENT: cert expires this week"   (high)
 *   1   → "FINAL DAY"                         (high + SMS)
 *
 * Also: flips status active → expiring_soon → expired automatically.
 */
import { Certification, Organization, User, audit } from '../../models';
import { notify, bulkNotify } from '../../services/notifications';
import { logger } from '../../utils/logger';

const TIERS = [
  { days: 90, type: 'cert_expiry_90d',  emoji: '📅', priority: 'low' as const,    channels: undefined },
  { days: 30, type: 'cert_expiry_30d',  emoji: '⚠️',  priority: 'normal' as const, channels: undefined },
  { days: 7,  type: 'cert_expiry_7d',   emoji: '🔴', priority: 'high' as const,   channels: undefined },
  { days: 1,  type: 'cert_expiry_1d',   emoji: '🚨', priority: 'high' as const,   channels: ['in_app','push','email','sms'] as any[] },
];

export async function runCertExpiryReminders() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const tier of TIERS) {
    const target = new Date(today);
    target.setDate(target.getDate() + tier.days);
    const nextDay = new Date(target);
    nextDay.setDate(nextDay.getDate() + 1);

    const certs = await Certification.find({
      status: { $in: ['active', 'expiring_soon'] },
      expiry_date: { $gte: target, $lt: nextDay },
    }).populate('product_id').lean();

    if (certs.length === 0) continue;
    logger.info(`[cert-expiry] ${certs.length} certs expiring in ${tier.days} days`);

    // Find recipients per org (owner + assignees of source application)
    const notifications: any[] = [];
    for (const cert of certs as any[]) {
      const org = await Organization.findById(cert.org_id).lean();
      if (!org) continue;

      // Owner + all admins/consultants in the org
      const recipients = await User.find({
        org_id: cert.org_id,
        role: { $in: ['admin', 'consultant'] },
        deleted_at: null,
      }).select('_id').lean();

      const productName = cert.product_id?.name ?? 'product';
      const expiryFmt = new Date(cert.expiry_date).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
      });

      for (const r of recipients) {
        notifications.push({
          user_id: r._id,
          type: tier.type,
          title: `${tier.emoji} ${cert.cert_type} cert expires ${tier.days === 1 ? 'TOMORROW' : `in ${tier.days} days`}`,
          body: `${productName} certificate (${cert.cert_number}) expires on ${expiryFmt}. ${tier.days <= 7 ? 'Initiate renewal IMMEDIATELY.' : 'Plan renewal to avoid disruption.'}`,
          data: {
            certification_id: cert._id,
            deep_link: `dice://certifications/${cert._id}`,
            days_left: tier.days,
          },
          channels: tier.channels,
          priority: tier.priority,
          resource_type: 'certification',
          resource_id: cert._id,
        });
      }
    }

    await bulkNotify(notifications, 10);
  }

  // ─── Lifecycle flip: active → expiring_soon (≤30d) or expired ────
  const flipResult = await Certification.updateMany(
    {
      status: 'active',
      expiry_date: { $lte: new Date(today.getTime() + 30 * 24 * 3600 * 1000) },
    },
    {
      $set: { status: 'expiring_soon', status_changed_at: new Date() },
    }
  );

  const expiredResult = await Certification.updateMany(
    {
      status: { $in: ['active', 'expiring_soon'] },
      expiry_date: { $lt: today },
    },
    {
      $set: { status: 'expired', status_changed_at: new Date() },
    }
  );

  logger.info(`[cert-expiry] lifecycle flips: ${flipResult.modifiedCount} → expiring_soon, ${expiredResult.modifiedCount} → expired`);

  // Audit the system action
  await audit({
    actor_type: 'cron',
    resource_type: 'certification',
    action: 'updated',
    after: { reason: 'lifecycle_auto_flip', flipped_to_expiring: flipResult.modifiedCount, flipped_to_expired: expiredResult.modifiedCount },
  });
}
