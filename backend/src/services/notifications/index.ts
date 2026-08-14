/**
 * Unified Notification Service — single entry point for all channels.
 *
 * Channels:
 *   1. in_app    — MongoDB Notification document (always recorded)
 *   2. push      — Mobile (Expo Push API) + Web (Web Push API / VAPID)
 *   3. email     — AWS SES (transactional)
 *   4. sms       — MSG91 (Indian numbers) or Twilio (international)
 *
 * Channel selection: derived from notification type + user preferences.
 * Failures in one channel do NOT block others. All channels are logged.
 *
 * Usage:
 *   import { notify } from './services/notifications';
 *
 *   await notify({
 *     user_id: user._id,
 *     type: 'cert_expiry_30d',
 *     title: '⚠️ Certificate Expiring',
 *     body: 'Your BIS cert CM/L-7654321 expires in 30 days. Initiate renewal now.',
 *     data: { cert_id: cert._id, deep_link: 'dice://certs/' + cert._id },
 *     channels: ['in_app', 'push', 'email'],
 *   });
 */
import { Types } from 'mongoose';
import { User } from '../../models/User';
import { Notification } from '../../models/Notification';
import { audit } from '../../models/AuditLog';
import { sendWebPush } from './push';
import { publishToUser, normalizeData } from './sns';
import { sendEmail } from './email';
import { sendSMS } from './sms';
import { logger } from '../../utils/logger';

export type NotificationChannel = 'in_app' | 'push' | 'email' | 'sms';

export interface NotifyInput {
  user_id: Types.ObjectId | string;
  type: string;                              // e.g. 'cert_expiry_30d', 'app_status_changed'
  title: string;
  body: string;
  data?: Record<string, any>;                // deep-link context for clients
  channels?: NotificationChannel[];          // omit = use user preferences
  resource_type?: string;
  resource_id?: Types.ObjectId | string;
  priority?: 'low' | 'normal' | 'high';      // affects FCM/APNS delivery
  email_template?: string;                   // override default email template
}

/**
 * Send a notification across selected channels.
 * Returns delivery status per channel.
 */
export async function notify(input: NotifyInput): Promise<{
  in_app: boolean;
  push?: { mobile: boolean; web: boolean };
  email?: boolean;
  sms?: boolean;
}> {
  const user = await User.findById(input.user_id);
  if (!user) {
    logger.warn(`[notify] user ${input.user_id} not found`);
    return { in_app: false };
  }

  // Determine channels (caller override OR user preference defaults)
  const channels = input.channels ?? defaultChannelsFor(input.type, user);

  const result: any = { in_app: false };

  // 1. Always record in-app notification (cheap, source of truth)
  const notif = await Notification.create({
    user_id: user._id,
    type: input.type,
    title: input.title,
    body: input.body,
    data: input.data ?? {},
    channels,
    delivered_channels: ['in_app'],
    resource_type: input.resource_type,
    resource_id: input.resource_id,
  });
  result.in_app = true;

  // Track delivered channels for analytics
  const delivered: string[] = ['in_app'];

  // 2. Push — mobile via AWS SNS (native APNs/FCM), web via VAPID
  if (channels.includes('push')) {
    result.push = { mobile: false, web: false };

    // Mobile push (AWS SNS → APNs/FCM). No-op when PUSH_PROVIDER=off.
    try {
      // Normalize to the {type, screen, entityId, data} contract the mobile
      // notificationRouter navigates from (derives screen/entityId from
      // resource_type/resource_id or existing data keys; preserves all keys).
      const pushData = normalizeData({
        type: input.type,
        resource_type: input.resource_type,
        resource_id: input.resource_id,
        data: input.data,
      });
      const { sent } = await publishToUser(user._id, {
        title: input.title,
        body: input.body,
        type: input.type,
        data: pushData,
      });
      result.push.mobile = sent > 0;
      if (result.push.mobile) delivered.push('push:mobile');
    } catch (err) {
      logger.error('[notify] mobile push (sns) failed', err);
    }
  }

  if (channels.includes('push') && (user as any).webpush_subscriptions?.length) {
    // Web push (VAPID)
    try {
      const ok = await sendWebPush({
        subscriptions: (user as any).webpush_subscriptions,
        title: input.title,
        body: input.body,
        data: input.data,
        url: input.data?.deep_link,
      });
      if (result.push) result.push.web = ok;
      if (ok) delivered.push('push:web');
    } catch (err) {
      logger.error('[notify] web push failed', err);
    }
  }

  // 3. Email
  if (channels.includes('email') && user.email) {
    try {
      const ok = await sendEmail({
        to: user.email,
        subject: input.title,
        body: input.body,
        template: input.email_template ?? input.type,
        data: { ...input.data, user_name: user.name },
      });
      result.email = ok;
      if (ok) delivered.push('email');
    } catch (err) {
      logger.error('[notify] email failed', err);
    }
  }

  // 4. SMS (only for critical events, Indian users)
  if (channels.includes('sms') && user.phone) {
    try {
      const ok = await sendSMS({
        to: user.phone,
        text: `${input.title}: ${input.body.slice(0, 100)}...`,
        country_code: user.country_code,
      });
      result.sms = ok;
      if (ok) delivered.push('sms');
    } catch (err) {
      logger.error('[notify] sms failed', err);
    }
  }

  // Update notification record with actual delivered channels
  await Notification.updateOne(
    { _id: notif._id },
    { $set: { delivered_channels: delivered } }
  );

  return result;
}

/**
 * Choose channels based on notification type + user preferences.
 *
 * Defaults (overridable per user via Organization.settings.notification_preferences):
 *   - Critical (cert revoked, payment failed)     → in_app + push + email + sms
 *   - Time-sensitive (expiry < 7 days, doc due)   → in_app + push + email
 *   - Routine (status change, comment)            → in_app + push
 *   - Marketing                                   → email only (if opted in)
 */
function defaultChannelsFor(type: string, user: any): NotificationChannel[] {
  // Critical events — multi-channel
  if (
    type.startsWith('cert_revoked') ||
    type.startsWith('payment_failed') ||
    type.startsWith('security_alert') ||
    type === 'login_from_new_device'
  ) {
    return ['in_app', 'push', 'email', 'sms'];
  }

  // Time-sensitive
  if (
    type.startsWith('cert_expiry_') ||                // _7d, _30d, _90d
    type === 'app_docs_required' ||
    type === 'cert_issued' ||
    type === 'payment_received'
  ) {
    return ['in_app', 'push', 'email'];
  }

  // Routine app updates
  if (
    type.startsWith('app_status_changed') ||
    type === 'comment_mention' ||
    type === 'task_assigned'
  ) {
    return ['in_app', 'push'];
  }

  // Marketing / weekly digest
  if (type.startsWith('marketing_') || type === 'weekly_digest') {
    return user.consents?.marketing ? ['email'] : [];
  }

  // Default — in-app + push
  return ['in_app', 'push'];
}

/**
 * Helper: bulk notify (for cron jobs like expiry reminders).
 * Limits concurrency to avoid hammering external APIs.
 */
export async function bulkNotify(
  inputs: NotifyInput[],
  concurrency = 10
): Promise<void> {
  for (let i = 0; i < inputs.length; i += concurrency) {
    const batch = inputs.slice(i, i + concurrency);
    await Promise.allSettled(batch.map(input => notify(input)));
  }
}
