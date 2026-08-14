/**
 * AWS SNS push transport + unified notify() consolidation.
 *
 * Uses a stateful in-memory fake for the SNS client (no network, no AWS creds)
 * and mongodb-memory-server for Device/Notification/User.
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// ── Stateful fake SNS (defined before jest.mock — name must start with "mock") ──
const mockEndpoints = new Map<string, { token: string; enabled: boolean }>();
let mockArnSeq = 0;
const mockSend = jest.fn(async (command: any) => {
  const name = command.constructor.name;
  const input = command.input ?? {};
  switch (name) {
    case 'CreatePlatformEndpointCommand': {
      for (const [arn, e] of mockEndpoints) {
        if (e.token === input.Token) {
          const err: any = new Error(
            `Invalid parameter: Token Reason: Endpoint ${arn} already exists with the same Token.`
          );
          err.name = 'InvalidParameterException';
          throw err;
        }
      }
      const arn = `arn:aws:sns:ap-south-1:066756667240:endpoint/APNS/DICE_iOS/${++mockArnSeq}`;
      mockEndpoints.set(arn, { token: input.Token, enabled: true });
      return { EndpointArn: arn };
    }
    case 'GetEndpointAttributesCommand': {
      const e = mockEndpoints.get(input.EndpointArn);
      if (!e) {
        const err: any = new Error('Endpoint does not exist');
        err.name = 'NotFoundException';
        throw err;
      }
      return { Attributes: { Token: e.token, Enabled: e.enabled ? 'true' : 'false' } };
    }
    case 'SetEndpointAttributesCommand': {
      const e = mockEndpoints.get(input.EndpointArn);
      if (e) {
        if (input.Attributes?.Token !== undefined) e.token = input.Attributes.Token;
        if (input.Attributes?.Enabled !== undefined) e.enabled = input.Attributes.Enabled === 'true';
      }
      return {};
    }
    case 'PublishCommand': {
      const e = mockEndpoints.get(input.TargetArn);
      if (!e) {
        const err: any = new Error('Endpoint does not exist');
        err.name = 'NotFoundException';
        throw err;
      }
      if (!e.enabled) {
        const err: any = new Error('Endpoint is disabled');
        err.name = 'EndpointDisabledException';
        throw err;
      }
      return { MessageId: `msg-${++mockArnSeq}` };
    }
    case 'DeleteEndpointCommand': {
      mockEndpoints.delete(input.EndpointArn);
      return {};
    }
    default:
      return {};
  }
});

jest.mock('@aws-sdk/client-sns', () => {
  const actual = jest.requireActual('@aws-sdk/client-sns');
  return { ...actual, SNSClient: jest.fn().mockImplementation(() => ({ send: mockSend })) };
});

import { User, Notification, Device } from '../models';
import { registerDevice, disableDevice, publishToUser, buildMessage, normalizeData, channelForType } from '../services/notifications/sns';
import { notify } from '../services/notifications';
import { notificationService } from '../services/notificationService';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.PUSH_PROVIDER = 'sns';
  process.env.SNS_PLATFORM_APP_ARN_IOS = 'arn:aws:sns:ap-south-1:066756667240:app/APNS/DICE_iOS';
  process.env.SNS_PLATFORM_APP_ARN_ANDROID = 'arn:aws:sns:ap-south-1:066756667240:app/GCM/DICE_Android';
  delete process.env.SNS_PLATFORM_APP_ARN_IOS_SANDBOX; // force prod APNS key in tests
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) await collections[key].deleteMany({});
  mockEndpoints.clear();
  mockArnSeq = 0;
  mockSend.mockClear();
  process.env.PUSH_PROVIDER = 'sns';
});

const mkUser = () =>
  User.create({ email: `u-${Math.random().toString(36).slice(2)}@t.test`, name: 'Test', role: 'client' });

const IOS_TOKEN = 'a'.repeat(64);
const IOS_TOKEN_2 = 'b'.repeat(64);
const AND_TOKEN = 'fcm-token-xyz-123';

// ── buildMessage (payload shaping) ──────────────────────────────
describe('buildMessage', () => {
  it('iOS → APNS key with aps alert + custom data', () => {
    const msg = JSON.parse(buildMessage('ios', { title: 'T', body: 'B', type: 'certificate_approved', data: { screen: 'certificate', entityId: 'c1' } }));
    expect(msg.APNS).toBeDefined();
    const apns = JSON.parse(msg.APNS);
    expect(apns.aps.alert).toEqual({ title: 'T', body: 'B' });
    // Custom data is nested under `body` so expo-notifications exposes it as
    // content.data on iOS (EXNotificationSerializer reads userInfo["body"]).
    expect(apns.body.type).toBe('certificate_approved');
    expect(apns.body.screen).toBe('certificate');
    expect(apns.body.entityId).toBe('c1');
  });

  it('Android → GCM key with FCM v1 wrapper + string data', () => {
    const msg = JSON.parse(buildMessage('android', { title: 'T', body: 'B', type: 'x', data: { entityId: 'c1', count: 5 } }));
    expect(msg.GCM).toBeDefined();
    const gcm = JSON.parse(msg.GCM);
    expect(gcm.fcmV1Message.message.notification).toEqual({ title: 'T', body: 'B' });
    expect(gcm.fcmV1Message.message.data.type).toBe('x');
    expect(gcm.fcmV1Message.message.data.count).toBe('5'); // stringified
    expect(gcm.fcmV1Message.message.android.priority).toBe('HIGH');
  });
});

// ── Device registration / lifecycle ─────────────────────────────
describe('registerDevice', () => {
  it('creates a Device + SNS endpoint (upsert)', async () => {
    const u = await mkUser();
    const d = await registerDevice({ user_id: u._id, platform: 'ios', token: IOS_TOKEN, appVersion: '1.0.0' });
    expect(d.enabled).toBe(true);
    expect(d.sns_endpoint_arn).toContain('arn:aws:sns');
    expect(await Device.countDocuments({})).toBe(1);
    expect(mockEndpoints.size).toBe(1);
  });

  it('duplicate registration reuses the same endpoint (no new endpoint)', async () => {
    const u = await mkUser();
    const d1 = await registerDevice({ user_id: u._id, platform: 'ios', token: IOS_TOKEN, appVersion: '1.0.0' });
    const d2 = await registerDevice({ user_id: u._id, platform: 'ios', token: IOS_TOKEN, appVersion: '1.0.1' });
    expect(await Device.countDocuments({})).toBe(1);
    expect(mockEndpoints.size).toBe(1);
    expect(d2.sns_endpoint_arn).toBe(d1.sns_endpoint_arn);
    expect(d2.app_version).toBe('1.0.1'); // refreshed
  });

  it('token rotation creates a new device/endpoint', async () => {
    const u = await mkUser();
    await registerDevice({ user_id: u._id, platform: 'ios', token: IOS_TOKEN });
    await registerDevice({ user_id: u._id, platform: 'ios', token: IOS_TOKEN_2 });
    expect(await Device.countDocuments({ user_id: u._id })).toBe(2);
    expect(mockEndpoints.size).toBe(2);
  });

  it('reactivates a disabled endpoint on re-register (same ARN)', async () => {
    const u = await mkUser();
    const d1 = await registerDevice({ user_id: u._id, platform: 'ios', token: IOS_TOKEN });
    await disableDevice({ user_id: u._id, token: IOS_TOKEN });
    expect(mockEndpoints.get(d1.sns_endpoint_arn!)!.enabled).toBe(false);

    const d2 = await registerDevice({ user_id: u._id, platform: 'ios', token: IOS_TOKEN });
    expect(d2.sns_endpoint_arn).toBe(d1.sns_endpoint_arn);
    expect(d2.enabled).toBe(true);
    expect(mockEndpoints.get(d1.sns_endpoint_arn!)!.enabled).toBe(true);
    expect(mockEndpoints.size).toBe(1);
  });

  it('adopts an existing SNS endpoint when CreatePlatformEndpoint reports a duplicate token', async () => {
    const u = await mkUser();
    // Pre-seed an SNS endpoint for the token but with NO stored Device (simulates
    // a device row lost while the SNS endpoint survived).
    const orphanArn = 'arn:aws:sns:ap-south-1:066756667240:endpoint/APNS/DICE_iOS/orphan';
    mockEndpoints.set(orphanArn, { token: IOS_TOKEN, enabled: false });
    const d = await registerDevice({ user_id: u._id, platform: 'ios', token: IOS_TOKEN });
    expect(d.sns_endpoint_arn).toBe(orphanArn);
    expect(mockEndpoints.get(orphanArn)!.enabled).toBe(true);
    expect(mockEndpoints.size).toBe(1);
  });
});

describe('disableDevice (logout soft-disable)', () => {
  it('disables the device + endpoint WITHOUT deleting the endpoint', async () => {
    const u = await mkUser();
    const d = await registerDevice({ user_id: u._id, platform: 'ios', token: IOS_TOKEN });
    await disableDevice({ user_id: u._id, token: IOS_TOKEN });
    const fresh = await Device.findById(d._id);
    expect(fresh!.enabled).toBe(false);
    expect(mockEndpoints.has(d.sns_endpoint_arn!)).toBe(true); // NOT deleted
    expect(mockEndpoints.get(d.sns_endpoint_arn!)!.enabled).toBe(false);
  });
});

// ── Publish ─────────────────────────────────────────────────────
describe('publishToUser', () => {
  it('sends to all enabled devices (multi-device)', async () => {
    const u = await mkUser();
    await registerDevice({ user_id: u._id, platform: 'ios', token: IOS_TOKEN });
    await registerDevice({ user_id: u._id, platform: 'android', token: AND_TOKEN });
    const r = await publishToUser(u._id, { title: 'T', body: 'B', type: 'x' });
    expect(r.sent).toBe(2);
    expect(r.failed).toBe(0);
  });

  it('disables a dead endpoint (EndpointDisabled) and counts it failed', async () => {
    const u = await mkUser();
    const d = await registerDevice({ user_id: u._id, platform: 'ios', token: IOS_TOKEN });
    mockEndpoints.get(d.sns_endpoint_arn!)!.enabled = false; // SNS marked it dead
    const r = await publishToUser(u._id, { title: 'T', body: 'B', type: 'x' });
    expect(r.sent).toBe(0);
    expect(r.failed).toBe(1);
    const fresh = await Device.findById(d._id);
    expect(fresh!.enabled).toBe(false); // cleaned up
  });

  it('is a no-op when PUSH_PROVIDER=off (SNS never called)', async () => {
    const u = await mkUser();
    process.env.PUSH_PROVIDER = 'sns';
    await registerDevice({ user_id: u._id, platform: 'ios', token: IOS_TOKEN });
    mockSend.mockClear();
    process.env.PUSH_PROVIDER = 'off';
    const r = await publishToUser(u._id, { title: 'T', body: 'B', type: 'x' });
    expect(r).toEqual({ sent: 0, failed: 0 });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('user with no devices → sent 0', async () => {
    const u = await mkUser();
    const r = await publishToUser(u._id, { title: 'T', body: 'B', type: 'x' });
    expect(r).toEqual({ sent: 0, failed: 0 });
  });
});

// ── notify() inbox preservation + push integration ──────────────
describe('unified notify()', () => {
  it('always writes the in-app Notification and publishes push', async () => {
    const u = await mkUser();
    await registerDevice({ user_id: u._id, platform: 'ios', token: IOS_TOKEN });
    const res = await notify({ user_id: u._id, type: 'app_status_changed', title: 'T', body: 'B', channels: ['in_app', 'push'] });
    expect(res.in_app).toBe(true);
    expect(await Notification.countDocuments({ user_id: u._id })).toBe(1);
    expect(res.push?.mobile).toBe(true);
  });

  it('writes inbox even when push disabled (PUSH_PROVIDER=off)', async () => {
    const u = await mkUser();
    process.env.PUSH_PROVIDER = 'off';
    const res = await notify({ user_id: u._id, type: 'app_status_changed', title: 'T', body: 'B', channels: ['in_app', 'push'] });
    expect(res.in_app).toBe(true);
    expect(await Notification.countDocuments({ user_id: u._id })).toBe(1);
    expect(res.push?.mobile).toBe(false);
  });
});

// ── Legacy adapter routes through notify() ──────────────────────
describe('legacy notificationService adapter', () => {
  it('sendPush() records an inbox notification and publishes', async () => {
    const u = await mkUser();
    await registerDevice({ user_id: u._id, platform: 'android', token: AND_TOKEN });
    await notificationService.sendPush(String(u._id), 'Reply', 'body', { ticketId: 't1' });
    expect(await Notification.countDocuments({ user_id: u._id })).toBe(1);
    const n = await Notification.findOne({ user_id: u._id });
    expect(n!.data!.ticketId).toBe('t1');
  });

  it('notify() records inbox and does not throw when user missing', async () => {
    await expect(
      notificationService.notify(new mongoose.Types.ObjectId().toString(), 'T', 'B', 'system')
    ).resolves.toBeUndefined();
  });
});

// ── Payload normalization ({type, screen, entityId, data}) ──────
describe('normalizeData', () => {
  it('derives screen from resource_type and entityId from resource_id', () => {
    const d = normalizeData({ type: 'app_status_changed', resource_type: 'application', resource_id: 'app123', data: { deep_link: 'dice://applications/app123' } });
    expect(d.screen).toBe('application');
    expect(d.entityId).toBe('app123');
    expect(d.deep_link).toBe('dice://applications/app123'); // preserved
  });

  it('derives screen from type and entityId from a legacy id key', () => {
    const d = normalizeData({ type: 'ticket_reply', data: { ticketId: 't1' } });
    expect(d.screen).toBe('ticket');
    expect(d.entityId).toBe('t1');
    expect(d.ticketId).toBe('t1'); // original key preserved
  });

  it('certification type maps to certification screen', () => {
    const d = normalizeData({ type: 'cert_issued', resource_type: 'certification', resource_id: 'c9' });
    expect(d.screen).toBe('certification');
    expect(d.entityId).toBe('c9');
  });

  it('explicit screen/entityId in data win over derivation', () => {
    const d = normalizeData({ type: 'app_status_changed', resource_type: 'application', resource_id: 'x', data: { screen: 'RenewalCenter', entityId: 'y' } });
    expect(d.screen).toBe('RenewalCenter');
    expect(d.entityId).toBe('y');
  });

  it('leaves screen/entityId unset when nothing derivable', () => {
    const d = normalizeData({ type: 'weekly_digest', data: {} });
    expect(d.screen).toBeUndefined();
    expect(d.entityId).toBeUndefined();
  });
});

describe('channelForType', () => {
  it('maps compliance / application / default correctly', () => {
    expect(channelForType('cert_expiry_30d')).toBe('compliance');
    expect(channelForType('cert_revoked')).toBe('compliance');
    expect(channelForType('security_alert')).toBe('compliance');
    expect(channelForType('app_status_changed')).toBe('applications');
    expect(channelForType('task_assigned')).toBe('applications');
    expect(channelForType('payment_received')).toBe('default');
    expect(channelForType('weekly_digest')).toBe('default');
  });

  it('buildMessage sets the Android channel_id from the type', () => {
    const gcm = JSON.parse(JSON.parse(buildMessage('android', { title: 'T', body: 'B', type: 'cert_expiry_7d' })).GCM);
    expect(gcm.fcmV1Message.message.android.notification.channel_id).toBe('compliance');
  });

  it('buildMessage carries screen/entityId end-to-end (iOS + Android)', () => {
    const payload = { title: 'T', body: 'B', type: 'app_status_changed', data: normalizeData({ type: 'app_status_changed', resource_type: 'application', resource_id: 'app123' }) };
    const apns = JSON.parse(JSON.parse(buildMessage('ios', payload)).APNS);
    expect(apns.body.screen).toBe('application');
    expect(apns.body.entityId).toBe('app123');
    const gcm = JSON.parse(JSON.parse(buildMessage('android', payload)).GCM);
    expect(gcm.fcmV1Message.message.data.screen).toBe('application');
    expect(gcm.fcmV1Message.message.data.entityId).toBe('app123');
    expect(gcm.fcmV1Message.message.android.notification.channel_id).toBe('applications');
  });
});

// ── Partial multi-device delivery failure ───────────────────────
describe('publishToUser — partial failure', () => {
  it('one dead endpoint does not block the other device', async () => {
    const u = await mkUser();
    const dead = await registerDevice({ user_id: u._id, platform: 'ios', token: IOS_TOKEN });
    const live = await registerDevice({ user_id: u._id, platform: 'android', token: AND_TOKEN });
    mockEndpoints.get(dead.sns_endpoint_arn!)!.enabled = false; // SNS marked it dead

    const r = await publishToUser(u._id, { title: 'T', body: 'B', type: 'app_status_changed' });
    expect(r.sent).toBe(1);   // live device still delivered
    expect(r.failed).toBe(1); // dead device counted
    expect((await Device.findById(dead._id))!.enabled).toBe(false); // cleaned up
    expect((await Device.findById(live._id))!.enabled).toBe(true);  // untouched
  });
});
