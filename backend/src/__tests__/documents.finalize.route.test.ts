/**
 * Route-level reproduction of POST /api/v2/documents/finalize.
 *
 * Mirrors the admin dashboard exactly: an admin user WITH NO org_id uploads a
 * brand-new document (no document_id). Exercises both S3 HeadObject outcomes to
 * pinpoint which step yields the observed HTTP 400.
 */
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';

// Controllable S3 mock — flip headObjectFails to simulate the server-side
// HeadObject succeeding (object present) or failing (perm/region/missing).
let headObjectFails = false;
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockImplementation(async () => {
      if (headObjectFails) {
        const e: any = new Error('Forbidden');
        e.name = 'AccessDenied';
        throw e;
      }
      return {};
    }),
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
let adminId: string;

beforeAll(async () => {
  process.env.JWT_SECRET = JWT_SECRET;
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-unit-tests';
  process.env.NODE_ENV = 'test';

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  const { User } = await import('../models/User');
  // Admin/staff user — deliberately NO org_id (real admin dashboard scenario)
  const admin = await User.create({ email: 'admin@sanyog.test', name: 'Admin', role: 'admin', otp_attempts: 0 });
  adminId = (admin._id as any).toString();

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

function adminToken() {
  return jwt.sign({ sub: adminId, role: 'admin', jti: 'test-' + Date.now() }, JWT_SECRET, { expiresIn: '15m' });
}

const finalizeBody = {
  s3_key: 'orgs/platform/docs/new-x/v1-report.pdf',
  name: 'report.pdf',
  doc_type: 'general',
  mime_type: 'application/pdf',
  size_bytes: 12345,
  sha256: 'a'.repeat(64),
};

it('S3 HeadObject SUCCESS → 201 (new doc, admin with no org_id)', async () => {
  headObjectFails = false;
  const res = await request(app)
    .post('/api/v2/documents/finalize')
    .set('Authorization', `Bearer ${adminToken()}`)
    .send(finalizeBody);
  // eslint-disable-next-line no-console
  console.log('[repro:success] status', res.status, 'body', JSON.stringify(res.body).slice(0, 300));
  expect(res.status).toBe(201);
  // S3 metadata fallback: this mock's HeadObject returns {} (no ContentLength),
  // so finalize must fall back to the client-supplied size/mime rather than crash.
  expect(res.body.data.version.size_bytes).toBe(finalizeBody.size_bytes);
  expect(res.body.data.version.mime_type).toBe(finalizeBody.mime_type);
  expect(res.body.data.version.processing_status).toBe('ready');
});

it('S3 HeadObject FAILURE → 400 (reproduces the reported symptom)', async () => {
  headObjectFails = true;
  const res = await request(app)
    .post('/api/v2/documents/finalize')
    .set('Authorization', `Bearer ${adminToken()}`)
    .send({ ...finalizeBody, s3_key: 'orgs/platform/docs/new-y/v1-report.pdf' });
  // eslint-disable-next-line no-console
  console.log('[repro:failure] status', res.status, 'body', JSON.stringify(res.body).slice(0, 300));
  expect(res.status).toBe(400);
});

it('Replace Version: finalize with document_id creates v2 and repoints current_version_id', async () => {
  headObjectFails = false;
  // v1 — new document
  const v1 = await request(app)
    .post('/api/v2/documents/finalize')
    .set('Authorization', `Bearer ${adminToken()}`)
    .send({ ...finalizeBody, s3_key: 'orgs/platform/docs/replace/v1.pdf' });
  expect(v1.status).toBe(201);
  const docId = v1.body.data.document._id;
  const v1VersionId = v1.body.data.version._id;

  // v2 — replacement of the same document
  const v2 = await request(app)
    .post('/api/v2/documents/finalize')
    .set('Authorization', `Bearer ${adminToken()}`)
    .send({ ...finalizeBody, s3_key: 'orgs/platform/docs/replace/v2.pdf', document_id: docId, change_reason: 'replaced' });
  expect(v2.status).toBe(201);
  expect(v2.body.data.version.version_number).toBe(2);
  // Document now points at v2 with an incremented count.
  expect(v2.body.data.document.version_count).toBe(2);
  expect(String(v2.body.data.document.current_version_id)).toBe(String(v2.body.data.version._id));

  // Full history preserved; v1 remains immutable and downloadable.
  const hist = await request(app)
    .get(`/api/v2/documents/${docId}/versions`)
    .set('Authorization', `Bearer ${adminToken()}`);
  expect(hist.status).toBe(200);
  expect(hist.body.data.map((x: any) => x.version_number).sort()).toEqual([1, 2]);

  const dl = await request(app)
    .get(`/api/v2/documents/${docId}/download?version=1`)
    .set('Authorization', `Bearer ${adminToken()}`);
  expect(dl.status).toBe(200);
  expect(dl.body.data.url).toBeTruthy();
  expect(v1VersionId).toBeTruthy();
});
