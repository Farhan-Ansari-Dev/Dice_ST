/**
 * C-1 regression — refresh-token rotation + session revocation via Redis denylist.
 */
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../models/User';
import { issueTokens } from '../middleware/authMongo';

let mongoServer: MongoMemoryServer;
let app: express.Application;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests';
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

describe('C-1 — logout revokes the session immediately', () => {
  it('access token works before logout and is rejected after', async () => {
    const user = await User.create({ email: 'rev@t.com', name: 'Rev', role: 'client', otp_attempts: 0 });
    const { accessToken, refreshToken } = issueTokens(user);

    const before = await request(app).get('/api/v1/users/me').set('Authorization', `Bearer ${accessToken}`);
    expect(before.status).toBe(200);

    const logout = await request(app).post('/api/v1/auth/logout').send({ refreshToken });
    expect(logout.status).toBe(200);

    const after = await request(app).get('/api/v1/users/me').set('Authorization', `Bearer ${accessToken}`);
    expect(after.status).toBe(401);
    expect(after.body.error).toBe('token_revoked');
  });

  it('a rotated / logged-out refresh token cannot mint new tokens', async () => {
    const user = await User.create({ email: 'rev2@t.com', name: 'Rev2', role: 'client', otp_attempts: 0 });
    const { refreshToken } = issueTokens(user);

    await request(app).post('/api/v1/auth/logout').send({ refreshToken });

    const refresh = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });
    expect(refresh.status).toBe(401);
    expect(refresh.body.error).toBe('token_revoked');
  });

  it('refresh rotation invalidates the old refresh token', async () => {
    const user = await User.create({ email: 'rot@t.com', name: 'Rot', role: 'client', otp_attempts: 0 });
    const { refreshToken } = issueTokens(user);

    const first = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });
    expect(first.status).toBe(200);
    expect(first.body.refreshToken).toBeTruthy();

    // The original refresh token is now single-use-spent → rejected on replay.
    const replay = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });
    expect(replay.status).toBe(401);
  });
});
