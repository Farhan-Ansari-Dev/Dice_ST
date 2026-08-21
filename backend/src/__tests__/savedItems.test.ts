/**
 * Saved items — behavior + authorization.
 *
 * Locks the guarantees Phase 2B requires:
 *   - user-scoped: user B never sees user A's saved items;
 *   - duplicate-safe: saving twice yields ONE record;
 *   - un-save removes it;
 *   - a bookmark to a non-existent object is rejected.
 */
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { setupTestDB, teardownTestDB } from './setup';
import { User } from '../models/User';
import { BusinessOpportunity } from '../models/BusinessOpportunity';
import savedRoutes from '../routes/v2/saved';

const JWT_SECRET = 'test-jwt-secret-for-unit-tests';

let app: express.Application;
let userA: any;
let userB: any;
let opp: any;

function tokenFor(user: any): string {
  // Mirror the shape middleware/authMongo expects (id in the signed payload).
  return jwt.sign({ sub: String(user._id), id: String(user._id), role: user.role }, JWT_SECRET);
}

beforeAll(async () => {
  process.env.JWT_SECRET = JWT_SECRET;
  await setupTestDB();

  userA = await User.create({ email: 'a@example.com', name: 'A', role: 'client' });
  userB = await User.create({ email: 'b@example.com', name: 'B', role: 'client' });
  opp = await BusinessOpportunity.create({
    title: 'Bluetooth Speaker Export', slug: 'bt-speaker-export', category: 'Electronics',
    industry: 'Electronics', country: 'US', overview: 'Demo opportunity', investment: 500000,
  });

  app = express();
  app.use(express.json());
  app.use('/saved', savedRoutes);
});

afterAll(async () => {
  await teardownTestDB();
});

const auth = (u: any) => ({ Authorization: `Bearer ${tokenFor(u)}` });

describe('POST /saved', () => {
  it('saves an opportunity for the authenticated user', async () => {
    const res = await request(app).post('/saved').set(auth(userA))
      .send({ itemType: 'opportunity', itemId: String(opp._id), metadata: { title: opp.title } });
    expect(res.status).toBe(201);
    expect(res.body.data.item_id).toBe(String(opp._id));
  });

  it('is duplicate-safe: saving twice keeps ONE record', async () => {
    await request(app).post('/saved').set(auth(userA))
      .send({ itemType: 'opportunity', itemId: String(opp._id) });
    const list = await request(app).get('/saved?itemType=opportunity').set(auth(userA));
    expect(list.body.data.filter((i: any) => i.item_id === String(opp._id))).toHaveLength(1);
  });

  it('rejects a bookmark to a non-existent opportunity', async () => {
    const res = await request(app).post('/saved').set(auth(userA))
      .send({ itemType: 'opportunity', itemId: '6a87ea6ad29d5ada811a6a72' });
    expect(res.status).toBe(404);
  });

  it('rejects unauthenticated requests', async () => {
    const res = await request(app).post('/saved').send({ itemType: 'opportunity', itemId: String(opp._id) });
    expect(res.status).toBe(401);
  });
});

describe('GET /saved — user scoping', () => {
  it('user B does NOT see user A saved items', async () => {
    const res = await request(app).get('/saved').set(auth(userB));
    expect(res.body.data).toHaveLength(0);
  });

  it('user A sees their own saved item', async () => {
    const res = await request(app).get('/saved').set(auth(userA));
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.every((i: any) => i.item_id === String(opp._id))).toBe(true);
  });
});

describe('DELETE /saved/:itemType/:itemId', () => {
  it('un-saves and the list becomes empty', async () => {
    const del = await request(app).delete(`/saved/opportunity/${opp._id}`).set(auth(userA));
    expect(del.status).toBe(200);
    expect(del.body.data.removed).toBe(true);
    const list = await request(app).get('/saved').set(auth(userA));
    expect(list.body.data).toHaveLength(0);
  });
});
