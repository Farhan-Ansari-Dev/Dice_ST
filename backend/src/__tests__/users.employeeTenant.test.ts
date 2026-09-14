/**
 * M4 — employee users are ORG-CONFINED for user-management endpoints (baseline).
 *   employee A → own-org user        = ALLOW
 *   employee A → other-org user      = DENY (404, no existence leak)
 *   employee A → own record          = ALLOW
 *   employee A → arbitrary foreign id= DENY
 *   admin / super_admin              = platform-wide (unchanged)
 */
import express from 'express';
import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'test-jwt-secret-for-unit-tests';
let mongoServer: MongoMemoryServer;
let app: express.Application;
const orgA = new Types.ObjectId();
const orgB = new Types.ObjectId();
let empA: string, userA: string, userB: string, admin: string, superAdmin: string;

beforeAll(async () => {
  process.env.JWT_SECRET = JWT_SECRET;
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-unit-tests';
  process.env.NODE_ENV = 'test';
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  const { User } = await import('../models/User');
  const mk = async (role: string, org: Types.ObjectId | undefined, email: string) =>
    String((await User.create({ email, name: role, role: role as any, org_id: org, otp_attempts: 0 }))._id);
  empA = await mk('employee', orgA, 'empA@t.com');
  userA = await mk('client', orgA, 'userA@t.com');
  userB = await mk('client', orgB, 'userB@t.com');
  admin = await mk('admin', undefined, 'admin@t.com');
  superAdmin = await mk('super_admin', undefined, 'sa@t.com');
  app = express();
  app.use(express.json());
  const routes = (await import('../routes/index')).default;
  app.use('/api/v2', routes);
});
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mongoServer.stop();
});

const tok = (id: string, role: string, org?: Types.ObjectId) =>
  jwt.sign({ sub: id, role, org: org ? String(org) : undefined, jti: 'j' + Math.random() }, JWT_SECRET, { expiresIn: '15m' });

describe('M4 — employee org confinement', () => {
  it('PUT own-org user = ALLOW', async () => {
    const r = await request(app).put(`/api/v2/users/${userA}`).set('Authorization', `Bearer ${tok(empA, 'employee', orgA)}`).send({ name: 'Renamed A' });
    expect(r.status).toBe(200);
    expect(r.body.data.name).toBe('Renamed A');
  });
  it('PUT other-org user = DENY (404)', async () => {
    const r = await request(app).put(`/api/v2/users/${userB}`).set('Authorization', `Bearer ${tok(empA, 'employee', orgA)}`).send({ name: 'Hacked B' });
    expect(r.status).toBe(404);
    const { User } = await import('../models/User');
    expect((await User.findById(userB))!.name).not.toBe('Hacked B');
  });
  it('PUT own record = ALLOW', async () => {
    const r = await request(app).put(`/api/v2/users/${empA}`).set('Authorization', `Bearer ${tok(empA, 'employee', orgA)}`).send({ locale: 'en-IN' });
    expect(r.status).toBe(200);
  });
  it('PUT arbitrary foreign id = DENY (404)', async () => {
    const r = await request(app).put(`/api/v2/users/${new Types.ObjectId()}`).set('Authorization', `Bearer ${tok(empA, 'employee', orgA)}`).send({ name: 'x' });
    expect(r.status).toBe(404);
  });
  it('overview own-org = ALLOW, other-org = DENY', async () => {
    expect((await request(app).get(`/api/v2/users/${userA}/overview`).set('Authorization', `Bearer ${tok(empA, 'employee', orgA)}`)).status).toBe(200);
    expect((await request(app).get(`/api/v2/users/${userB}/overview`).set('Authorization', `Bearer ${tok(empA, 'employee', orgA)}`)).status).toBe(404);
  });
  it('list returns ONLY own-org users', async () => {
    const r = await request(app).get('/api/v2/users').set('Authorization', `Bearer ${tok(empA, 'employee', orgA)}`);
    expect(r.status).toBe(200);
    const ids = r.body.data.map((u: any) => String(u._id));
    expect(ids).toContain(userA);
    expect(ids).not.toContain(userB);
  });
  it('admin & super_admin remain platform-wide', async () => {
    expect((await request(app).get(`/api/v2/users/${userB}/overview`).set('Authorization', `Bearer ${tok(admin, 'admin')}`)).status).toBe(200);
    const edit = await request(app).put(`/api/v2/users/${userB}`).set('Authorization', `Bearer ${tok(admin, 'admin')}`).send({ name: 'Admin Renamed B' });
    expect(edit.status).toBe(200);
    expect((await request(app).get(`/api/v2/users/${userA}/overview`).set('Authorization', `Bearer ${tok(superAdmin, 'super_admin')}`)).status).toBe(200);
  });
});
