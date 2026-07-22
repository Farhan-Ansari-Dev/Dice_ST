/**
 * Phase 0 security regression.
 *
 * The defects this locks down, both live before this change:
 *   1. Provider API keys stored in plaintext in RemoteConfig.aiSettings.apiKey
 *   2. GET /config/admin returned that plaintext key in its response body,
 *      while the public GET /config correctly stripped it
 */
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

import { seal, open, last4 } from '../utils/crypto/secretBox';
import { redactSecrets, findLeakedSecret, REDACTED } from '../utils/redactSecrets';

let mongoServer: MongoMemoryServer;
let app: express.Application;
const JWT_SECRET = 'test-jwt-secret-for-unit-tests';

// A realistically-shaped key — the leak scanner keys off these prefixes.
const FAKE_KEY = 'nvapi-abcdefghijklmnopqrstuvwxyz0123456789ABCD';

beforeAll(async () => {
  process.env.JWT_SECRET = JWT_SECRET;
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-unit-tests';
  process.env.NODE_ENV = 'test';
  process.env.CONFIG_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  const { errorHandler } = await import('../middleware/errorHandler');
  app = express();
  app.use(express.json());
  const routes = (await import('../routes/index')).default;
  app.use('/api/v1', routes);
  app.use(errorHandler);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mongoServer.stop();
});

const tokenFor = (id: string, role: string) =>
  jwt.sign({ sub: id, role, jti: 'sec-' + Math.random() }, JWT_SECRET, { expiresIn: '15m' });

async function adminToken(role: 'admin' | 'super_admin' = 'super_admin') {
  const { User } = await import('../models/User');
  const u = await User.create({
    email: `${role}-${Date.now()}@t.com`, name: 'Admin', role, otp_attempts: 0,
  });
  return tokenFor((u._id as any).toString(), role);
}

describe('secretBox — authenticated encryption', () => {
  it('round-trips a secret', () => {
    const sealed = seal(FAKE_KEY);
    expect(open(sealed)).toBe(FAKE_KEY);
  });

  it('never stores the plaintext in the ciphertext', () => {
    const sealed = seal(FAKE_KEY);
    expect(sealed.ciphertext.toString('utf8')).not.toContain(FAKE_KEY);
    expect(sealed.ciphertext.toString('base64')).not.toContain(FAKE_KEY);
  });

  it('uses a unique IV per encryption, so identical keys differ on disk', () => {
    const a = seal(FAKE_KEY);
    const b = seal(FAKE_KEY);
    expect(a.iv.equals(b.iv)).toBe(false);
    expect(a.ciphertext.equals(b.ciphertext)).toBe(false);
  });

  it('rejects a tampered ciphertext rather than returning garbage', () => {
    const sealed = seal(FAKE_KEY);
    sealed.ciphertext[0] ^= 0xff;
    expect(() => open(sealed)).toThrow();
  });

  it('rejects a tampered auth tag', () => {
    const sealed = seal(FAKE_KEY);
    sealed.authTag[0] ^= 0xff;
    expect(() => open(sealed)).toThrow();
  });

  it('cannot decrypt with a different master key', () => {
    const sealed = seal(FAKE_KEY);
    const original = process.env.CONFIG_ENCRYPTION_KEY;
    process.env.CONFIG_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
    expect(() => open(sealed)).toThrow();
    process.env.CONFIG_ENCRYPTION_KEY = original;
  });

  it('refuses to encrypt an empty secret', () => {
    expect(() => seal('')).toThrow();
  });

  it('last4 never reveals enough to reconstruct the key', () => {
    expect(last4(FAKE_KEY)).toBe('ABCD');
    expect(last4(FAKE_KEY).length).toBe(4);
  });
});

describe('redactSecrets', () => {
  it('masks secret fields at any depth', () => {
    const out: any = redactSecrets({
      a: { b: { apiKey: FAKE_KEY, keep: 'visible' } },
      list: [{ password: 'hunter2' }],
    });
    expect(out.a.b.apiKey).toBe(REDACTED);
    expect(out.a.b.keep).toBe('visible');
    expect(out.list[0].password).toBe(REDACTED);
  });

  it('preserves empty values so "not set" stays distinguishable from "set"', () => {
    const out: any = redactSecrets({ apiKey: '' });
    expect(out.apiKey).toBe('');
  });

  it('survives cyclic structures', () => {
    const cyclic: any = { apiKey: FAKE_KEY };
    cyclic.self = cyclic;
    expect(() => redactSecrets(cyclic)).not.toThrow();
  });

  it('detects credential-shaped strings anywhere in a payload', () => {
    expect(findLeakedSecret({ nested: { note: `key is ${FAKE_KEY}` } })).toBeTruthy();
    expect(findLeakedSecret({ ok: 'nothing sensitive here' })).toBeNull();
  });

  it('recognises every provider key shape we accept', () => {
    expect(findLeakedSecret({ k: 'sk-abcdefghijklmnopqrstuvwx' })).toBeTruthy();
    expect(findLeakedSecret({ k: 'sk-ant-abcdefghijklmnopqrstuvwx' })).toBeTruthy();
    expect(findLeakedSecret({ k: 'AIzaSyAbcdefghijklmnopqrstuvwxyz01234567' })).toBeTruthy();
    expect(findLeakedSecret({ k: 'AKIAIOSFODNN7EXAMPLE' })).toBeTruthy();
  });
});

