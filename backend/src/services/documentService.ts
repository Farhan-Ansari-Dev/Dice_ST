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

const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'ap-south-1' });
const BUCKET = process.env.AWS_S3_BUCKET ?? 'sanyog-conformity-docs';
const PRESIGN_TTL = parseInt(process.env.AWS_S3_PRESIGNED_URL_EXPIRES ?? '900', 10); // 15 min

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

    const cmd = new PutObjectCommand({
      Bucket: BUCKET,
      Key: s3_key,
      ContentType: input.mime_type,
      ContentLength: input.size_bytes,
      ServerSideEncryption: 'AES256',
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
    // Verify file actually exists in S3
    try {
      await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: input.s3_key }));
    } catch {
      throw new Error('S3 object not found — did client complete the upload?');
    }

    // Determine version number
    let documentId = input.document_id;
    let versionNumber = 1;

    if (documentId) {
      const existing = await Document.findOne({ _id: documentId, org_id: input.org_id });
      if (!existing) throw new Error('Document not found or access denied');
      versionNumber = existing.version_count + 1;
    }

    // Create immutable version first
    const version = await DocumentVersion.create({
      document_id: documentId ?? new Types.ObjectId(),  // temporary if new doc
      version_number: versionNumber,
      s3_bucket: BUCKET,
      s3_key: input.s3_key,
      s3_region: process.env.AWS_REGION ?? 'ap-south-1',
      original_filename: input.name,
      mime_type: input.mime_type,
      size_bytes: input.size_bytes,
      sha256: input.sha256,
      uploaded_by: input.user_id,
      uploaded_at: new Date(),
      upload_ip: input.ip,
      upload_user_agent: input.user_agent,
      change_reason: input.change_reason,
    });

    let doc;
    if (documentId) {
      // Update existing document — point at new version
      doc = await Document.findByIdAndUpdate(
        documentId,
        {
          $set: { current_version_id: version._id },
          $inc: { version_count: 1 },
        },
        { new: true }
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
      // Create new document with version pointer
      doc = await Document.create({
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
      // Repoint the version at the actual document id
      version.document_id = doc._id as Types.ObjectId;
      await version.save();

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
  async getDownloadUrl(documentId: Types.ObjectId, versionNumber?: number, requesterId?: Types.ObjectId): Promise<string> {
    const doc = await Document.findById(documentId);
    if (!doc) throw new Error('Document not found');

    let version;
    if (versionNumber) {
      version = await DocumentVersion.findOne({ document_id: documentId, version_number: versionNumber });
    } else {
      version = await DocumentVersion.findById(doc.current_version_id);
    }
    if (!version) throw new Error('Version not found');

    if (requesterId) {
      await audit({
        actor: requesterId,
        org_id: doc.org_id,
        resource_type: 'document',
        resource_id: doc._id as Types.ObjectId,
        action: 'downloaded',
        after: { version: version.version_number },
      });
    }

    const cmd = new GetObjectCommand({
      Bucket: version.s3_bucket,
      Key: version.s3_key,
      ResponseContentDisposition: `attachment; filename="${version.original_filename}"`,
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
