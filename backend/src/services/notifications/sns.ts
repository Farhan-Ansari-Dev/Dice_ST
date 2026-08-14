/**
 * AWS SNS push transport — device endpoint lifecycle + publish.
 *
 * This is the single native-push transport for DICE (replaces the Expo Push
 * path). It manages SNS platform endpoints (APNs for iOS, FCM v1 for Android)
 * and publishes platform-shaped payloads.
 *
 * SAFETY: gated by PUSH_PROVIDER. Default "off" → no SNS API calls at all
 *         (registration still records the Device row; publish is a no-op).
 *         Nothing here ever logs a full device token or credential.
 *
 * Endpoint reuse (avoids duplicate endpoints on every login/app launch):
 *   - stored ARN → GetEndpointAttributes → SetEndpointAttributes if drifted
 *   - else CreatePlatformEndpoint → on "already exists" parse ARN + re-enable
 */
import {
  SNSClient,
  CreatePlatformEndpointCommand,
  GetEndpointAttributesCommand,
  SetEndpointAttributesCommand,
  DeleteEndpointCommand,
  PublishCommand,
} from '@aws-sdk/client-sns';
import { Types } from 'mongoose';
import { Device, IDevice } from '../../models/Device';
import { logger } from '../../utils/logger';

// ── Config ──────────────────────────────────────────────────────
const REGION = process.env.AWS_REGION ?? 'ap-south-1';

/** "sns" enables real delivery; anything else (default "off") is a safe no-op. */
export function isPushEnabled(): boolean {
  return (process.env.PUSH_PROVIDER ?? 'off').toLowerCase() === 'sns';
}

/**
 * iOS APNs has two environments. Dev/EAS-development builds mint SANDBOX tokens
 * that only work against an APNS_SANDBOX platform app. Select by NODE_ENV so
 * production uses the production platform app and everything else uses sandbox
 * (when a sandbox ARN is configured).
 */
function useApnsSandbox(): boolean {
  return process.env.NODE_ENV !== 'production' && !!process.env.SNS_PLATFORM_APP_ARN_IOS_SANDBOX;
}

function platformAppArnFor(platform: 'ios' | 'android'): string | undefined {
  if (platform === 'android') return process.env.SNS_PLATFORM_APP_ARN_ANDROID;
  return useApnsSandbox()
    ? process.env.SNS_PLATFORM_APP_ARN_IOS_SANDBOX
    : process.env.SNS_PLATFORM_APP_ARN_IOS;
}

function apnsMessageKey(): 'APNS' | 'APNS_SANDBOX' {
  return useApnsSandbox() ? 'APNS_SANDBOX' : 'APNS';
}

// ── Client (lazy so importing the module needs no AWS creds) ─────
let _client: SNSClient | null = null;
function client(): SNSClient {
  if (!_client) _client = new SNSClient({ region: REGION });
  return _client;
}

// ── Logging helpers (never leak tokens) ─────────────────────────
const maskArn = (arn?: string) => (arn ? '…' + arn.slice(-16) : 'none');
const errName = (e: any) => (e?.name || e?.Code || 'Error') as string;
const errMsg = (e: any) => String(e?.message ?? e).slice(0, 200);

// ── Payload shaping ─────────────────────────────────────────────
export interface PushPayload {
  title: string;
  body: string;
  type: string;                       // logical notification type
  data?: Record<string, any>;         // screen, entityId, deep_link, …
  badge?: number;
  channelId?: string;                 // Android channel
}

// ── Payload normalization (single {type, screen, entityId, data} contract) ──
// Callers pass either resource_type/resource_id (workflow/assignment/renewal) or
// entity-specific id keys in data (legacy leads/tickets/etc). Normalize both to a
// consistent shape the mobile notificationRouter can navigate from — without
// requiring any caller to change (backwards compatible; existing keys preserved).
const TYPE_SCREEN: Record<string, string> = {
  app_assigned: 'application',
  app_escalated: 'application',
  app_status_changed: 'application',
  app_status_overridden: 'application',
  app_docs_required: 'application',
  cert_issued: 'certification',
  cert_revoked: 'certification',
};

function screenFromResourceType(rt?: string): string | undefined {
  if (!rt) return undefined;
  const map: Record<string, string> = {
    application: 'application',
    certification: 'certification',
    payment: 'payment',
    ticket: 'ticket',
  };
  return map[rt] ?? rt;
}

function screenFromType(type: string): string | undefined {
  if (TYPE_SCREEN[type]) return TYPE_SCREEN[type];
  if (type.startsWith('cert_')) return 'certification';
  if (type.startsWith('app_')) return 'application';
  if (type.startsWith('payment')) return 'payment';
  if (type.includes('ticket')) return 'ticket';
  return undefined;
}

