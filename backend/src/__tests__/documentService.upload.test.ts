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
// HeadObject returns authoritative metadata that DIFFERS from the client input,
// so we can prove finalize uses S3's values, not the client's.
const S3_HEAD = { ContentLength: 4242, ContentType: 'application/pdf', ETag: '"etag-xyz"' };
jest.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: jest.fn().mockImplementation(() => ({
      send: jest.fn().mockResolvedValue({ ContentLength: 4242, ContentType: 'application/pdf', ETag: '"etag-xyz"' }),
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
    // Phase 1: metadata comes from S3 HeadObject, NOT the client input (1234).
    expect(version.size_bytes).toBe(S3_HEAD.ContentLength);
    expect(version.mime_type).toBe(S3_HEAD.ContentType);
    // Phase 1: finalized version is 'ready' (no async pipeline yet).
    expect(version.processing_status).toBe('ready');
    createdDocId = (document as any)._id;
  });

  it('stores the S3 ETag as a backend-only field (select:false)', async () => {
    const { DocumentVersion } = await import('../models');
    const withoutEtag = await DocumentVersion.findOne({ document_id: createdDocId, version_number: 1 });
    expect((withoutEtag as any).etag).toBeUndefined();          // not returned by default
    const withEtag = await DocumentVersion.findOne({ document_id: createdDocId, version_number: 1 }).select('+etag');
    expect((withEtag as any).etag).toBe(S3_HEAD.ETag);          // present when explicitly selected
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

  it('returns a signed download URL for the current version (attachment by default)', async () => {
    const { documentService } = await import('../services/documentService');
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    (GetObjectCommand as unknown as jest.Mock).mockClear();
    const url = await documentService.getDownloadUrl(createdDocId, undefined, userId);
    expect(url).toBe('https://s3.example/signed-url');
    const args = (GetObjectCommand as unknown as jest.Mock).mock.calls[0][0];
    expect(args.ResponseContentDisposition).toMatch(/^attachment;/);
    expect(args.ResponseContentType).toBe('application/pdf');
  });

  it('preview requests an inline disposition', async () => {
    const { documentService } = await import('../services/documentService');
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    (GetObjectCommand as unknown as jest.Mock).mockClear();
    await documentService.getDownloadUrl(createdDocId, undefined, userId, 'inline');
    const args = (GetObjectCommand as unknown as jest.Mock).mock.calls[0][0];
    expect(args.ResponseContentDisposition).toMatch(/^inline;/);
    expect(args.ResponseContentType).toBe('application/pdf');
  });

  it('sanitizes the Content-Disposition filename (no header injection)', async () => {
    const { documentService } = await import('../services/documentService');
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const evil = 'evil".pdf\r\nX-Injected: 1';
    const { document } = await documentService.finalizeUpload({
      org_id: orgId, user_id: userId, s3_key: 'orgs/x/evil.pdf',
      name: evil, doc_type: 'test_report', mime_type: 'application/pdf',
      size_bytes: 1, sha256: 'd'.repeat(64),
    });
    (GetObjectCommand as unknown as jest.Mock).mockClear();
    await documentService.getDownloadUrl((document as any)._id, undefined, userId);
    const cd: string = (GetObjectCommand as unknown as jest.Mock).mock.calls[0][0].ResponseContentDisposition;
    expect(cd).not.toContain('\r');
    expect(cd).not.toContain('\n');
    expect((cd.match(/"/g) || []).length).toBe(2);   // only the wrapping quotes survive
    expect(cd).toContain("filename*=UTF-8''");
  });

  it('still forbids mutating document_id after creation', async () => {
    const { DocumentVersion } = await import('../models');
    const v = await DocumentVersion.findOne({ document_id: createdDocId, version_number: 1 });
    expect(v).toBeTruthy();
    v!.document_id = new Types.ObjectId();
    await expect(v!.save()).rejects.toThrow(/immutable.*document_id/i);
  });

  // Regression: legacy documents migrated from the previous backend have NO
  // DocumentVersion — the S3 reference lives on the Document (storageKey/mimeType/
  // originalName). getDownloadUrl must fall back to it, not throw "Version not found".
  it('falls back to legacy Document S3 fields when there is no DocumentVersion', async () => {
    const mongoose = (await import('mongoose')).default;
    const { documentService } = await import('../services/documentService');
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');

    const legacyId = new Types.ObjectId();
    await mongoose.connection.db!.collection('documents').insertOne({
      _id: legacyId,
      storageProvider: 's3',
      storageKey: 'legacy/orgs/x/old-report.pdf',
      mimeType: 'application/pdf',
      originalName: 'Old Report.pdf',
      sizeBytes: 5000,
      publicUrl: 'https://s3.example/old-report.pdf',
      applicationId: new Types.ObjectId(),
      uploadedByEmail: 'x@t.com',
      createdAt: new Date(),
    } as any);

    (GetObjectCommand as unknown as jest.Mock).mockClear();
    const url = await documentService.getDownloadUrl(legacyId, undefined, userId, 'inline');
    expect(url).toBe('https://s3.example/signed-url');   // did not throw
    const args = (GetObjectCommand as unknown as jest.Mock).mock.calls[0][0];
    expect(args.Key).toBe('legacy/orgs/x/old-report.pdf');   // uses the legacy storageKey
    expect(args.ResponseContentType).toBe('application/pdf');
    expect(args.ResponseContentDisposition).toMatch(/^inline;/);
  });

  it('still allows async-processing fields (ocr_text) to be updated', async () => {
    const { DocumentVersion } = await import('../models');
    const v = await DocumentVersion.findOne({ document_id: createdDocId, version_number: 2 });
    v!.ocr_text = 'extracted text';
    await expect(v!.save()).resolves.toBeTruthy();
  });
});
