/**
 * M3 — account/staff enumeration resistance. Admin-portal send-otp and verify-otp
 * must not reveal whether an email exists or whether it belongs to staff.
 */
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer;
let app: express.Application;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-unit-tests';
  process.env.NODE_ENV = 'test'; // not 'development' → no console-delivery divergence
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  const { User } = await import('../models/User');
  await User.create({ email: 'staff@t.com', name: 'Staff', role: 'admin', otp_attempts: 0 });
  await User.create({ email: 'plainclient@t.com', name: 'C', role: 'client', otp_attempts: 0 });
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

const sendOtp = (email: string, admin: boolean) =>
  request(app).post('/api/v2/auth/send-otp').send({ email, ...(admin ? { is_admin_portal: true } : {}) });

describe('M3 — admin-portal send-otp does not reveal existence or role', () => {
  it('unknown, non-staff, and staff emails return an identical response', async () => {
    const unknown = await sendOtp('nobody-xyz@t.com', true);
    const nonStaff = await sendOtp('plainclient@t.com', true);
    const staff = await sendOtp('staff@t.com', true);
    const expected = {
      success: true, delivered_via: 'email', delivery_confirmed: true,
      message: 'If an eligible account exists for this email, a verification code has been sent.',
    };
    for (const r of [unknown, nonStaff, staff]) {
      expect(r.status).toBe(200);
      expect(r.body).toEqual(expected);
    }
  });
  it('does NOT create an account for an unknown admin-portal email', async () => {
    const { User } = await import('../models/User');
    await sendOtp('should-not-exist@t.com', true);
    expect(await User.findOne({ email: 'should-not-exist@t.com' })).toBeNull();
  });
});

describe('M3 — verify-otp does not reveal whether an email is registered', () => {
  it('unknown email and known-but-no-active-code return the same response', async () => {
    const unknown = await request(app).post('/api/v2/auth/verify-otp').send({ email: 'ghost@t.com', otp: '123456' });
    const knownNoCode = await request(app).post('/api/v2/auth/verify-otp').send({ email: 'plainclient@t.com', otp: '123456' });
    expect(unknown.status).toBe(401);
    expect(knownNoCode.status).toBe(401);
    expect(unknown.body.error).toBe('otp_expired');
    expect(knownNoCode.body.error).toBe('otp_expired');
  });
});
