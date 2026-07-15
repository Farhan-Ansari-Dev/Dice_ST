/**
 * LB-4 regression — mass-assignment / privilege-escalation guard on /users.
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

const tokenFor = (id: string, role: string) =>
  jwt.sign({ sub: id, role, jti: 't-' + Date.now() }, JWT_SECRET, { expiresIn: '15m' });

describe('LB-4 — user role / mass-assignment guard', () => {
  it('employee CANNOT escalate their own role via PUT /users/:id', async () => {
    const emp = await User.create({ email: 'emp@t.com', name: 'Emp', role: 'employee', otp_attempts: 0 });
    const token = tokenFor((emp._id as any).toString(), 'employee');

    const res = await request(app)
      .put(`/api/v1/users/${emp._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Emp Renamed', role: 'super_admin' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Emp Renamed');   // whitelisted field applied
    expect(res.body.data.role).toBe('employee');        // role change dropped
  });

  it('admin CAN change a role via PUT /users/:id', async () => {
    const admin = await User.create({ email: 'a@t.com', name: 'Admin', role: 'admin', otp_attempts: 0 });
    const target = await User.create({ email: 'c@t.com', name: 'Client', role: 'client', otp_attempts: 0 });
    const token = tokenFor((admin._id as any).toString(), 'admin');

    const res = await request(app)
      .put(`/api/v1/users/${target._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'consultant' });

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('consultant');
  });

  it('ignores non-whitelisted fields (deleted_at) on update', async () => {
    const admin = await User.create({ email: 'a2@t.com', name: 'Admin2', role: 'super_admin', otp_attempts: 0 });
    const target = await User.create({ email: 'c2@t.com', name: 'Client2', role: 'client', otp_attempts: 0 });
    const token = tokenFor((admin._id as any).toString(), 'super_admin');

    const res = await request(app)
      .put(`/api/v1/users/${target._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Renamed', deleted_at: new Date().toISOString(), otp_hash: 'injected' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Renamed');
    expect(res.body.data.deleted_at).toBeFalsy();       // soft-delete not settable via update body
  });
});
