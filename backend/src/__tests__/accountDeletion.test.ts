/**
 * Account deletion (App Store 5.1.1(v)) — the in-app DELETE /users/me flow.
 *
 * Verifies that deletion actually:
 *   • anonymizes the User and scrubs personal identifiers,
 *   • hard-deletes the purely personal, user-owned collections (AI
 *     conversations, notifications, saved items, devices),
 *   • immediately locks the account out of BOTH access-token and refresh-token
 *     auth (a deleted user can no longer authenticate), and
 *   • is idempotent/safe on repeat and when related records are missing.
 */
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Device } from '../models/Device';
import { AIConversation } from '../models/AIConversation';
import { Notification } from '../models/Notification';
import { SavedItem } from '../models/SavedItem';

let mongoServer: MongoMemoryServer;
let app: express.Application;
const JWT_SECRET = 'test-jwt-secret-for-unit-tests';
const JWT_REFRESH_SECRET = 'test-refresh-secret-for-unit-tests';

beforeAll(async () => {
  process.env.JWT_SECRET = JWT_SECRET;
  process.env.JWT_REFRESH_SECRET = JWT_REFRESH_SECRET;
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

const accessToken = (id: string) =>
  jwt.sign({ sub: id, role: 'client', jti: 'a-' + Math.random().toString(36).slice(2) }, JWT_SECRET, {
    expiresIn: '15m',
  });
const refreshToken = (id: string) =>
  jwt.sign({ sub: id, jti: 'r-' + Math.random().toString(36).slice(2) }, JWT_REFRESH_SECRET, {
    expiresIn: '30d',
  });

async function seedUserWithData() {
  const u = await User.create({ email: `d${Math.random().toString(36).slice(2)}@t.com`, name: 'Del Me', phone: '+919000000001', role: 'client', otp_attempts: 0 });
  const id = (u._id as any).toString();
  await AIConversation.create({ user_id: u._id, messages: [{ role: 'user', text: 'my company secret plans' }] });
  await Notification.create({ user_id: u._id, type: 'cert_expiry', title: 'T', body: 'B' });
  await SavedItem.create({ user_id: u._id, item_type: 'opportunity', item_id: 'opp1' });
  await Device.create({ user_id: u._id, platform: 'ios', device_token: `tok-${id}` } as any);
  return { u, id };
}

describe('DELETE /users/me', () => {
  it('anonymizes the user and hard-deletes personal, user-owned content', async () => {
    const { u, id } = await seedUserWithData();

    const res = await request(app)
      .delete('/api/v2/users/me')
      .set('Authorization', `Bearer ${accessToken(id)}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // User: soft-deleted + anonymized (bypass the soft-delete find hook to inspect).
    const raw: any = await User.findById(id).setOptions({ includeDeleted: true } as any).select('+otp_hash');
    expect(raw.deleted_at).toBeTruthy();
    expect(raw.name).toBe('Deleted User');
    expect(raw.email).toBe(`deleted+${id}@deleted.invalid`);
    expect(raw.phone == null).toBe(true);

    // Personal, user-owned content is gone.
    expect(await AIConversation.countDocuments({ user_id: id })).toBe(0);
    expect(await Notification.countDocuments({ user_id: id })).toBe(0);
    expect(await SavedItem.countDocuments({ user_id: id })).toBe(0);
    expect(await Device.countDocuments({ user_id: id })).toBe(0);
  });

  it('locks the deleted account out of access-token auth immediately', async () => {
    const { id } = await seedUserWithData();
    const token = accessToken(id);

    await request(app).delete('/api/v2/users/me').set('Authorization', `Bearer ${token}`).expect(200);

    // The SAME token can no longer resolve the (now soft-deleted) user.
    const after = await request(app).get('/api/v2/users/me').set('Authorization', `Bearer ${token}`);
    expect(after.status).toBe(401);
  });

  it('locks the deleted account out of refresh-token auth', async () => {
    const { id } = await seedUserWithData();
    await request(app).delete('/api/v2/users/me').set('Authorization', `Bearer ${accessToken(id)}`).expect(200);

    const refreshed = await request(app).post('/api/v2/auth/refresh').send({ refreshToken: refreshToken(id) });
    expect(refreshed.status).toBe(401); // user_not_found — cannot mint new tokens
  });

  it('is idempotent/safe: a repeat request cannot re-authenticate', async () => {
    const { id } = await seedUserWithData();
    const token = accessToken(id);
    await request(app).delete('/api/v2/users/me').set('Authorization', `Bearer ${token}`).expect(200);

    // A second attempt with the same (now-invalid) token is rejected at auth.
    const second = await request(app).delete('/api/v2/users/me').set('Authorization', `Bearer ${token}`);
    expect(second.status).toBe(401);
  });

  it('succeeds even when the user has no related records', async () => {
    const u = await User.create({ email: `bare${Math.random().toString(36).slice(2)}@t.com`, name: 'Bare', role: 'client', otp_attempts: 0 });
    const id = (u._id as any).toString();
    const res = await request(app).delete('/api/v2/users/me').set('Authorization', `Bearer ${accessToken(id)}`);
    expect(res.status).toBe(200);
  });

  it('requires authentication', async () => {
    const res = await request(app).delete('/api/v2/users/me');
    expect(res.status).toBe(401);
  });
});
