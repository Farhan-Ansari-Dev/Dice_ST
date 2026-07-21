/**
 * Document service — upload, version, retrieve.
 *
 * Flow:
 *   1. Client calls POST /documents/presign with { name, doc_type, sha256, size }
 *   2. Server returns presigned PUT URL → client uploads directly to S3
 *   3. Client POSTs /documents/finalize with the s3_key
 *   4. Server records Document + DocumentVersion atomically
 *
 * For replacing a version:
 *   POST /documents/:id/versions with same flow → creates v(n+1)
 *
 * Why presigned URLs: 100 MB cert PDFs don't pass through the API server
 *   - cheaper bandwidth, faster uploads, no server memory pressure
 */
import crypto from 'crypto';
import { Types } from 'mongoose';
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Document, DocumentVersion, audit } from '../models';
import { logger } from '../utils/logger';

const s3 = new S3Client({
  region: process.env.AWS_REGION ?? 'ap-south-1',
  requestChecksumCalculation: "WHEN_REQUIRED",
});
const BUCKET = process.env.AWS_S3_BUCKET ?? 'sanyog-conformity-docs';
const PRESIGN_TTL = parseInt(process.env.AWS_S3_PRESIGNED_URL_EXPIRES ?? '900', 10); // 15 min

// Build a safe Content-Disposition. The filename is client-supplied, so strip
// CR/LF/quotes/non-ASCII for the fallback (prevents header injection) and add an
// RFC 5987 UTF-8 form so non-ASCII names still render correctly.
function contentDisposition(disposition: 'inline' | 'attachment', filename: string): string {
  const fallback = (filename || 'download').replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  const encoded = encodeURIComponent(filename || 'download')
    .replace(/['()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
  return `${disposition}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

export interface PresignUploadInput {
  org_id: Types.ObjectId;
  user_id: Types.ObjectId;
  filename: string;
  mime_type: string;
  size_bytes: number;
  sha256: string;
  doc_type: string;
  document_id?: Types.ObjectId;  // pass for new version, omit for new document
}

export const documentService = {
  /**
   * Step 1: Generate presigned URL for direct browser-to-S3 upload.
   */
  async presignUpload(input: PresignUploadInput) {
    if (input.size_bytes > 100 * 1024 * 1024) {
      throw new Error('File too large (max 100 MB). Use multipart for larger files.');
    }
    const safeName = input.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const versionNum = input.document_id
      ? (await DocumentVersion.countDocuments({ document_id: input.document_id })) + 1
      : 1;
    // Admin/staff users have no Organization — store their uploads under 'platform'
    const orgSegment = input.org_id ? input.org_id.toString() : 'platform';
    const s3_key = `orgs/${orgSegment}/docs/${input.document_id ?? 'new-' + crypto.randomUUID()}/v${versionNum}-${safeName}`;

    // Phase 1: drop ContentLength + ServerSideEncryption only. Both become signed
    // request headers that a plain browser fetch(PUT) omits → SignatureDoesNotMatch
    // (403). ContentType and Metadata are retained.
    const cmd = new PutObjectCommand({
      Bucket: BUCKET,
      Key: s3_key,
      ContentType: input.mime_type,
      Metadata: {
        sha256: input.sha256,
        org_id: orgSegment,
        uploaded_by: input.user_id.toString(),
      },
    });
    const url = await getSignedUrl(s3, cmd, { expiresIn: PRESIGN_TTL });

    return { url, s3_key, expires_in: PRESIGN_TTL, version_number: versionNum };
  },

  /**
   * Step 2: After client uploads, verify the object exists and record metadata.
   */
  async finalizeUpload(input: {
    org_id: Types.ObjectId;
    user_id: Types.ObjectId;
    s3_key: string;
    document_id?: Types.ObjectId;     // omit → create new logical document
    name: string;
    doc_type: string;
    mime_type: string;
    size_bytes: number;
    sha256: string;
    change_reason?: string;
    application_id?: Types.ObjectId;
    description?: string;
    tags?: string[];
    ip?: string;
    user_agent?: string;
  }) {
    // Verify the file exists in S3 AND read its authoritative metadata. Never
    // trust the client's size/mime — take ContentLength/ContentType/ETag from S3.
    // Surface the underlying AWS error (AccessDenied / NoSuchKey / region mismatch)
    // instead of swallowing it behind a generic "not found" message.
    let head;
    try {
      head = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: input.s3_key }));
    } catch (e: any) {
      logger.error(
        `[documents.finalize] HeadObject failed ` +
        `name=${e?.name} code=${e?.Code ?? e?.code} httpStatusCode=${e?.$metadata?.httpStatusCode} ` +
        `bucket=${BUCKET} key=${input.s3_key} region=${process.env.AWS_REGION ?? 'ap-south-1'} ` +
        `message=${e?.message}`
      );
      throw new Error('S3 object not found — did client complete the upload?');
    }

    // Authoritative metadata from S3 (fall back to client only when S3 omits a
    // field — a real object always returns ContentLength).
    const sizeBytes = head.ContentLength ?? input.size_bytes;
    const mimeType = head.ContentType ?? input.mime_type;
    const etag = head.ETag;
    if (sizeBytes > 100 * 1024 * 1024) {
      throw new Error('File too large (max 100 MB).');
    }

    // Determine version number. For a brand-new logical document, generate its
    // _id up front so the version is created with its FINAL document_id in one
    // shot — no post-creation repointing (which the immutability guard correctly
    // forbids). document_id is thus assigned exactly once, at creation.
    const isNewDocument = !input.document_id;
    const documentId = input.document_id ?? new Types.ObjectId();
    let versionNumber = 1;

    if (!isNewDocument) {
      const existing = await Document.findOne({ _id: documentId, org_id: input.org_id });
      if (!existing) throw new Error('Document not found or access denied');
      versionNumber = existing.version_count + 1;
    }

    // Create immutable version first, already pointing at its final document_id.
    const version = await DocumentVersion.create({
      document_id: documentId,
      version_number: versionNumber,
      s3_bucket: BUCKET,
      s3_key: input.s3_key,
      s3_region: process.env.AWS_REGION ?? 'ap-south-1',
      original_filename: input.name,
      mime_type: mimeType,
      size_bytes: sizeBytes,
      sha256: input.sha256,
      etag,
      processing_status: 'ready',
      uploaded_by: input.user_id,
      uploaded_at: new Date(),
      upload_ip: input.ip,
      upload_user_agent: input.user_agent,
      change_reason: input.change_reason,
    });

    let doc;
    if (!isNewDocument) {
      // Update existing document — point at new version
      doc = await Document.findByIdAndUpdate(
        documentId,
        {
          $set: { current_version_id: version._id },
          $inc: { version_count: 1 },
        },
        { returnDocument: 'after' }
      );
      await audit({
        actor: input.user_id,
        org_id: input.org_id,
        resource_type: 'document',
        resource_id: documentId,
        action: 'document_replaced',
        after: { version: versionNumber, s3_key: input.s3_key, sha256: input.sha256 },
        ip: input.ip,
        user_agent: input.user_agent,
      });
    } else {
      // Create the logical document with the pre-generated _id so it matches the
      // version's document_id. No repointing → the immutability guard is never hit.
      doc = await Document.create({
        _id: documentId,
        org_id: input.org_id,
        uploaded_by: input.user_id,
        name: input.name,
        doc_type: input.doc_type,
        application_ids: input.application_id ? [input.application_id] : [],
        current_version_id: version._id,
        version_count: 1,
        tags: input.tags ?? [],
        description: input.description,
      });

      await audit({
        actor: input.user_id,
        org_id: input.org_id,
        resource_type: 'document',
        resource_id: doc._id as Types.ObjectId,
        action: 'document_uploaded',
        after: { name: doc.name, doc_type: doc.doc_type, s3_key: input.s3_key },
        ip: input.ip,
        user_agent: input.user_agent,
      });
    }

    // Trigger async post-processing (OCR, virus scan, AI extraction)
    // In production: emit SQS message or call Lambda
    // queueProcessing(version._id);

    return { document: doc, version };
  },

  /**
   * Generate a time-limited download URL for a specific version.
   * Default = current version.
   */
  async getDownloadUrl(
    documentId: Types.ObjectId,
    versionNumber?: number,
    requesterId?: Types.ObjectId,
    disposition: 'inline' | 'attachment' = 'attachment',
  ): Promise<string> {
    const doc = await Document.findById(documentId);
    if (!doc) throw new Error('Document not found');

    let version;
    if (versionNumber) {
      version = await DocumentVersion.findOne({ document_id: documentId, version_number: versionNumber });
    } else if (doc.current_version_id) {
      version = await DocumentVersion.findById(doc.current_version_id);
    }

    // ── Backward compatibility ───────────────────────────────────────────────
    // Documents migrated from the previous backend have NO DocumentVersion — the
    // S3 reference lives directly on the Document (storageKey / mimeType /
    // originalName). Fall back to it so preview and download keep working for
    // pre-existing production documents instead of throwing "Version not found".
    if (!version) {
      const legacy = (await Document.findById(documentId).lean()) as any;
      const key: string | undefined = legacy?.storageKey ?? legacy?.s3_key;
      if (!key) throw new Error('Version not found');
      if (requesterId) {
        await audit({
          actor: requesterId,
          org_id: doc.org_id,
          resource_type: 'document',
          resource_id: doc._id as Types.ObjectId,
          action: disposition === 'inline' ? 'viewed' : 'downloaded',
          after: { legacy: true },
        });
      }
      const legacyMime: string | undefined = legacy?.mimeType ?? legacy?.mime_type;
      const legacyCmd = new GetObjectCommand({
        Bucket: legacy?.s3_bucket ?? legacy?.storageBucket ?? BUCKET,
        Key: key,
        ...(legacyMime ? { ResponseContentType: legacyMime } : {}),
        ResponseContentDisposition: contentDisposition(disposition, legacy?.originalName ?? legacy?.name ?? 'document'),
      });
      return getSignedUrl(s3, legacyCmd, { expiresIn: PRESIGN_TTL });
    }

    if (requesterId) {
      await audit({
        actor: requesterId,
        org_id: doc.org_id,
        resource_type: 'document',
        resource_id: doc._id as Types.ObjectId,
        // Preview (inline) and download (attachment) are distinct auditable events.
        action: disposition === 'inline' ? 'viewed' : 'downloaded',
        after: { version: version.version_number },
      });
    }

    // ResponseContentType makes the browser render inline previews (PDF/image)
    // correctly; disposition selects preview (inline) vs download (attachment).
    const cmd = new GetObjectCommand({
      Bucket: version.s3_bucket,
      Key: version.s3_key,
      ResponseContentType: version.mime_type,
      ResponseContentDisposition: contentDisposition(disposition, version.original_filename),
    });
    return getSignedUrl(s3, cmd, { expiresIn: PRESIGN_TTL });
  },

  /**
   * List all versions of a document (for audit / history UI).
   */
  async listVersions(documentId: Types.ObjectId) {
    return DocumentVersion.find({ document_id: documentId })
      .sort({ version_number: -1 })
      .populate('uploaded_by', 'name email');
  },
};
