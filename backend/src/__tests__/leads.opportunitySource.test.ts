/**
 * POST /leads — Market Access opportunity sourcing.
 *
 * Verifies the additive Phase-2C wiring: a lead created from a Hot Opportunity
 * carries source='market_opportunity' and links back to the opportunity, is
 * user-scoped, and is trackable by the client via GET /leads/mine. Uses the
 * EXISTING lead workflow — no duplicate application/lead system.
 */
import express from 'express';
import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'test-jwt-secret-for-unit-tests';
let mongoServer: MongoMemoryServer;
let app: express.Application;
let clientToken: string;
let adminToken: string;
let oppId: Types.ObjectId;

beforeAll(async () => {
  process.env.JWT_SECRET = JWT_SECRET;
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-unit-tests';
  process.env.NODE_ENV = 'test';
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  const { User } = await import('../models');
  const { BusinessOpportunity } = await import('../models/BusinessOpportunity');
  const client = await User.create({ email: 'client@sanyog.test', name: 'Client', role: 'client', otp_attempts: 0 });
  clientToken = jwt.sign({ sub: String(client._id), role: 'client', jti: 'c-' + Date.now() }, JWT_SECRET, { expiresIn: '15m' });
  const admin = await User.create({ email: 'admin@sanyog.test', name: 'Admin', role: 'admin', otp_attempts: 0 });
  adminToken = jwt.sign({ sub: String(admin._id), role: 'admin', jti: 'a-' + Date.now() }, JWT_SECRET, { expiresIn: '15m' });

  const opp = await BusinessOpportunity.create({
    title: 'Bluetooth Speaker → USA', slug: 'bt-speaker-usa', category: 'Electronics',
    industry: 'Electronics', country: 'US', overview: 'Growing demand', investment: 500000,
    requiredCertifications: ['FCC'],
  });
  oppId = opp._id as Types.ObjectId;

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

describe('POST /leads — opportunity source', () => {
  it('tags source=market_opportunity and links the opportunity', async () => {
    const res = await request(app)
      .post('/api/v2/leads')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        serviceId: 'FCC',
        serviceName: 'FCC Certification',
        contactName: 'Client',
        contactEmail: 'client@sanyog.test',
        productDescription: 'Bluetooth Speaker',
        targetMarkets: ['US'],
        source: 'market_opportunity',
        opportunityId: String(oppId),
      });

    expect(res.status).toBe(201);
    expect(res.body.data.source).toBe('market_opportunity');
    expect(String(res.body.data.opportunity_id)).toBe(String(oppId));
    // Reuses the existing draft-application auto-create path.
    expect(res.body.data._id).toBeTruthy();
  });

  it('is trackable by the client via GET /leads/mine', async () => {
    const res = await request(app)
      .get('/api/v2/leads/mine')
      .set('Authorization', `Bearer ${clientToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    const mine = res.body.data.find((l: any) => String(l.opportunity_id) === String(oppId));
    expect(mine).toBeTruthy();
    expect(mine.source).toBe('market_opportunity');
  });

  it('admin can see the opportunity-sourced lead in the triage queue', async () => {
    const res = await request(app)
      .get('/api/v2/leads')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const found = res.body.data.find((l: any) => String(l.opportunity_id) === String(oppId));
    expect(found).toBeTruthy();
    expect(found.source).toBe('market_opportunity');
    expect(found.status).toBe('new');
  });

  it('a client cannot access the admin triage queue', async () => {
    const res = await request(app)
      .get('/api/v2/leads')
      .set('Authorization', `Bearer ${clientToken}`);
    expect(res.status).toBe(403);
  });

  it('defaults source to mobile_app when not supplied (existing behavior preserved)', async () => {
    const res = await request(app)
      .post('/api/v2/leads')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        serviceId: 'bis', serviceName: 'BIS', contactName: 'Client',
        contactEmail: 'client@sanyog.test', productDescription: 'LED bulb', targetMarkets: ['IN'],
      });
    expect(res.status).toBe(201);
    expect(res.body.data.source).toBe('mobile_app');
  });
});
