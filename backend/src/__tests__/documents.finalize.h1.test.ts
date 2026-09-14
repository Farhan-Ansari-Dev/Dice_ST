/**
 * H1 regression — cross-tenant document authorization at finalize (baseline arch).
 *
 * Invariant: a client-controlled S3 key can never create a DocumentVersion that
 * is later authorized for download. finalize only succeeds against a server-issued
 * UploadTicket bound to the authenticated user (and, for a version, the document),
 * consumed atomically. S3 is mocked (HeadObject succeeds) so the ONLY barrier is
 * the upload-ticket check.
 */
import express from 'express';
import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({ ContentLength: 10, ContentType: 'application/pdf', ETag: '"e"' }),
  })),
  PutObjectCommand: jest.fn(),
  GetObjectCommand: jest.fn(),
  HeadObjectCommand: jest.fn(),
}));
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://s3.example/signed'),
}));

const JWT_SECRET = 'test-jwt-secret-for-unit-tests';
let mongoServer: MongoMemoryServer;
let app: express.Application;
let victimId: string, attackerId: string;
const victimOrg = new Types.ObjectId();
const attackerOrg = new Types.ObjectId();

beforeAll(async () => {
  process.env.JWT_SECRET = JWT_SECRET;
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-unit-tests';
  process.env.NODE_ENV = 'test';
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  const { User } = await import('../models/User');
  victimId = String((await User.create({ email: 'victim@t.com', name: 'V', role: 'client', org_id: victimOrg, otp_attempts: 0 }))._id);
  attackerId = String((await User.create({ email: 'attacker@t.com', name: 'A', role: 'client', org_id: attackerOrg, otp_attempts: 0 }))._id);
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

const tok = (id: string, role = 'client') => jwt.sign({ sub: id, role, jti: 'j' + Math.random() }, JWT_SECRET, { expiresIn: '15m' });
const baseBody = { name: 'doc.pdf', doc_type: 'general', mime_type: 'application/pdf', size_bytes: 10, sha256: 'a'.repeat(64) };

async function presignAs(userId: string) {
  const res = await request(app).post('/api/v2/documents/presign').set('Authorization', `Bearer ${tok(userId)}`)
    .send({ filename: 'doc.pdf', mime_type: 'application/pdf', size_bytes: 10, sha256: 'a'.repeat(64), doc_type: 'general' });
  expect(res.status).toBe(200);
  return res.body.data as { s3_key: string; upload_id: string };
}
const finalize = (userId: string, body: any) =>
  request(app).post('/api/v2/documents/finalize').set('Authorization', `Bearer ${tok(userId)}`).send({ ...baseBody, ...body });

describe('H1 — finalize authorization (baseline)', () => {
  it('valid: presign → finalize(matching key) → 201 (7)', async () => {
    const { s3_key, upload_id } = await presignAs(attackerId);
    expect((await finalize(attackerId, { s3_key, upload_id })).status).toBe(201);
  });

  it('no authorization + arbitrary/nonexistent key → 403 (1)', async () => {
    const res = await finalize(attackerId, { s3_key: `orgs/${victimOrg}/docs/${new Types.ObjectId()}/v1-secret.pdf` });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('upload_not_authorized');
  });

  it("User A authorization + User B key → 403 (2)", async () => {
    const victim = await presignAs(victimId);
    const res = await finalize(attackerId, { s3_key: victim.s3_key, upload_id: victim.upload_id });
    expect(res.status).toBe(403);
    const { UploadTicket } = await import('../models');
    expect((await UploadTicket.findById(victim.upload_id))?.status).toBe('pending'); // victim ticket untouched
  });

  it('valid authorization + modified/substituted key → 403 (4)', async () => {
    const mine = await presignAs(attackerId);
    const res = await finalize(attackerId, { upload_id: mine.upload_id, s3_key: 'orgs/other/docs/x/v1-evil.pdf' });
    expect(res.status).toBe(403);
    // ticket not consumed → the real key still finalizes
    expect((await finalize(attackerId, { upload_id: mine.upload_id, s3_key: mine.s3_key })).status).toBe(201);
  });

  it('cross-organization key (no ticket for attacker) → 403 (8)', async () => {
    const victim = await presignAs(victimId);
    expect((await finalize(attackerId, { s3_key: victim.s3_key })).status).toBe(403);
  });

  it('existing victim object key → attacker DENIED (3/5)', async () => {
    const victim = await presignAs(victimId);
    expect((await finalize(victimId, { s3_key: victim.s3_key, upload_id: victim.upload_id })).status).toBe(201);
    expect((await finalize(attackerId, { s3_key: victim.s3_key })).status).toBe(403);
  });

  it('replay consumed authorization → 403 (6)', async () => {
    const mine = await presignAs(attackerId);
    expect((await finalize(attackerId, { s3_key: mine.s3_key, upload_id: mine.upload_id })).status).toBe(201);
    expect((await finalize(attackerId, { s3_key: mine.s3_key, upload_id: mine.upload_id })).status).toBe(403);
  });

  it('expired authorization → 403', async () => {
    const mine = await presignAs(attackerId);
    const { UploadTicket } = await import('../models');
    await UploadTicket.updateOne({ _id: mine.upload_id }, { $set: { expires_at: new Date(Date.now() - 1000) } });
    const res = await finalize(attackerId, { s3_key: mine.s3_key, upload_id: mine.upload_id });
    expect(res.status).toBe(403);
  });

  it('download stays owner/tenant scoped: attacker cannot read victim doc', async () => {
    const victim = await presignAs(victimId);
    const vfin = await finalize(victimId, { s3_key: victim.s3_key, upload_id: victim.upload_id });
    const docId = vfin.body.data.document._id;
    expect((await request(app).get(`/api/v2/documents/${docId}/download`).set('Authorization', `Bearer ${tok(attackerId)}`)).status).toBe(404);
    const ok = await request(app).get(`/api/v2/documents/${docId}/download`).set('Authorization', `Bearer ${tok(victimId)}`);
    expect(ok.status).toBe(200);
    expect(ok.body.data.url).toBeTruthy();
  });
});
