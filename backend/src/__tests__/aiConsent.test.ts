/**
 * AI consent — server-enforced third-party AI gate (App Store 5.1.1(i)/5.1.2(i)).
 *
 * These tests never call a real AI provider: the gate rejects unconsented
 * requests BEFORE any provider code runs, and for the consented paths the
 * aiService methods are stubbed with jest spies. No NVIDIA/Gemini/Anthropic
 * network call is ever made.
 *
 * Coverage:
 *   1.  absent record ⇒ not consented / not current
 *   2.  recordAiConsent(accept) ⇒ consented + current, timestamp set
 *   3.  recordAiConsent(decline) ⇒ not consented, declined timestamp set
 *   4.  stale (old-version) consent ⇒ not current
 *   5.  route: /ai/chat without consent ⇒ 403 ai_consent_required, service NOT called
 *   6.  route: /ai/chat with consent ⇒ passes gate, service called (stubbed) ⇒ 200
 *   7.  route: GET /ai/recommendations without consent ⇒ 403
 *   8.  route: /ai/analyze-product-image without consent ⇒ 403 BEFORE the image is read
 *   9.  conditional gate: code-only /hs/validate & /trade/traffic work without consent;
 *       product-text /hs/suggest & /hs/validate require consent
 *   10. defense-in-depth: aiService.chat throws without consent even with no middleware;
 *       indirect analyzeCertifications skips AI without consent, uses it with consent
 *   +   consent API: GET/POST /users/me/ai-consent, own-consent only, input validation
 */
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import {
  AI_CONSENT_VERSION,
  AiConsentRequiredError,
  getAiConsentStatus,
  recordAiConsent,
  hasCurrentAiConsent,
} from '../services/ai/aiConsent';
import { aiService } from '../services/aiService';

let mongoServer: MongoMemoryServer;
let app: express.Application;
const JWT_SECRET = 'test-jwt-secret-for-unit-tests';