// Ordered id keys used by existing callers.
const ID_KEYS = [
  'entityId', 'application_id', 'applicationId', 'certification_id', 'certId',
  'ticketId', 'leadId', 'meetingId', 'payment_id', 'paymentId', 'id',
];
function entityIdFromData(data: Record<string, any>): string | undefined {
  for (const k of ID_KEYS) {
    if (data[k] !== undefined && data[k] !== null) return String(data[k]);
  }
  return undefined;
}

/** Produce the canonical push data bag: preserves all original keys + adds screen/entityId. */
export function normalizeData(input: {
  type: string;
  resource_type?: string;
  resource_id?: any;
  data?: Record<string, any>;
}): Record<string, any> {
  const data: Record<string, any> = { ...(input.data ?? {}) };
  const screen = data.screen ?? screenFromResourceType(input.resource_type) ?? screenFromType(input.type);
  const entityId =
    data.entityId ??
    (input.resource_id !== undefined && input.resource_id !== null ? String(input.resource_id) : entityIdFromData(data));
  if (screen !== undefined) data.screen = screen;
  if (entityId !== undefined) data.entityId = entityId;
  return data;
}

/** Map a notification type to one of the three Android channels the app creates. */
export function channelForType(type: string): 'default' | 'compliance' | 'applications' {
  if (type.startsWith('cert_') || type.startsWith('security') || type === 'login_from_new_device') {
    return 'compliance';
  }
  if (type.startsWith('app_') || type === 'task_assigned') {
    return 'applications';
  }
  return 'default';
}

/** FCM v1 data values must be strings. */
function stringifyValues(obj: Record<string, any>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    out[k] = typeof v === 'string' ? v : JSON.stringify(v);
  }
  return out;
}

/** Build the SNS `Message` (MessageStructure: 'json') for one platform. */
export function buildMessage(platform: 'ios' | 'android', p: PushPayload): string {
  const data = { type: p.type, ...(p.data ?? {}) };

  if (platform === 'ios') {
    const aps: Record<string, any> = {
      alert: { title: p.title, body: p.body },
      sound: 'default',
      'mutable-content': 1,
    };
    if (typeof p.badge === 'number') aps.badge = p.badge;
    // expo-notifications (iOS) maps `content.data` from the APNs payload's top-level
    // `body` key (EXNotificationSerializer: userInfo["body"] for remote notifications).
    // Nest the custom data under `body` so the mobile notificationRouter — which reads
    // content.data — receives {type, screen, entityId} and can deep-link. (Placing the
    // keys at the top level instead leaves content.data empty on iOS.)
    const apnsPayload = JSON.stringify({ aps, body: data });
    return JSON.stringify({ [apnsMessageKey()]: apnsPayload });
  }

  // Android — FCM HTTP v1 via SNS.
  // [ASSUMPTION] SNS wraps the v1 message under `fcmV1Message`; verified against
  // the SNS platform app during Phase B live testing before enabling delivery.
  const fcmPayload = JSON.stringify({
    fcmV1Message: {
      message: {
        notification: { title: p.title, body: p.body },
        data: stringifyValues(data),
        android: {
          priority: 'HIGH',
          notification: { channel_id: p.channelId ?? channelForType(p.type), sound: 'default' },
        },
      },
    },
  });
  return JSON.stringify({ GCM: fcmPayload });
}

// ── Endpoint lifecycle ──────────────────────────────────────────
/**
 * Return an enabled SNS endpoint ARN for (platform, token), creating or
 * reactivating as needed. Idempotent — never creates a duplicate endpoint.
 */
