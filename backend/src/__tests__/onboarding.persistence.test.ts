/**
 * Onboarding persistence regression.
 *
 * Guards the root cause behind "new signup lands straight on the dashboard":
 * the User schema had no onboarding fields (Mongoose strict mode silently
 * dropped them) and PUT /users/me whitelisted them out a second time.
 *
 * These cases are the device-independent half of the onboarding matrix —
 * fresh install, reinstall, and login from another device all reduce to
 * "does the server still know this account finished onboarding".
 */
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

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
  app.use('/api/v1', routes);
  app.use(errorHandler);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mongoServer.stop();
});

const tokenFor = (id: string) =>
  jwt.sign({ sub: id, role: 'client', jti: 'ob-' + Math.random() }, JWT_SECRET, { expiresIn: '15m' });

const PROFILE = {
  businessRole: 'manufacturer',
  industries: ['electronics', 'textiles'],
  targetMarkets: ['in', 'ae'],
  interestedCertifications: ['bis_isi'],
  companySize: 'startup',
  businessGoals: ['faster_cert'],
};

describe('onboarding persistence', () => {
  it('a fresh account reports onboarding incomplete', async () => {
    const u = await User.create({ email: 'fresh@t.com', name: 'Fresh', role: 'client', otp_attempts: 0 });

    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${tokenFor((u._id as any).toString())}`);

    expect(res.status).toBe(200);
    expect(res.body.data.isOnboardingComplete).toBe(false);
    expect(res.body.data.onboardingCompletedAt).toBeNull();
  });

  it('PUT /users/me persists every onboarding field and stamps completion', async () => {
    const u = await User.create({ email: 'wizard@t.com', name: 'Wizard', role: 'client', otp_attempts: 0 });
    const token = tokenFor((u._id as any).toString());

    const res = await request(app)
      .put('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send(PROFILE);

    expect(res.status).toBe(200);
    expect(res.body.data.businessRole).toBe('manufacturer');
    expect(res.body.data.industries).toEqual(['electronics', 'textiles']);
    expect(res.body.data.targetMarkets).toEqual(['in', 'ae']);
    expect(res.body.data.interestedCertifications).toEqual(['bis_isi']);
    expect(res.body.data.companySize).toBe('startup');
    expect(res.body.data.businessGoals).toEqual(['faster_cert']);
    expect(res.body.data.isOnboardingComplete).toBe(true);

    // Actually on the document, not just echoed back by the serializer.
    const fromDb = await User.findById(u._id);
    expect(fromDb!.business_role).toBe('manufacturer');
    expect(fromDb!.onboarding_completed_at).toBeInstanceOf(Date);
  });

  it('completion survives a new session — reinstall / another device', async () => {
    const u = await User.create({ email: 'return@t.com', name: 'Return', role: 'client', otp_attempts: 0 });

    await request(app)
      .put('/api/v1/users/me')
      .set('Authorization', `Bearer ${tokenFor((u._id as any).toString())}`)
      .send(PROFILE);

    // A different device = a different token for the same account, no local state.
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${tokenFor((u._id as any).toString())}`);

    expect(res.body.data.isOnboardingComplete).toBe(true);
    expect(res.body.data.businessRole).toBe('manufacturer');
  });

  it('the completion timestamp is stamped once and never moves', async () => {
    const u = await User.create({ email: 'once@t.com', name: 'Once', role: 'client', otp_attempts: 0 });
    const token = tokenFor((u._id as any).toString());

    const first = await request(app)
      .put('/api/v1/users/me').set('Authorization', `Bearer ${token}`).send(PROFILE);
    const stampedAt = first.body.data.onboardingCompletedAt;

    const second = await request(app)
      .put('/api/v1/users/me').set('Authorization', `Bearer ${token}`)
      .send({ ...PROFILE, companySize: 'large' });

    expect(second.body.data.companySize).toBe('large');
    expect(second.body.data.onboardingCompletedAt).toBe(stampedAt);
  });

  it('a partial update does not prematurely mark onboarding complete', async () => {
    const u = await User.create({ email: 'partial@t.com', name: 'Partial', role: 'client', otp_attempts: 0 });

    const res = await request(app)
      .put('/api/v1/users/me')
      .set('Authorization', `Bearer ${tokenFor((u._id as any).toString())}`)
      .send({ businessRole: 'exporter' });   // no companySize — wizard not finished

    expect(res.status).toBe(200);
    expect(res.body.data.businessRole).toBe('exporter');
    expect(res.body.data.isOnboardingComplete).toBe(false);
  });

  it('rejects a non-array for an array field instead of corrupting the document', async () => {
    const u = await User.create({ email: 'bad@t.com', name: 'Bad', role: 'client', otp_attempts: 0 });

    const res = await request(app)
      .put('/api/v1/users/me')
      .set('Authorization', `Bearer ${tokenFor((u._id as any).toString())}`)
      .send({ ...PROFILE, industries: 'electronics' });

    expect(res.status).toBe(400);
    const fromDb = await User.findById(u._id);
    expect(fromDb!.onboarding_completed_at).toBeUndefined();
  });

  it('still refuses privileged fields alongside a valid onboarding payload', async () => {
    const u = await User.create({ email: 'esc@t.com', name: 'Esc', role: 'client', otp_attempts: 0 });

    await request(app)
      .put('/api/v1/users/me')
      .set('Authorization', `Bearer ${tokenFor((u._id as any).toString())}`)
      .send({ ...PROFILE, role: 'super_admin', email_verified_at: new Date() });

    const fromDb = await User.findById(u._id);
    expect(fromDb!.role).toBe('client');
    expect(fromDb!.email_verified_at).toBeUndefined();
  });
});
