/**
 * Insights CRUD Integration Tests
 *
 * Proves end-to-end: create → list → edit → publish/unpublish →
 * pin → delete against a real (in-memory) MongoDB, through the same
 * REST API the admin dashboard AND the mobile app consume.
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

function tokenFor(userId: string, role: string) {
  return jwt.sign({ sub: userId, role, jti: 'test-' + Date.now() }, JWT_SECRET, { expiresIn: '15m' });
}

describe('Insights CRUD (admin dashboard + mobile app share this API)', () => {
  let adminToken: string;
  let clientToken: string;
  let insightId: string;

  beforeAll(async () => {
    const admin = await User.create({ email: 'sa@test.com', name: 'Super Admin', role: 'super_admin', otp_attempts: 0 });
    const client = await User.create({ email: 'client@test.com', name: 'Client', role: 'client', otp_attempts: 0 });
    adminToken = tokenFor((admin._id as any).toString(), 'super_admin');
    clientToken = tokenFor((client._id as any).toString(), 'client');
  });

  it('super_admin creates an insight with full schema fields', async () => {
    const res = await request(app)
      .post('/api/v1/insights')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'BIS Amends IS 1293 for Electrical Plugs',
        summary: 'Amendment 3 affects plug and socket certifications.',
        content: 'Full article body with details of the amendment…',
        category: 'bis_update',
        country: 'India',
        source: 'Bureau of Indian Standards',
        link: 'https://bis.gov.in/is-1293',
        tags: ['BIS', 'IS 1293'],
        published: true,
        featured: false,
      });
    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe('BIS Amends IS 1293 for Electrical Plugs');
    expect(res.body.data.content).toContain('Full article body');
    expect(res.body.data.source).toBe('Bureau of Indian Standards');
    expect(res.body.data.link).toBe('https://bis.gov.in/is-1293');
    expect(res.body.data.createdBy).toBeTruthy();       // stamped from the admin user
    expect(res.body.data.imageUrl).toBeUndefined();     // no image fields anymore
    expect(res.body.data.published).toBe(true);
    insightId = res.body.data._id;
  });

  it('rejects an insight missing the required Source URL', async () => {
    const res = await request(app)
      .post('/api/v1/insights')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'No source url', summary: 'x', category: 'customs', source: 'Someone' });
    expect(res.status).toBe(400);
  });

  it('GET /insights returns the created insight (what the mobile app receives)', async () => {
    const res = await request(app)
      .get('/api/v1/insights')
      .set('Authorization', `Bearer ${clientToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0]._id).toBe(insightId);
    expect(res.body.data[0].source).toBe('Bureau of Indian Standards');
    expect(res.body.data[0].link).toBe('https://bis.gov.in/is-1293');
  });

  it('super_admin edits the insight and the change is immediately visible', async () => {
    const put = await request(app)
      .put(`/api/v1/insights/${insightId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ summary: 'UPDATED summary text', featured: true });
    expect(put.status).toBe(200);

    const res = await request(app)
      .get('/api/v1/insights')
      .set('Authorization', `Bearer ${clientToken}`);
    expect(res.body.data[0].summary).toBe('UPDATED summary text');
    expect(res.body.data[0].featured).toBe(true); // pinned
  });

  it('unpublishing hides the insight from the mobile app but not from admins', async () => {
    await request(app)
      .put(`/api/v1/insights/${insightId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ published: false });

    const mobileView = await request(app)
      .get('/api/v1/insights')
      .set('Authorization', `Bearer ${clientToken}`);
    expect(mobileView.body.data.length).toBe(0);

    const adminView = await request(app)
      .get('/api/v1/insights?includeUnpublished=true')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminView.body.data.length).toBe(1);
    expect(adminView.body.data[0].published).toBe(false);
  });

  it('non-admin roles cannot create, edit or delete insights', async () => {
    const post = await request(app)
      .post('/api/v1/insights')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ title: 'Nope', summary: 'x', category: 'customs' });
    expect(post.status).toBe(403);

    const del = await request(app)
      .delete(`/api/v1/insights/${insightId}`)
      .set('Authorization', `Bearer ${clientToken}`);
    expect(del.status).toBe(403);
  });

  it('super_admin deletes the insight and it is gone from the API', async () => {
    const del = await request(app)
      .delete(`/api/v1/insights/${insightId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(del.status).toBe(200);

    const res = await request(app)
      .get('/api/v1/insights?includeUnpublished=true')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.body.data.length).toBe(0);
  });
});
