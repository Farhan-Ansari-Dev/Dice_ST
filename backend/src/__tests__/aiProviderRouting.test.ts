/**
 * AI provider routing contract.
 *
 * Guarantees the property the product depends on: adding ONE provider key in
 * the Admin Panel makes every AI feature work, with no code change, no
 * redeploy, and no restart.
 *
 * Also locks in that no AI endpoint may ever return fabricated compliance data
 * when a provider is missing — the defect these tests replaced.
 */
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

import { PROVIDERS, PROVIDER_LIST, isKnownProvider, isProviderAllowedHere } from '../services/ai/providerRegistry';

let mongoServer: MongoMemoryServer;
let app: express.Application;
const JWT_SECRET = 'test-jwt-secret-for-unit-tests';

beforeAll(async () => {
  process.env.JWT_SECRET = JWT_SECRET;
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-unit-tests';
  process.env.NODE_ENV = 'test';
  process.env.CONFIG_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
  // Ensure no ambient key leaks into these tests.
  delete process.env.NVIDIA_API_KEY;
  delete process.env.OPENAI_API_KEY;

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

const tokenFor = (id: string, role = 'client') =>
  jwt.sign({ sub: id, role, jti: 'ai-' + Math.random() }, JWT_SECRET, { expiresIn: '15m' });

async function clientToken() {
  const { User } = await import('../models/User');
  const u = await User.create({ email: `ai-${Date.now()}-${Math.random()}@t.com`, name: 'AI', role: 'client', otp_attempts: 0 });
  return tokenFor((u._id as any).toString());
}

async function setProvider(provider: string, extra: Record<string, unknown> = {}) {
  const { RemoteConfig } = await import('../models/RemoteConfig');
  const config = await RemoteConfig.getGlobalConfig();
  config.aiSettings = { ...config.aiSettings, provider, apiKey: '', ...extra } as any;
  await config.save();
}

describe('provider registry', () => {
  it('every provider declares a chat model and a reachable configuration', () => {
    for (const name of PROVIDER_LIST) {
      const spec = PROVIDERS[name];
      expect(spec.defaultChatModel).toBeTruthy();
      expect(typeof spec.requiresKey).toBe('boolean');
      // Either a base URL, or the OpenAI SDK default (openai/azure).
      if (!['openai', 'azure'].includes(name)) {
        expect(spec.baseUrl).toBeTruthy();
      }
    }
  });

  it('supports every provider the admin panel offers', () => {
    for (const name of ['nvidia', 'openai', 'gemini', 'claude', 'azure', 'ollama']) {
      expect(isKnownProvider(name)).toBe(true);
    }
    expect(isKnownProvider('copilot')).toBe(false);
  });

  it('providers that can do vision declare a vision model', () => {
    // The Product Quality Analyzer depends on this being resolvable per provider.
    for (const name of ['nvidia', 'openai', 'gemini', 'claude'] as const) {
      expect(PROVIDERS[name].defaultVisionModel).toBeTruthy();
    }
  });

  it('Ollama is blocked in production and allowed outside it', () => {
    const original = process.env.NODE_ENV;

    process.env.NODE_ENV = 'production';
    expect(isProviderAllowedHere('ollama')).toBe(false);
    expect(isProviderAllowedHere('nvidia')).toBe(true);

    process.env.NODE_ENV = 'development';
    expect(isProviderAllowedHere('ollama')).toBe(true);

    process.env.NODE_ENV = original;
  });
});

describe('no provider configured — every AI endpoint fails honestly', () => {
  /** [label, method, path, body] */
  const ENDPOINTS: Array<[string, 'post' | 'get', string, any]> = [
    ['chat',                   'post', '/api/v1/ai/chat',                   { message: 'hello' }],
    ['ask',                    'post', '/api/v1/ai/ask',                    { question: 'hello' }],
    ['analyze-document',       'post', '/api/v1/ai/analyze-document',       { text: 'some document text' }],
    ['analyze-hs-code',        'post', '/api/v1/ai/analyze-hs-code',        { hsCode: '8517' }],
    ['analyze-risks',          'post', '/api/v1/ai/analyze-risks',          { context: 'electronics to EU' }],
    ['analyze-certifications', 'post', '/api/v1/ai/analyze-certifications', { productName: 'speaker', markets: ['IN'] }],
    ['recommendations',        'get',  '/api/v1/ai/recommendations',        undefined],
  ];

  it.each(ENDPOINTS)('%s returns 503 ai_unavailable, not fabricated data', async (_label, method, path, body) => {
    await setProvider('nvidia');
    const token = await clientToken();

    const req = request(app)[method](path).set('Authorization', `Bearer ${token}`);
    const res = body ? await req.send(body) : await req;

    expect(res.status).toBe(503);
    expect(res.body.error).toBe('ai_unavailable');
    expect(res.body.message).toMatch(/not configured|could not be reached/i);
  });

  it('never emits the previously fabricated trade analysis', async () => {
    await setProvider('nvidia');
    const token = await clientToken();
    const res = await request(app)
      .post('/api/v1/ai/analyze-hs-code')
      .set('Authorization', `Bearer ${token}`)
      .send({ hsCode: '8517' });

    const body = JSON.stringify(res.body);
    expect(body).not.toMatch(/10% - 15%/);
    expect(body).not.toMatch(/USA, EU/);
    expect(body).not.toMatch(/"demand"/);
  });

  it('never emits invented certification codes', async () => {
    await setProvider('nvidia');
    const token = await clientToken();
    const res = await request(app)
      .post('/api/v1/ai/analyze-certifications')
      .set('Authorization', `Bearer ${token}`)
      .send({ productName: 'wireless speaker', markets: ['IN', 'AE'] });

    const body = JSON.stringify(res.body);
    expect(body).not.toMatch(/COMP_/);
    expect(body).not.toMatch(/General Compliance/);
    expect(body).not.toMatch(/"certifications"/);
  });

  it('does not write a fake assistant turn into conversation history', async () => {
    const { AIConversation } = await import('../models/AIConversation');
    await setProvider('nvidia');
    const token = await clientToken();

    const before = await AIConversation.countDocuments();
    await request(app).post('/api/v1/ai/chat').set('Authorization', `Bearer ${token}`).send({ message: 'hi' });
    const after = await AIConversation.countDocuments();

    // The old offlineFallback persisted a canned assistant message.
    expect(after).toBe(before);
  });
});

describe('provider switching from Remote Config', () => {
  it('an unknown provider falls back to a supported one instead of crashing', async () => {
    await setProvider('copilot');
    const token = await clientToken();
    const res = await request(app)
      .post('/api/v1/ai/chat').set('Authorization', `Bearer ${token}`).send({ message: 'hi' });

    // Still a clean 503, not a 500.
    expect(res.status).toBe(503);
  });

  it('switching provider takes effect on the next request, with no restart', async () => {
    const { getAIClientAndModel } = await import('../services/aiService');

    await setProvider('openai', { model: '' });
    const a = await getAIClientAndModel();
    expect(a.provider).toBe('openai');
    expect(a.model).toBe(PROVIDERS.openai.defaultChatModel);

    await setProvider('gemini', { model: '' });
    const b = await getAIClientAndModel();
    expect(b.provider).toBe('gemini');
    expect(b.model).toBe(PROVIDERS.gemini.defaultChatModel);
  });

  it('an explicitly configured model wins over the provider default', async () => {
    const { getAIClientAndModel } = await import('../services/aiService');
    await setProvider('openai', { model: 'gpt-4o' });
    const resolved = await getAIClientAndModel();
    expect(resolved.model).toBe('gpt-4o');
  });

  it('vision resolves its own model, not the chat model', async () => {
    const { getAIClientAndModel } = await import('../services/aiService');
    await setProvider('nvidia', { model: 'meta/llama-3.3-70b-instruct', visionModel: '' });

    const chat = await getAIClientAndModel(undefined, 'chat');
    const vision = await getAIClientAndModel(undefined, 'vision');

    expect(chat.model).toBe('meta/llama-3.3-70b-instruct');
    expect(vision.model).toBe(PROVIDERS.nvidia.defaultVisionModel);
    expect(vision.model).not.toBe(chat.model);
  });

  it('a configured vision model overrides the provider default', async () => {
    const { getAIClientAndModel } = await import('../services/aiService');
    await setProvider('openai', { visionModel: 'gpt-4o-2024-11-20' });
    const vision = await getAIClientAndModel(undefined, 'vision');
    expect(vision.model).toBe('gpt-4o-2024-11-20');
  });
});

describe('one key switches everything on', () => {
  it('storing a key via the credential store makes the client resolve for every capability', async () => {
    const { setProviderKey, deleteProviderKey } = await import('../services/ai/credentialService');
    const { getAIClientAndModel } = await import('../services/aiService');

    await setProvider('openai', { model: '', visionModel: '' });

    // Before: no client.
    await deleteProviderKey('openai');
    expect((await getAIClientAndModel()).openai).toBeNull();

    // After: chat AND vision both resolve, from the same single key.
    await setProviderKey('openai', 'sk-test-key-for-routing-contract-000000');
    expect((await getAIClientAndModel(undefined, 'chat')).openai).not.toBeNull();
    expect((await getAIClientAndModel(undefined, 'vision')).openai).not.toBeNull();

    await deleteProviderKey('openai');
  });

  it('the key is scoped to its provider — switching provider requires that provider key', async () => {
    const { setProviderKey, deleteProviderKey } = await import('../services/ai/credentialService');
    const { getAIClientAndModel } = await import('../services/aiService');

    await setProviderKey('openai', 'sk-test-key-for-routing-contract-000000');

    await setProvider('openai');
    expect((await getAIClientAndModel()).openai).not.toBeNull();

    await setProvider('gemini');
    expect((await getAIClientAndModel()).openai).toBeNull();

    await deleteProviderKey('openai');
  });

  it('Ollama needs no key, since a local server is typically unauthenticated', async () => {
    const { getAIClientAndModel } = await import('../services/aiService');
    await setProvider('ollama');
    const resolved = await getAIClientAndModel();
    expect(resolved.openai).not.toBeNull();
    expect(resolved.provider).toBe('ollama');
  });
});

describe('production does not depend on backend .env keys', () => {
  it('an environment key is ignored in production', async () => {
    const { getProviderKey } = await import('../services/ai/credentialService');
    const original = process.env.NODE_ENV;

    process.env.OPENAI_API_KEY = 'sk-env-key-that-must-not-be-used-000';

    process.env.NODE_ENV = 'production';
    expect(await getProviderKey('openai')).toBeNull();

    process.env.NODE_ENV = 'development';
    expect(await getProviderKey('openai')).toBe('sk-env-key-that-must-not-be-used-000');

    delete process.env.OPENAI_API_KEY;
    process.env.NODE_ENV = original;
  });

  it('placeholder env values are treated as absent', async () => {
    const { getProviderKey } = await import('../services/ai/credentialService');
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    // This exact value ships in backend/.env and produced an opaque 401.
    process.env.OPENAI_API_KEY = 'sk-your-api-key-here';
    expect(await getProviderKey('openai')).toBeNull();

    delete process.env.OPENAI_API_KEY;
    process.env.NODE_ENV = original;
  });
});
