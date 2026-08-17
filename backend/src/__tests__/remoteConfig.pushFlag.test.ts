/**
 * RemoteConfig — `enable_push_notifications` flag.
 *
 * The shipped mobile client gates native push registration on
 * featureFlags.enable_push_notifications. This proves the backend schema now
 * carries that exact key, defaults it OFF, and persists true/false so an
 * operator can toggle it via Remote Config.
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('RemoteConfig.featureFlags.enable_push_notifications', () => {
  it('exists in the schema and defaults to false', async () => {
    const { RemoteConfig } = await import('../models/RemoteConfig');
    const cfg = await RemoteConfig.getGlobalConfig();
    // Field is defined on the schema (not stripped) and OFF by default.
    expect(cfg.featureFlags).toHaveProperty('enable_push_notifications');
    expect(cfg.featureFlags.enable_push_notifications).toBe(false);
  });

  it('persists when set to true, then back to false', async () => {
    const { RemoteConfig } = await import('../models/RemoteConfig');
    const cfg = await RemoteConfig.getGlobalConfig();

    cfg.featureFlags.enable_push_notifications = true;
    cfg.markModified('featureFlags');
    await cfg.save();
    let reloaded = await RemoteConfig.findById(cfg._id);
    expect(reloaded!.featureFlags.enable_push_notifications).toBe(true);

    reloaded!.featureFlags.enable_push_notifications = false;
    reloaded!.markModified('featureFlags');
    await reloaded!.save();
    reloaded = await RemoteConfig.findById(cfg._id);
    expect(reloaded!.featureFlags.enable_push_notifications).toBe(false);
  });

  it('does not disturb the unrelated enable_notifications default (true)', async () => {
    const { RemoteConfig } = await import('../models/RemoteConfig');
    const cfg = await RemoteConfig.getGlobalConfig();
    expect(cfg.featureFlags.enable_notifications).toBe(true);
  });
});