describe('config routes — no plaintext key may escape', () => {
  it('GET /config/admin does not return the legacy plaintext key', async () => {
    const { RemoteConfig } = await import('../models/RemoteConfig');
    const config = await RemoteConfig.getGlobalConfig();
    config.aiSettings.apiKey = FAKE_KEY;      // simulate a pre-migration deployment
    await config.save();

    const res = await request(app)
      .get('/api/v1/remote-config/admin')
      .set('Authorization', `Bearer ${await adminToken('admin')}`);

    expect(res.status).toBe(200);
    expect(findLeakedSecret(res.body)).toBeNull();
    expect(JSON.stringify(res.body)).not.toContain(FAKE_KEY);
    expect(res.body.data.aiSettings.apiKey).toBe(REDACTED);
  });

  it('public GET /config still strips the key', async () => {
    const res = await request(app).get('/api/v1/remote-config');
    expect(res.status).toBe(200);
    expect(findLeakedSecret(res.body)).toBeNull();
    expect(JSON.stringify(res.body)).not.toContain(FAKE_KEY);
  });

  it('PUT /config/admin diverts a posted key into encrypted storage', async () => {
    const { RemoteConfig } = await import('../models/RemoteConfig');
    const { AIProviderCredential } = await import('../models/AIProviderCredential');

    const res = await request(app)
      .put('/api/v1/remote-config/admin')
      .set('Authorization', `Bearer ${await adminToken('super_admin')}`)
      .send({ aiSettings: { provider: 'openai', model: 'gpt-4o', apiKey: FAKE_KEY } });

    expect(res.status).toBe(200);
    expect(findLeakedSecret(res.body)).toBeNull();

    // Provider/model still applied — Remote Config behaviour is unchanged.
    const config = await RemoteConfig.getGlobalConfig();
    expect(config.aiSettings.provider).toBe('openai');
    expect(config.aiSettings.model).toBe('gpt-4o');
    // ...but the key is no longer sitting in plaintext.
    expect(config.aiSettings.apiKey).toBe('');

    const cred = await AIProviderCredential.findOne({ provider: 'openai' }).lean();
    expect(cred).toBeTruthy();
    expect(cred!.last4).toBe('ABCD');
    expect(Buffer.from(cred!.ciphertext).toString('utf8')).not.toContain(FAKE_KEY);
  });

  it('credential status reports presence without the value', async () => {
    const res = await request(app)
      .get('/api/v1/remote-config/admin/ai/credentials')
      .set('Authorization', `Bearer ${await adminToken('admin')}`);

    expect(res.status).toBe(200);
    expect(findLeakedSecret(res.body)).toBeNull();

    const openaiEntry = res.body.data.providers.find((p: any) => p.provider === 'openai');
    expect(openaiEntry.present).toBe(true);
    expect(openaiEntry.last4).toBe('ABCD');
    expect(openaiEntry).not.toHaveProperty('apiKey');
  });

  it('rotating a key requires super_admin', async () => {
    const res = await request(app)
      .put('/api/v1/remote-config/admin/ai/credentials/nvidia')
      .set('Authorization', `Bearer ${await adminToken('admin')}`)
      .send({ apiKey: FAKE_KEY });

    expect(res.status).toBe(403);
  });

  it('rejects an unknown provider', async () => {
    const res = await request(app)
      .put('/api/v1/remote-config/admin/ai/credentials/notaprovider')
      .set('Authorization', `Bearer ${await adminToken('super_admin')}`)
      .send({ apiKey: FAKE_KEY });

    expect(res.status).toBe(400);
  });

  it('an anonymous caller cannot reach any credential route', async () => {
    expect((await request(app).get('/api/v1/remote-config/admin/ai/credentials')).status).toBe(401);
    expect((await request(app).put('/api/v1/remote-config/admin/ai/credentials/nvidia').send({ apiKey: FAKE_KEY })).status).toBe(401);
  });
});

describe('credentialService resolution', () => {
  it('prefers the encrypted credential over the legacy plaintext field', async () => {
    const { RemoteConfig } = await import('../models/RemoteConfig');
    const { setProviderKey, getProviderKey } = await import('../services/ai/credentialService');

    const config = await RemoteConfig.getGlobalConfig();
    config.aiSettings.provider = 'nvidia';
    config.aiSettings.apiKey = 'nvapi-LEGACYlegacylegacylegacy123456';
    await config.save();

    await setProviderKey('nvidia', FAKE_KEY);
    expect(await getProviderKey('nvidia')).toBe(FAKE_KEY);
  });

  it('falls back to the legacy plaintext key when nothing is encrypted yet', async () => {
    const { RemoteConfig } = await import('../models/RemoteConfig');
    const { deleteProviderKey, getProviderKey } = await import('../services/ai/credentialService');

    await deleteProviderKey('nvidia');
    const config = await RemoteConfig.getGlobalConfig();
    config.aiSettings.provider = 'nvidia';
    config.aiSettings.apiKey = 'nvapi-LEGACYlegacylegacylegacy123456';
    await config.save();

    expect(await getProviderKey('nvidia')).toBe('nvapi-LEGACYlegacylegacylegacy123456');
  });

  it('falls back to the environment when neither store has a key', async () => {
    const { RemoteConfig } = await import('../models/RemoteConfig');
    const { deleteProviderKey, getProviderKey } = await import('../services/ai/credentialService');

    await deleteProviderKey('claude');
    const config = await RemoteConfig.getGlobalConfig();
    config.aiSettings.apiKey = '';
    await config.save();

    process.env.ANTHROPIC_API_KEY = 'sk-ant-envkeyenvkeyenvkeyenvkey12';
    expect(await getProviderKey('claude')).toBe('sk-ant-envkeyenvkeyenvkeyenvkey12');
    delete process.env.ANTHROPIC_API_KEY;
  });

  it('returns null when no key exists anywhere', async () => {
    const { deleteProviderKey, getProviderKey } = await import('../services/ai/credentialService');
    await deleteProviderKey('gemini');
    expect(await getProviderKey('gemini')).toBeNull();
  });
});
