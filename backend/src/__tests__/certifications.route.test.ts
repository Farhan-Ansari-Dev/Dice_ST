/**
 * GET /certifications — client read access + ownership scoping.
 *
 * A client (the default mobile role) must be able to read the certifications
 * produced by the applications they created, and MUST NOT see any other user's
 * certifications. Org-less clients cannot be scoped by org_id, so scoping is by
 * owned application_id — mirroring the tenancy model in routes/v2/applications.ts.
 * Writes remain staff-only.
 */
import express from 'express';
import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'test-jwt-secret-for-unit-tests';
let mongoServer: MongoMemoryServer;
let app: express.Application;

let seq = 0;
async function seedCertFor(ownerId: Types.ObjectId, certType: string, orgId?: Types.ObjectId) {
  const { Application, Certification } = await import('../models');
  seq += 1;
  const application = await Application.create({
    application_number: `APP-TEST-${String(seq).padStart(4, '0')}`,
    product_id: new Types.ObjectId(),
    cert_type: certType,
    created_by: ownerId,
    org_id: orgId,
  });
  const cert = await Certification.create({
    cert_number: `CM/L-${1000 + seq}`,
    cert_type: certType,
    org_id: orgId ?? new Types.ObjectId(),
    product_id: application.product_id,
    application_id: application._id,
    issuing_body: 'Bureau of Indian Standards',
    scheme: 'IS 13252 (Part 1)',
    issue_date: new Date('2026-01-01'),
    expiry_date: new Date('2027-01-01'),
  });
  return cert._id as Types.ObjectId;
}

function tokenFor(userId: string, role: string) {
  return jwt.sign({ sub: userId, role, jti: `t-${role}-${Date.now()}-${Math.random()}` }, JWT_SECRET, { expiresIn: '15m' });
}

let adminToken: string;
let clientAToken: string, clientAId: Types.ObjectId;
let clientBToken: string, clientBId: Types.ObjectId;
let certAId: Types.ObjectId;

beforeAll(async () => {
  process.env.JWT_SECRET = JWT_SECRET;
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-unit-tests';
  process.env.NODE_ENV = 'test';
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  const { User, Certification } = await import('../models');
  await Certification.syncIndexes();

  const admin = await User.create({ email: 'admin@sanyog.test', name: 'Admin', role: 'admin', otp_attempts: 0 });
  const clientA = await User.create({ email: 'a@sanyog.test', name: 'Client A', role: 'client', otp_attempts: 0 });
  const clientB = await User.create({ email: 'b@sanyog.test', name: 'Client B', role: 'client', otp_attempts: 0 });
  clientAId = clientA._id as Types.ObjectId;
  clientBId = clientB._id as Types.ObjectId;

  adminToken = tokenFor(String(admin._id), 'admin');
  clientAToken = tokenFor(String(clientA._id), 'client');
  clientBToken = tokenFor(String(clientB._id), 'client');

  // Client A owns one cert; a second cert belongs to an unrelated user.
  certAId = await seedCertFor(clientAId, 'BIS_CRS');
  await seedCertFor(new Types.ObjectId(), 'FCC'); // foreign cert, no relation to A or B

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

describe('GET /certifications — client access & scoping', () => {
  it('a client can read (200, not 403) and sees only certifications from applications they created', async () => {
    const res = await request(app).get('/api/v2/certifications').set('Authorization', `Bearer ${clientAToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.map((c: any) => c.cert_type)).toEqual(['BIS_CRS']);
  });

  it('a different client cannot see the first client\'s certifications (no IDOR)', async () => {
    const res = await request(app).get('/api/v2/certifications').set('Authorization', `Bearer ${clientBToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('an admin sees every certification', async () => {
    const res = await request(app).get('/api/v2/certifications').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
  });

  it('a client can read its own certification by id', async () => {
    const res = await request(app).get(`/api/v2/certifications/${certAId}`).set('Authorization', `Bearer ${clientAToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.cert_type).toBe('BIS_CRS');
  });

  it("a client cannot read another user's certification by id (404)", async () => {
    const res = await request(app).get(`/api/v2/certifications/${certAId}`).set('Authorization', `Bearer ${clientBToken}`);
    expect(res.status).toBe(404);
  });

  it('a client cannot create a certification (write stays staff-only, 403)', async () => {
    const res = await request(app)
      .post('/api/v2/certifications')
      .set('Authorization', `Bearer ${clientAToken}`)
      .send({ cert_type: 'BIS_CRS' });
    expect(res.status).toBe(403);
  });
});
