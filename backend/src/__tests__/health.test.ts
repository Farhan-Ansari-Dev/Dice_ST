/**
 * Health Check & API Integration Tests
 *
 * Tests the HTTP layer: health endpoint, auth middleware,
 * and basic API behavior.
 */
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Organization } from '../models/Organization';

// ── Test app setup ───────────────────────────────────────────────────────────

let mongoServer: MongoMemoryServer;
let app: express.Application;

const JWT_SECRET = 'test-jwt-secret-for-unit-tests';
const JWT_REFRESH_SECRET = 'test-refresh-secret-for-unit-tests';

beforeAll(async () => {
  // Set env before importing route modules
  process.env.JWT_SECRET = JWT_SECRET;
  process.env.JWT_REFRESH_SECRET = JWT_REFRESH_SECRET;
  process.env.NODE_ENV = 'test';

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // Build a minimal Express app for testing
  const { errorHandler } = await import('../middleware/errorHandler');

  app = express();
  app.use(express.json());

  // Health check
  app.get('/health', async (_req, res) => {
    res.json({ status: 'ok', version: '2.0.0', timestamp: new Date().toISOString() });
  });

  // Import and mount routes
  const routes = (await import('../routes/index')).default;
  app.use('/api/v1', routes);
  app.use(errorHandler);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// ── Helper ───────────────────────────────────────────────────────────────────

function createTestToken(userId: string, role = 'client') {
  return jwt.sign(
    { sub: userId, role, jti: 'test-jti-' + Date.now() },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Health Check', () => {
  test('GET /health returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.version).toBe('2.0.0');
    expect(res.body.timestamp).toBeDefined();
  });
});

describe('Auth Middleware', () => {
  test('protected route returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/users/me');
    expect(res.status).toBe(401);
  });

  test('protected route returns 401 with invalid token', async () => {
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', 'Bearer invalid-token-here');
    expect(res.status).toBe(401);
  });

  test('protected route returns user data with valid token', async () => {
    const user = await User.create({
      email: 'authtest@example.com',
      name: 'Auth Test User',
      role: 'client',
    });
    const org = await Organization.create({ name: 'Test Org', type: 'manufacturer', owner_user_id: user._id });
    user.org_id = org._id as any;
    await user.save();

    const token = createTestToken((user._id as any).toString());
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('authtest@example.com');
  });
});

describe('Route Smoke Tests', () => {
  let token: string;

  beforeEach(async () => {
    const user = await User.create({
      email: 'routetest@example.com',
      name: 'Route Test User',
      role: 'admin',
    });
    const org = await Organization.create({ name: 'Route Org', type: 'manufacturer', owner_user_id: user._id });
    user.org_id = org._id as any;
    await user.save();
    token = createTestToken((user._id as any).toString(), 'admin');
  });

  test('GET /api/v1/certifications returns success', async () => {
    const res = await request(app)
      .get('/api/v1/certifications')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('GET /api/v1/insights returns success with auth', async () => {
    const res = await request(app)
      .get('/api/v1/insights')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('GET /api/v1/analytics/overview returns success', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/overview')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/v1/ai/chat requires auth', async () => {
    const res = await request(app)
      .post('/api/v1/ai/chat')
      .send({ message: 'What is BIS certification?' });

    expect(res.status).toBe(401);
  });
});
