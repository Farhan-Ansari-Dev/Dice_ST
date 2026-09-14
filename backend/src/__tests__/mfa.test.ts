/**
 * MFA (TOTP) — RFC vectors, enrollment, login enforcement across all login
 * routes, no-bypass (enroll token + alternate route), mandatory bootstrap,
 * and ordinary-customer login unaffected. No secrets/codes logged.
 */
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { totp, verifyTotp, hotp, base32Encode } from '../utils/totp';

const JWT_SECRET = 'test-jwt-secret-for-unit-tests';
let mongoServer: MongoMemoryServer;
let app: express.Application;

beforeAll(async () => {
  process.env.JWT_SECRET = JWT_SECRET;
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-unit-tests';
  process.env.NODE_ENV = 'test';
  process.env.CONFIG_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
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
afterEach(() => { delete process.env.ADMIN_MFA_MANDATORY; });

describe('TOTP primitive (RFC 6238 vectors)', () => {
  const secret = Buffer.from('12345678901234567890', 'ascii');
  const at = (t: number, d: number) => hotp(secret, Math.floor(t / 30), d);
  it('matches published vectors', () => {
    expect(at(59, 8)).toBe('94287082');
    expect(at(1111111109, 8)).toBe('07081804');
    expect(at(2000000000, 8)).toBe('69279037');
  });
  it('verifyTotp accepts fresh, rejects wrong', () => {
    const b32 = base32Encode(Buffer.from('hello-secret-1234'));
    expect(verifyTotp(b32, totp(b32))).toBe(true);
    expect(verifyTotp(b32, '000000')).toBe(false);
  });
});

async function createUser(role: string, email: string): Promise<any> {
  const { User } = await import('../models/User');
  return User.create({ email, name: role, role: role as any, otp_attempts: 0 });
}
async function loginOtp(email: string, extra: any = {}) {
  const { User } = await import('../models/User');
  const crypto = await import('crypto');
  const otp = '424242';
  const hash = crypto.createHash('sha256').update(otp + process.env.JWT_SECRET).digest('hex');
  await User.updateOne({ email }, { $set: { otp_hash: hash, otp_expires_at: new Date(Date.now() + 6e5), otp_attempts: 0 } });
  return request(app).post('/api/v2/auth/verify-otp').send({ email, otp, ...extra });
}
async function currentCodeFor(userId: string) {
  const { User } = await import('../models/User');
  const { open } = await import('../utils/crypto/secretBox');
  const u: any = await User.findById(userId).select('+totp_secret');
  const [, ver, iv, tag, ct] = u.totp_secret.split(':');
  const secret = open({ keyVersion: Number(ver), iv: Buffer.from(iv, 'base64'), authTag: Buffer.from(tag, 'base64'), ciphertext: Buffer.from(ct, 'base64') });
  return totp(secret);
}

describe('MFA enrollment + login enforcement', () => {
  it('customer with MFA DISABLED logs in normally', async () => {
    await createUser('client', 'cust@t.com');
    const res = await loginOtp('cust@t.com');
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
  });

  it('full flow: setup → enable → login now requires code (missing/incorrect/correct)', async () => {
    const admin = await createUser('admin', 'adm1@t.com');
    const login = await loginOtp('adm1@t.com');
    const token = login.body.data.accessToken;

    const setup = await request(app).post('/api/v2/mfa/setup').set('Authorization', `Bearer ${token}`).send({});
    expect(setup.status).toBe(200);
    expect(setup.body.data.otpauthUri).toMatch(/^otpauth:\/\/totp\//);

    const enable = await request(app).post('/api/v2/mfa/enable').set('Authorization', `Bearer ${token}`).send({ code: await currentCodeFor(String(admin._id)) });
    expect(enable.status).toBe(200);
    expect(enable.body.data.accessToken).toBeTruthy();

    expect((await loginOtp('adm1@t.com')).body.error).toBe('mfa_required');
    expect((await loginOtp('adm1@t.com', { totp_code: '000000' })).body.error).toBe('invalid_mfa');
    const good = await loginOtp('adm1@t.com', { totp_code: await currentCodeFor(String(admin._id)) });
    expect(good.status).toBe(200);
    expect(good.body.data.accessToken).toBeTruthy();
  });

  it('no bypass via Google when MFA enabled', async () => {
    const admin = await createUser('admin', 'adm2@t.com');
    const { setupMfa, enableMfa } = await import('../services/mfaService');
    await setupMfa(String(admin._id), 'adm2@t.com');
    await enableMfa(String(admin._id), await currentCodeFor(String(admin._id)));
    const { OAuth2Client } = await import('google-auth-library');
    jest.spyOn(OAuth2Client.prototype as any, 'verifyIdToken').mockResolvedValue({ getPayload: () => ({ email: 'adm2@t.com', name: 'A2' }) } as any);
    const res = await request(app).post('/api/v2/auth/google').send({ idToken: 'x' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('mfa_required');
    (OAuth2Client.prototype as any).verifyIdToken.mockRestore?.();
  });

  it('enroll token cannot reach protected routes but CAN drive enrollment', async () => {
    const admin = await createUser('super_admin', 'adm3@t.com');
    const { issueEnrollToken } = await import('../middleware/authMongo');
    const enrollToken = issueEnrollToken(admin as any);
    const protectedRes = await request(app).get('/api/v2/users/me').set('Authorization', `Bearer ${enrollToken}`);
    expect(protectedRes.status).toBe(401);
    expect(protectedRes.body.error).toBe('insufficient_scope');
    const setup = await request(app).post('/api/v2/mfa/setup').set('Authorization', `Bearer ${enrollToken}`).send({});
    expect(setup.status).toBe(200);
  });

  it('mandatory mode: unenrolled admin blocked at login + gets enroll token → bootstrap', async () => {
    process.env.ADMIN_MFA_MANDATORY = 'true';
    const admin = await createUser('admin', 'adm4@t.com');
    const res = await loginOtp('adm4@t.com');
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('mfa_enrollment_required');
    expect(res.body.enrollToken).toBeTruthy();
    await request(app).post('/api/v2/mfa/setup').set('Authorization', `Bearer ${res.body.enrollToken}`).send({});
    const enable = await request(app).post('/api/v2/mfa/enable').set('Authorization', `Bearer ${res.body.enrollToken}`).send({ code: await currentCodeFor(String(admin._id)) });
    expect(enable.status).toBe(200);
    expect(enable.body.data.accessToken).toBeTruthy();
  });

  it('mandatory mode does NOT affect ordinary customers', async () => {
    process.env.ADMIN_MFA_MANDATORY = 'true';
    await createUser('client', 'cust2@t.com');
    const res = await loginOtp('cust2@t.com');
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
  });
});