beforeAll(async () => {
  process.env.JWT_SECRET = JWT_SECRET;
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-unit-tests';
  process.env.NODE_ENV = 'test';
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  const { errorHandler } = await import('../middleware/errorHandler');
  app = express();
  app.use(express.json());
  const routes = (await import('../routes/index')).default;
  app.use('/api/v2', routes);
  app.use(errorHandler);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(() => {
  jest.restoreAllMocks();
});

const tokenFor = (id: string) =>
  jwt.sign({ sub: id, role: 'client', jti: 't-' + Math.random().toString(36).slice(2) }, JWT_SECRET, {
    expiresIn: '15m',
  });

async function makeUser(overrides: Record<string, any> = {}) {
  return User.create({ email: `u${Math.random().toString(36).slice(2)}@t.com`, name: 'U', role: 'client', otp_attempts: 0, ...overrides });
}

// A user who has accepted the CURRENT AI-consent version.
async function makeConsentedUser() {
  const u = await makeUser();
  await recordAiConsent((u._id as any).toString(), true);
  return u;
}

describe('aiConsent — status & persistence', () => {
  it('1. an absent record means NOT consented and NOT current', async () => {
    const u = await makeUser();
    const status = await getAiConsentStatus((u._id as any).toString());
    expect(status.consented).toBe(false);
    expect(status.is_current).toBe(false);
    expect(status.version).toBeNull();
    expect(status.current_version).toBe(AI_CONSENT_VERSION);
    expect(await hasCurrentAiConsent((u._id as any).toString())).toBe(false);
  });

  it('2. recording acceptance stores consent at the current version with a timestamp', async () => {
    const u = await makeUser();
    const status = await recordAiConsent((u._id as any).toString(), true);
    expect(status.consented).toBe(true);
    expect(status.is_current).toBe(true);
    expect(status.version).toBe(AI_CONSENT_VERSION);
    expect(status.consented_at).toBeInstanceOf(Date);
    expect(await hasCurrentAiConsent((u._id as any).toString())).toBe(true);
  });

  it('3. recording a decline leaves the user NOT consented with a declined timestamp', async () => {
    const u = await makeUser();
    const status = await recordAiConsent((u._id as any).toString(), false);
    expect(status.consented).toBe(false);
    expect(status.is_current).toBe(false);
    expect(status.declined_at).toBeInstanceOf(Date);
    expect(await hasCurrentAiConsent((u._id as any).toString())).toBe(false);
  });

  it('4. a consent recorded at an OLDER version is not treated as current', async () => {
    const u = await makeUser();
    await User.updateOne(
      { _id: u._id },
      { $set: { 'consents.ai': { consented: true, version: '2000-01-01', consented_at: new Date() } } },
    );
    const status = await getAiConsentStatus((u._id as any).toString());
    expect(status.consented).toBe(true);      // they DID consent...
    expect(status.is_current).toBe(false);     // ...but to a stale version ⇒ re-prompt
    expect(await hasCurrentAiConsent((u._id as any).toString())).toBe(false);
  });
});

describe('AI routes — server-side enforcement', () => {
  it('5. POST /ai/chat without consent ⇒ 403 and the AI service is never called', async () => {
    const u = await makeUser();
    const spy = jest.spyOn(aiService, 'chat');
    const res = await request(app)
      .post('/api/v2/ai/chat')
      .set('Authorization', `Bearer ${tokenFor((u._id as any).toString())}`)
      .send({ message: 'hello' });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('ai_consent_required');
    expect(spy).not.toHaveBeenCalled();
  });

  it('6. POST /ai/chat WITH consent passes the gate and reaches the (stubbed) AI service', async () => {
    const u = await makeConsentedUser();
    const spy = jest
      .spyOn(aiService, 'chat')
      .mockResolvedValue({ response: 'stubbed', conversationId: 'c1' });
    const res = await request(app)
      .post('/api/v2/ai/chat')
      .set('Authorization', `Bearer ${tokenFor((u._id as any).toString())}`)
      .send({ message: 'hello' });
    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledWith((u._id as any).toString(), 'hello', undefined);
  });

  it('7. GET /ai/recommendations without consent ⇒ 403', async () => {
    const u = await makeUser();
    const spy = jest.spyOn(aiService, 'getComplianceRecommendations');
    const res = await request(app)
      .get('/api/v2/ai/recommendations')
      .set('Authorization', `Bearer ${tokenFor((u._id as any).toString())}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('ai_consent_required');
    expect(spy).not.toHaveBeenCalled();
  });

  it('8. POST /ai/analyze-product-image without consent ⇒ 403 BEFORE the upload is processed', async () => {
    const u = await makeUser();
    // No image attached: a 403 (not the 400 "missing_image") proves the consent
    // gate runs before multer buffers any product photo.
    const res = await request(app)
      .post('/api/v2/ai/analyze-product-image')
      .set('Authorization', `Bearer ${tokenFor((u._id as any).toString())}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('ai_consent_required');
  });
});

describe('HS / Trade routes — conditional gate (AI only for product-text requests)', () => {
  it('9a. code-only /hs/validate works WITHOUT consent (pure dataset lookup, no AI)', async () => {
    const u = await makeUser();
    const res = await request(app)
      .post('/api/v2/hs/validate')
      .set('Authorization', `Bearer ${tokenFor((u._id as any).toString())}`)
      .send({ code: '8517.13' });
    expect(res.status).not.toBe(403);
    expect(res.status).toBe(200);
  });

  it('9b. product-text /hs/validate REQUIRES consent ⇒ 403', async () => {
    const u = await makeUser();
    const res = await request(app)
      .post('/api/v2/hs/validate')
      .set('Authorization', `Bearer ${tokenFor((u._id as any).toString())}`)
      .send({ productDescription: 'wireless headphones' });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('ai_consent_required');
  });

  it('9c. /hs/suggest always requires consent ⇒ 403 without it', async () => {
    const u = await makeUser();
    const res = await request(app)
      .post('/api/v2/hs/suggest')
      .set('Authorization', `Bearer ${tokenFor((u._id as any).toString())}`)
      .send({ productDescription: 'wireless headphones' });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('ai_consent_required');
  });

  it('9d. code-only /trade/traffic works WITHOUT consent', async () => {
    const u = await makeUser();
    const res = await request(app)
      .post('/api/v2/trade/traffic')
      .set('Authorization', `Bearer ${tokenFor((u._id as any).toString())}`)
      .send({ code: '8517.13' });
    expect(res.status).not.toBe(403);
  });
});

describe('Defense-in-depth — service layer & indirect path', () => {
  it('10a. aiService.chat throws AiConsentRequiredError without consent (non-bypassable)', async () => {
    const u = await makeUser();
    await expect(aiService.chat((u._id as any).toString(), 'hello')).rejects.toBeInstanceOf(
      AiConsentRequiredError,
    );
  });

  it('10b. analyzeCertifications does NOT invoke AI when the user has not consented', async () => {
    const u = await makeUser();
    const spy = jest.spyOn(aiService, 'suggestCertificationsAI').mockResolvedValue([]);
    const result = await aiService.analyzeCertifications('unknown gadget', ['US'], (u._id as any).toString());
    expect(result).toBeDefined();          // the cert flow still works for non-consenters
    expect(spy).not.toHaveBeenCalled();    // ...but the AI suggestion path is skipped
  });

  it('10c. analyzeCertifications DOES use the AI suggestion path once consent is current', async () => {
    const u = await makeConsentedUser();
    const spy = jest.spyOn(aiService, 'suggestCertificationsAI').mockResolvedValue([]);
    await aiService.analyzeCertifications('unknown gadget', ['US'], (u._id as any).toString());
    expect(spy).toHaveBeenCalled();
  });
});

describe('Consent API — /users/me/ai-consent (own consent only)', () => {
  it('GET returns the caller\'s current status', async () => {
    const u = await makeUser();
    const res = await request(app)
      .get('/api/v2/users/me/ai-consent')
      .set('Authorization', `Bearer ${tokenFor((u._id as any).toString())}`);
    expect(res.status).toBe(200);
    expect(res.body.data.consented).toBe(false);
    expect(res.body.data.current_version).toBe(AI_CONSENT_VERSION);
  });

  it('POST { accepted:true } records consent for the AUTHENTICATED user only', async () => {
    const u = await makeUser();
    const res = await request(app)
      .post('/api/v2/users/me/ai-consent')
      .set('Authorization', `Bearer ${tokenFor((u._id as any).toString())}`)
      .send({ accepted: true });
    expect(res.status).toBe(200);
    expect(res.body.data.consented).toBe(true);
    expect(res.body.data.is_current).toBe(true);
    // Persisted against this user — subsequent AI calls are now allowed.
    expect(await hasCurrentAiConsent((u._id as any).toString())).toBe(true);
  });

  it('POST rejects a non-boolean "accepted" with 400 (input validation)', async () => {
    const u = await makeUser();
    const res = await request(app)
      .post('/api/v2/users/me/ai-consent')
      .set('Authorization', `Bearer ${tokenFor((u._id as any).toString())}`)
      .send({ accepted: 'yes' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_request');
  });

  it('both endpoints require authentication ⇒ 401 without a token', async () => {
    const res = await request(app).get('/api/v2/users/me/ai-consent');
    expect(res.status).toBe(401);
  });
});
