/**
 * /analytics authorization — only admin/super_admin get platform-wide data.
 * Regression guard for the org-less over-match: a non-client, non-admin role
 * with no org_id must NOT match every org-less record (it previously did via
 * { org_id: undefined }). Client behavior is preserved (own-scoped).
 */
import express from 'express';
import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Application } from '../models/Application';

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

const tokenFor = (id: string, role: string, org?: string) =>
  jwt.sign({ sub: id, role, org, jti: 'a-' + Math.random() }, JWT_SECRET, { expiresIn: '15m' });
const mkUser = (role: string, extra: Record<string, any> = {}): Promise<any> =>
  User.create({ email: `${role}-${Math.random().toString(36).slice(2)}@t.com`, name: role, role, otp_attempts: 0, ...extra } as any);
const mkApp = (over: Record<string, any>): Promise<any> =>
  Application.create({ application_number: 'APP-' + Math.random().toString(36).slice(2), cert_type: 'BIS', status: 'submitted', created_by: new Types.ObjectId(), ...over } as any);

const overview = (token: string) =>
  request(app).get('/api/v2/analytics/overview').set('Authorization', `Bearer ${token}`);

describe('/analytics/overview authorization scope', () => {
  it('admin sees platform-wide pending applications', async () => {
    const admin = await mkUser('admin');
    await mkApp({}); await mkApp({}); // two org-less platform applications
    const res = await overview(tokenFor((admin._id as any).toString(), 'admin'));
    expect(res.status).toBe(200);
    expect(res.body.data.pending_applications).toBeGreaterThanOrEqual(2);
  });

  it('a cb/lab/ib user WITHOUT org_id gets NO platform-wide data (no org_id:undefined match-all)', async () => {
    // platform data exists (org-less apps from the admin test may be cleared per-file;
    // create fresh to be explicit)
    await mkApp({}); await mkApp({});
    const cb = await mkUser('cb'); // no org_id
    const res = await overview(tokenFor((cb._id as any).toString(), 'cb'));
    expect(res.status).toBe(200);
    expect(res.body.data.pending_applications).toBe(0);        // must NOT see platform apps
    expect(res.body.data.total_certifications).toBe(0);
  });

  it('employee is scoped to their organization, not platform-wide', async () => {
    const orgId = new Types.ObjectId();
    const emp = await mkUser('employee', { org_id: orgId });
    await mkApp({ org_id: orgId });   // one app in the employee's org
    await mkApp({}); await mkApp({}); // org-less platform apps — must be excluded
    const res = await overview(tokenFor((emp._id as any).toString(), 'employee', String(orgId)));
    expect(res.status).toBe(200);
    expect(res.body.data.pending_applications).toBe(1);        // only their org
  });

  it('client is scoped to their own applications (mobile behavior preserved)', async () => {
    const client = await mkUser('client');
    await mkApp({ created_by: client._id }); // the client's own app
    await mkApp({});                         // someone else's — must be excluded
    const res = await overview(tokenFor((client._id as any).toString(), 'client'));
    expect(res.status).toBe(200);
    expect(res.body.data.pending_applications).toBe(1);
  });
});
