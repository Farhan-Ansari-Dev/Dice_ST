/**
 * Market Access domain search (Phase 2F).
 *
 * Verifies typed, grouped results over GLOBAL reference data, real matches only
 * (no fabrication), short queries return empty, and auth is required.
 */
import express from 'express';
import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'test-jwt-secret-for-unit-tests';
let mongoServer: MongoMemoryServer;
let app: express.Application;
let token: string;

beforeAll(async () => {
  process.env.JWT_SECRET = JWT_SECRET;
  process.env.JWT_REFRESH_SECRET = 'test-refresh';
  process.env.NODE_ENV = 'test';
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  const { User } = await import('../models');
  const { seedMarketAccessData } = await import('../db/seed-market-access');
  const { seedHsCodes } = await import('../db/seed-hs-codes');
  const { BusinessOpportunity } = await import('../models/BusinessOpportunity');
  await seedMarketAccessData();
  await seedHsCodes();
  await BusinessOpportunity.create({
    title: 'Bluetooth Speaker Export', slug: 'bt-speaker', category: 'Electronics',
    industry: 'Electronics', country: 'US', overview: 'x', investment: 100000, status: 'published', active: true,
  });

  const u = await User.create({ email: 's@sanyog.test', name: 'S', role: 'client' });
  token = jwt.sign({ sub: String(u._id as Types.ObjectId), role: 'client' }, JWT_SECRET);

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

describe('GET /market-access/search', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/v2/market-access/search?q=speaker');
    expect(res.status).toBe(401);
  });

  it('returns typed grouped results for a real term', async () => {
    const res = await request(app).get('/api/v2/market-access/search?q=speaker').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const r = res.body.results;
    expect(r).toHaveProperty('hsCodes');
    expect(r).toHaveProperty('opportunities');
    // "speaker" matches the HS 8518 loudspeaker entries and the opportunity.
    expect(r.hsCodes.length).toBeGreaterThan(0);
    expect(r.opportunities.some((o: any) => /speaker/i.test(o.title))).toBe(true);
  });

  it('matches HS codes by numeric prefix', async () => {
    const res = await request(app).get('/api/v2/market-access/search?q=8517').set('Authorization', `Bearer ${token}`);
    expect(res.body.results.hsCodes.some((h: any) => h.code.startsWith('8517'))).toBe(true);
  });

  it('short queries return empty (no fabrication)', async () => {
    const res = await request(app).get('/api/v2/market-access/search?q=a').set('Authorization', `Bearer ${token}`);
    expect(res.body.results.hsCodes).toHaveLength(0);
  });

  it('no matches → empty groups, not invented results', async () => {
    const res = await request(app).get('/api/v2/market-access/search?q=zzxqwplasma').set('Authorization', `Bearer ${token}`);
    const r = res.body.results;
    expect(r.hsCodes).toHaveLength(0);
    expect(r.opportunities).toHaveLength(0);
    expect(r.categories).toHaveLength(0);
  });
});
