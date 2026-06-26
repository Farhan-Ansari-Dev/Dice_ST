/**
 * Push notification adapters:
 *   - Expo Push API (mobile iOS + Android)
 *   - Web Push API / VAPID (PWA, web admin portal)
 *
 * Why Expo (not FCM/APNs directly)?
 *   - Same API works for iOS + Android (one less integration)
 *   - Handles APNs cert rotation and FCM token refresh transparently
 *   - Free up to 1000 messages/sec — covers any startup-scale traffic
 *
 * Why Web Push API (not FCM Web)?
 *   - Native browser API, no Firebase dependency
 *   - GDPR-friendly: data never leaves your servers
 *   - Free, no rate limits
 */
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import * as webpush from "web-push";
import { logger } from '../../utils/logger';

const expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN,
});

// VAPID is the auth mechanism for Web Push.
// Generate ONCE: npx web-push generate-vapid-keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? 'mailto:admin@sanyogconformity.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// ═══════════════════════════════════════════════════════════════
// MOBILE (Expo)
// ═══════════════════════════════════════════════════════════════
export interface ExpoPushInput {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high';
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
}

export async function sendExpoPush(input: ExpoPushInput): Promise<ExpoPushTicket[]> {
  const validTokens = input.tokens.filter(t => Expo.isExpoPushToken(t));
  if (validTokens.length === 0) {
    logger.debug('[push] no valid Expo tokens');
    return [];
  }

  const messages: ExpoPushMessage[] = validTokens.map(token => ({
    to: token,
    title: input.title,
    body: input.body,
    data: input.data ?? {},
    sound: input.sound === null ? null : 'default',
    priority: input.priority === 'high' ? 'high' : 'default',
    badge: input.badge,
    channelId: input.channelId ?? 'default',
    ttl: 86400,                              // 24h — drops stale messages
    mutableContent: true,                    // iOS: allow notification service extension
  }));

  // Expo batches up to 100 per request
  const chunks = expo.chunkPushNotifications(messages);
  const tickets: ExpoPushTicket[] = [];

  for (const chunk of chunks) {
    try {
      const chunkTickets = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...chunkTickets);
    } catch (err) {
      logger.error('[push:expo] chunk failed', err);
    }
  }

  // Log errors per token (lets you clean up dead tokens later)
  tickets.forEach((ticket, i) => {
    if (ticket.status === 'error') {
      const token = validTokens[i];
      logger.warn(`[push:expo] error for ${token.slice(0, 20)}...: ${ticket.message}`);

      // Common failure: DeviceNotRegistered → remove token from user record
      if ((ticket as any).details?.error === 'DeviceNotRegistered') {
        // Caller should clean up — return enough info
        (ticket as any).cleanup_token = token;
      }
    }
  });

  return tickets;
}

/**
 * Process Expo's delivery receipts (async — call this on a cron).
 * Receipts tell you if Apple/Google actually delivered the push.
 */
export async function checkExpoReceipts(ticketIds: string[]) {
  const chunks = expo.chunkPushNotificationReceiptIds(ticketIds);
  const allReceipts: Record<string, any> = {};

  for (const chunk of chunks) {
    try {
      const receipts = await expo.getPushNotificationReceiptsAsync(chunk);
      Object.assign(allReceipts, receipts);
    } catch (err) {
      logger.error('[push:expo:receipts] failed', err);
    }
  }

  return allReceipts;
}

// ═══════════════════════════════════════════════════════════════
// WEB (VAPID / Web Push API)
// ═══════════════════════════════════════════════════════════════
export interface WebPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface WebPushInput {
  subscriptions: WebPushSubscription[];
  title: string;
  body: string;
  data?: Record<string, any>;
  url?: string;                              // where to open on click
  icon?: string;
  badge?: string;
}

export async function sendWebPush(input: WebPushInput): Promise<boolean> {
  if (!process.env.VAPID_PUBLIC_KEY) {
    logger.warn('[push:web] VAPID not configured — skipping');
    return false;
  }

  const payload = JSON.stringify({
    title: input.title,
    body: input.body,
    data: input.data ?? {},
    url: input.url ?? '/',
    icon: input.icon ?? '/icon-192.png',
    badge: input.badge ?? '/badge-72.png',
  });

  const results = await Promise.allSettled(
    input.subscriptions.map(sub =>
      webpush.sendNotification(sub as any, payload, {
        TTL: 86400,
        urgency: 'normal',
      })
    )
  );

  let delivered = 0;
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      delivered++;
    } else {
      const err = (r as any).reason;
      // 410 Gone = subscription expired — caller should remove from DB
      if (err.statusCode === 410 || err.statusCode === 404) {
        logger.debug(`[push:web] removing expired subscription ${input.subscriptions[i].endpoint.slice(0, 40)}...`);
      } else {
        logger.error('[push:web] send failed', err.message);
      }
    }
  });

  return delivered > 0;
}
