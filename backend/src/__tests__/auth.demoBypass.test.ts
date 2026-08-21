/**
 * App Review demo-account regression.
 *
 * This test does NOT modify authentication — it LOCKS the existing behavior the
 * Apple reviewer depends on: the allowlisted demo email can sign in with the
 * fixed REVIEW_DEMO_OTP and reach a normal `client` account.
 *
 *   POST /auth/verify-otp { email: <REVIEW_DEMO_EMAIL>, otp: <REVIEW_DEMO_OTP> }
 *   → 200, success: true, role: client
 *
 * It also asserts the bypass is tightly scoped: a DIFFERENT email with the same
 * OTP is rejected. If this ever fails, the HS work must not ship.
 */
import express from 'express';
import request from 'supertest';
import { setupTestDB, teardownTestDB } from './setup';
import { User } from '../models/User';

const DEMO_EMAIL = 'test.dice@sanyogconformity.com';
const DEMO_OTP = '123456';

let app: express.Application;

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-unit-tests';
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';
  process.env.REVIEW_DEMO_EMAIL = DEMO_EMAIL;
  process.env.REVIEW_DEMO_OTP = DEMO_OTP;

  await setupTestDB();

  // The demo account is a normal client user (no OTP state — the bypass path
  // must not require a live emailed code).
  await User.create({ email: DEMO_EMAIL, name: 'Apple Review Demo', role: 'client' });

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const authRoutes = require('../routes/v2/auth').default;
  app = express();
  app.use(express.json());
  app.use('/auth', authRoutes);
});

afterAll(async () => {
  await teardownTestDB();
});

describe('App Review demo bypass', () => {
  it('demo email + demo OTP → 200 success, role client', async () => {
    const res = await request(app)
      .post('/auth/verify-otp')
      .send({ email: DEMO_EMAIL, otp: DEMO_OTP });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data?.user?.role).toBe('client');
    expect(res.body.data?.accessToken).toBeTruthy();
  });

  it('is scoped: a different email with the demo OTP is rejected', async () => {
    await User.create({ email: 'someone.else@example.com', name: 'Other', role: 'client' });
    const res = await request(app)
      .post('/auth/verify-otp')
      .send({ email: 'someone.else@example.com', otp: DEMO_OTP });

    expect(res.status).not.toBe(200);
  });
});
