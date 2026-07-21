/**
 * documentService upload/version flow — proves the finalizeUpload path end-to-end
 * against a real (in-memory) MongoDB with S3 mocked out.
 *
 * Regression focus: creating a NEW logical document must NOT trip the
 * DocumentVersion immutability guard (previously threw
 * "DocumentVersion is immutable. Forbidden modifications: document_id").
 */
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// ── Mock AWS S3 so no network/credentials are needed ─────────────────────────
jest.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: jest.fn().mockImplementation(() => ({
      send: jest.fn().mockResolvedValue({}), // HeadObject → object "exists"
    })),
    PutObjectCommand: jest.fn(),
    GetObjectCommand: jest.fn(),
    HeadObjectCommand: jest.fn(),
  };
});
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://s3.example/signed-url'),
}));

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('documentService.finalizeUpload', () => {
  const orgId = new Types.ObjectId();
  const userId = new Types.ObjectId();
  let createdDocId: Types.ObjectId;

  it('creates a new document + v1 without hitting the immutability guard', async () => {
    const { documentService } = await import('../services/documentService');
    const { document, version } = await documentService.finalizeUpload({
      org_id: orgId,
      user_id: userId,
      s3_key: 'orgs/x/docs/new/v1-report.pdf',
      name: 'BIS Test Report',
      doc_type: 'test_report',
      mime_type: 'application/pdf',
      size_bytes: 1234,
      sha256: 'a'.repeat(64),
    });

    expect(document).toBeTruthy();
    expect(version.version_number).toBe(1);
    // version points at the real document, not a throwaway id
    expect(version.document_id.toString()).toBe((document as any)._id.toString());
    createdDocId = (document as any)._id;
  });

  it('records v2 for the same document (version history)', async () => {
    const { documentService } = await import('../services/documentService');
    const { version } = await documentService.finalizeUpload({
      org_id: orgId,
      user_id: userId,
      s3_key: 'orgs/x/docs/id/v2-report.pdf',
      document_id: createdDocId,
      name: 'BIS Test Report',
      doc_type: 'test_report',
      mime_type: 'application/pdf',
      size_bytes: 2222,
      sha256: 'b'.repeat(64),
      change_reason: 'addressed reviewer comments',
    });
    expect(version.version_number).toBe(2);
    expect(version.document_id.toString()).toBe(createdDocId.toString());

    const versions = await documentService.listVersions(createdDocId);
    expect(versions.map(v => v.version_number).sort()).toEqual([1, 2]);
  });

  it('returns a signed download URL for the current version', async () => {
    const { documentService } = await import('../services/documentService');
    const url = await documentService.getDownloadUrl(createdDocId, undefined, userId);
    expect(url).toBe('https://s3.example/signed-url');
  });

  it('still forbids mutating document_id after creation', async () => {
    const { DocumentVersion } = await import('../models');
    const v = await DocumentVersion.findOne({ document_id: createdDocId, version_number: 1 });
    expect(v).toBeTruthy();
    v!.document_id = new Types.ObjectId();
    await expect(v!.save()).rejects.toThrow(/immutable.*document_id/i);
  });

  it('still allows async-processing fields (ocr_text) to be updated', async () => {
    const { DocumentVersion } = await import('../models');
    const v = await DocumentVersion.findOne({ document_id: createdDocId, version_number: 2 });
    v!.ocr_text = 'extracted text';
    await expect(v!.save()).resolves.toBeTruthy();
  });
});
