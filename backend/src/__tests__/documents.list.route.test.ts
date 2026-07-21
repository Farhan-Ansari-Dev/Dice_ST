/**
 * GET /documents — server-side search + pagination contract.
 * Seeds documents directly (no S3) and drives the same REST endpoint the admin
 * dashboard consumes. Locks the behavior the frontend now depends on.
 */
import express from 'express';
import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'test-jwt-secret-for-unit-tests';
let mongoServer: MongoMemoryServer;
let app: express.Application;
let adminId: string;

async function seedDoc(userId: Types.ObjectId, name: string, docType = 'general') {
  const { Document, DocumentVersion } = await import('../models');
  const docId = new Types.ObjectId();
  const version = await DocumentVersion.create({
    document_id: docId, version_number: 1,
    s3_bucket: 'b', s3_key: `k/${docId}`, s3_region: 'ap-south-1',
    original_filename: `${name}.pdf`, mime_type: 'application/pdf',
    size_bytes: 1000, sha256: 'a'.repeat(64), uploaded_by: userId, uploaded_at: new Date(),
  });
  await Document.create({
    _id: docId, uploaded_by: userId, name, doc_type: docType,
    application_ids: [], current_version_id: version._id, version_count: 1, tags: [],
  });
  return docId;
}

beforeAll(async () => {
  process.env.JWT_SECRET = JWT_SECRET;
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-unit-tests';
  process.env.NODE_ENV = 'test';
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  const { User, Document } = await import('../models');
  const admin = await User.create({ email: 'admin@sanyog.test', name: 'Admin', role: 'admin', otp_attempts: 0 });
  adminId = (admin._id as any).toString();
  // Ensure the text index used by ?q exists before searching.
  await Document.syncIndexes();

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

function token() {
  return jwt.sign({ sub: adminId, role: 'admin', jti: 'test-' + Date.now() }, JWT_SECRET, { expiresIn: '15m' });
}

describe('GET /documents server-side search', () => {
  beforeAll(async () => {
    const uid = new Types.ObjectId(adminId);
    await seedDoc(uid, 'Alpha Report');
    await seedDoc(uid, 'Beta Manual');
    await seedDoc(uid, 'Gamma Report');
  });

  it('returns all documents with a total when no query is given', async () => {
    const res = await request(app).get('/api/v2/documents').set('Authorization', `Bearer ${token()}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(3);
    expect(res.body.pagination.total).toBe(3);
  });

  it('filters by ?q using the text index', async () => {
    const res = await request(app).get('/api/v2/documents?q=Report').set('Authorization', `Bearer ${token()}`);
    expect(res.status).toBe(200);
    const names = res.body.data.map((d: any) => d.name).sort();
    expect(names).toEqual(['Alpha Report', 'Gamma Report']);
  });

  it('returns an empty set for a non-matching query (no crash)', async () => {
    const res = await request(app).get('/api/v2/documents?q=nonexistentterm').set('Authorization', `Bearer ${token()}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(0);
    expect(res.body.pagination.total).toBe(0);
  });
});