async function ensureEndpoint(
  platform: 'ios' | 'android',
  token: string,
  storedArn: string | undefined,
  userId: string
): Promise<string> {
  const appArn = platformAppArnFor(platform);
  if (!appArn) throw new Error(`no SNS platform application configured for ${platform}`);

  if (storedArn) {
    try {
      const attrs = await client().send(new GetEndpointAttributesCommand({ EndpointArn: storedArn }));
      const a = attrs.Attributes ?? {};
      if (a.Token !== token || a.Enabled !== 'true') {
        await client().send(
          new SetEndpointAttributesCommand({
            EndpointArn: storedArn,
            Attributes: { Token: token, Enabled: 'true' },
          })
        );
      }
      return storedArn;
    } catch (e) {
      if (errName(e) !== 'NotFoundException') throw e;
      // endpoint was deleted server-side → fall through and recreate
    }
  }

  try {
    const res = await client().send(
      new CreatePlatformEndpointCommand({
        PlatformApplicationArn: appArn,
        Token: token,
        CustomUserData: userId,
      })
    );
    if (!res.EndpointArn) throw new Error('CreatePlatformEndpoint returned no ARN');
    return res.EndpointArn;
  } catch (e) {
    // "…Endpoint <ARN> already exists with the same Token…" → adopt + re-enable.
    const match = /(arn:aws:sns:[^\s"]+)/.exec(errMsg(e));
    if (errName(e) === 'InvalidParameterException' && match) {
      const arn = match[1];
      await client().send(
        new SetEndpointAttributesCommand({
          EndpointArn: arn,
          Attributes: { Token: token, Enabled: 'true' },
        })
      );
      return arn;
    }
    throw e;
  }
}

// ── Public API ──────────────────────────────────────────────────
export interface RegisterInput {
  user_id: Types.ObjectId | string;
  platform: 'ios' | 'android';
  token: string;
  appVersion?: string;
  deviceName?: string;
}

/**
 * Register (or refresh) a device. Upserts the Device row by native token and,
 * when push is enabled, ensures a live SNS endpoint. Duplicate registrations
 * update the existing row/endpoint; token rotation creates a fresh one.
 */
export async function registerDevice(input: RegisterInput): Promise<IDevice> {
  const existing = await Device.findOne({ device_token: input.token });
  let arn = existing?.sns_endpoint_arn;

  if (isPushEnabled() && platformAppArnFor(input.platform)) {
    try {
      arn = await ensureEndpoint(input.platform, input.token, arn, String(input.user_id));
    } catch (e) {
      logger.error(`[push:sns] ensureEndpoint failed (${errName(e)}): ${errMsg(e)}`);
      // Still record the device; endpoint is retried on next publish/registration.
    }
  }

  const device = await Device.findOneAndUpdate(
    { device_token: input.token },
    {
      $set: {
        user_id: input.user_id,
        platform: input.platform,
        sns_endpoint_arn: arn,
        enabled: true,
        app_version: input.appVersion,
        device_name: input.deviceName,
        last_seen: new Date(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return device!;
}

/** Logout / unregister — SOFT disable (SNS endpoint kept for fast reactivation). */
export async function disableDevice(input: { user_id: Types.ObjectId | string; token: string }): Promise<void> {
  const device = await Device.findOne({ device_token: input.token, user_id: input.user_id });
  if (!device) return;

  if (isPushEnabled() && device.sns_endpoint_arn) {
    try {
      await client().send(
        new SetEndpointAttributesCommand({
          EndpointArn: device.sns_endpoint_arn,
          Attributes: { Enabled: 'false' },
        })
      );
    } catch (e) {
      if (errName(e) !== 'NotFoundException') {
        logger.warn(`[push:sns] disable endpoint failed (${errName(e)}): ${errMsg(e)}`);
      }
    }
  }

  device.enabled = false;
  await device.save();
}

/** Permanently remove an endpoint (used only for proven-dead tokens). */
export async function deleteEndpoint(device: IDevice): Promise<void> {
  if (isPushEnabled() && device.sns_endpoint_arn) {
    try {
      await client().send(new DeleteEndpointCommand({ EndpointArn: device.sns_endpoint_arn }));
    } catch (e) {
      if (errName(e) !== 'NotFoundException') {
        logger.warn(`[push:sns] deleteEndpoint failed (${errName(e)}): ${errMsg(e)}`);
      }
    }
  }
}

/**
 * Publish to all of a user's enabled devices. Best-effort: a dead endpoint is
 * disabled (never blocks siblings). Returns delivery counts.
 */
export async function publishToUser(
  user_id: Types.ObjectId | string,
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  if (!isPushEnabled()) return { sent: 0, failed: 0 };

  const devices = await Device.find({ user_id, enabled: true });
  let sent = 0;
  let failed = 0;

  for (const d of devices) {
    try {
      // Endpoint may be missing if the device registered while push was off.
      if (!d.sns_endpoint_arn) {
        d.sns_endpoint_arn = await ensureEndpoint(d.platform, d.device_token, undefined, String(user_id));
        await d.save();
      }

      const res = await client().send(
        new PublishCommand({
          TargetArn: d.sns_endpoint_arn,
          MessageStructure: 'json',
          Message: buildMessage(d.platform, payload),
        })
      );
      logger.info(`[push:sns] sent msg=${res.MessageId} endpoint=${maskArn(d.sns_endpoint_arn)} type=${payload.type}`);
      sent++;
    } catch (e) {
      failed++;
      const name = errName(e);
      if (name === 'EndpointDisabledException' || name === 'NotFoundException') {
        d.enabled = false;
        await d.save();
        logger.warn(`[push:sns] dead endpoint ${maskArn(d.sns_endpoint_arn)} disabled (${name})`);
      } else {
        logger.error(`[push:sns] publish failed endpoint=${maskArn(d.sns_endpoint_arn)} (${name}): ${errMsg(e)}`);
      }
    }
  }

  return { sent, failed };
}

export const snsService = {
  isPushEnabled,
  buildMessage,
  registerDevice,
  disableDevice,
  deleteEndpoint,
  publishToUser,
};

export default snsService;
