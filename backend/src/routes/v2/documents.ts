/**
 * Document routes — S3 presigned uploads + immutable versioning.
 */
import { Router, Response } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { Document, DocumentVersion } from '../../models';
import { documentService } from '../../services/documentService';
import { validate } from '../../middleware/validate';
import { authenticate, requireRole, ADMIN_ROLES, AuthRequest } from '../../middleware/authMongo';

const router = Router();
router.use(authenticate);

// Explicit tenancy scoping: admins/staff see all documents; everyone else is
// restricted to their own org. A non-admin without an org sees NOTHING — rather
// than relying on Mongoose silently dropping an `undefined` filter (→ all docs).
function orgScope(req: AuthRequest): Record<string, any> {
  if (ADMIN_ROLES.includes(req.user!.role as any)) return {};
  const org = req.user!.org_id;
  return org ? { org_id: org } : { _id: null };
}

// Server-side validation (never trust client input). Valid requests pass
// through unchanged; passthrough keeps any additional fields the handler reads.
const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'invalid id');
const presignSchema = {
  body: z.object({
    filename: z.string().min(1).max(512),
    mime_type: z.string().min(1).max(255),
    size_bytes: z.number().int().nonnegative(),
    sha256: z.string().min(1).max(128),
    doc_type: z.string().min(1).max(64),
    document_id: objectId.optional(),
  }).passthrough(),
};
const finalizeSchema = {
  body: z.object({
    s3_key: z.string().min(1).max(1024),
    name: z.string().min(1).max(512),
    doc_type: z.string().min(1).max(64),
    mime_type: z.string().min(1).max(255),
    size_bytes: z.number().int().nonnegative(),
    sha256: z.string().min(1).max(128),
    document_id: objectId.optional(),
    application_id: objectId.optional(),
    change_reason: z.string().max(1000).optional(),
    description: z.string().max(4000).optional(),
    tags: z.array(z.string().max(64)).optional(),
  }).passthrough(),
};

// Step 1: Get presigned URL for direct browser-to-S3 upload
router.post('/presigned-url', async (req: AuthRequest, res: Response) => {
  const { filename, mime_type, content_type, size_bytes, sha256, doc_type, document_id } = req.body;
  const mimeType = mime_type || content_type;
  if (!filename || !mimeType) {
    return res.status(400).json({ error: 'missing_fields' });
  }

  try {
    const result = await documentService.presignUpload({
      org_id: req.user!.org_id!,
      user_id: req.user!._id as any,
      filename,
      mime_type: mimeType,
      size_bytes: size_bytes || 0,
      sha256: sha256 || '',
      doc_type: doc_type || 'general',
      document_id: document_id ? new Types.ObjectId(document_id) : undefined,
    });
    return res.json({ data: { uploadUrl: result.url, key: result.s3_key, publicUrl: result.url } });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

router.post('/presign', validate(presignSchema), async (req: AuthRequest, res: Response) => {
  const { filename, mime_type, size_bytes, sha256, doc_type, document_id } = req.body;

  try {
    const result = await documentService.presignUpload({
      org_id: req.user!.org_id!,
      user_id: req.user!._id as any,
      filename,
      mime_type,
      size_bytes,
      sha256,
      doc_type,
      document_id: document_id ? new Types.ObjectId(document_id) : undefined,
    });
    return res.json({ data: result });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Step 2: After client uploads to S3, finalize the metadata
router.post('/finalize', validate(finalizeSchema), async (req: AuthRequest, res: Response) => {
  const { s3_key, name, doc_type, mime_type, size_bytes, sha256, document_id, application_id, change_reason, description, tags } = req.body;

  try {
    const { document, version } = await documentService.finalizeUpload({
      org_id: req.user!.org_id!,
      user_id: req.user!._id as any,
      s3_key, name, doc_type, mime_type, size_bytes, sha256,
      document_id: document_id ? new Types.ObjectId(document_id) : undefined,
      application_id: application_id ? new Types.ObjectId(application_id) : undefined,
      change_reason, description, tags,
      ip: req.ip,
      user_agent: req.get('user-agent'),
    });
    return res.status(201).json({ data: { document, version } });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// List documents
router.get('/', async (req: AuthRequest, res: Response) => {
  const { application_id, doc_type, q, page = '1', limit = '20' } = req.query as Record<string, string>;
  const filter: any = { ...orgScope(req) };
  if (application_id) filter.application_ids = application_id;
  if (doc_type) filter.doc_type = doc_type;
  if (q) filter.$text = { $search: q };

  const pageN = parseInt(page, 10);
  const limitN = Math.min(parseInt(limit, 10), 100);

  const [items, total] = await Promise.all([
    Document.find(filter)
      .sort({ created_at: -1 })
      .skip((pageN - 1) * limitN)
      .limit(limitN)
      .populate('current_version_id')
      .populate('uploaded_by', 'name email')
      .lean(),
    Document.countDocuments(filter),
  ]);

  return res.json({
    data: items,
    pagination: { page: pageN, limit: limitN, total },
  });
});

// Get a download URL (presigned, short-lived)
router.get('/:id/download', async (req: AuthRequest, res: Response) => {
  const { version } = req.query;
  const doc = await Document.findOne({ _id: req.params.id, ...orgScope(req) });
  if (!doc) return res.status(404).json({ error: 'not_found' });

  const url = await documentService.getDownloadUrl(
    doc._id as any,
    version ? parseInt(version as string, 10) : undefined,
    req.user!._id as any
  );
  return res.json({ data: { url, expires_in: 900 } });
});

// Get a preview URL (presigned, short-lived, inline). Separate from download so
// the browser renders PDFs/images in-tab instead of forcing a file download.
router.get('/:id/preview', async (req: AuthRequest, res: Response) => {
  const { version } = req.query;
  const doc = await Document.findOne({ _id: req.params.id, ...orgScope(req) });
  if (!doc) return res.status(404).json({ error: 'not_found' });

  const url = await documentService.getDownloadUrl(
    doc._id as any,
    version ? parseInt(version as string, 10) : undefined,
    req.user!._id as any,
    'inline'
  );
  return res.json({ data: { url, expires_in: 900 } });
});

// Soft-delete a document (S3 objects retained for audit/versioning immutability)
router.delete('/:id', requireRole(...ADMIN_ROLES, 'employee'), async (req: AuthRequest, res: Response) => {
  const filter: any = { _id: req.params.id, ...orgScope(req) };
  const doc = await Document.findOneAndUpdate(
    filter,
    { deleted_at: new Date() },
    { returnDocument: 'after' }
  );
  if (!doc) return res.status(404).json({ error: 'not_found' });
  return res.json({ data: { id: doc._id }, message: 'Deleted successfully' });
});

// List all versions of a document
router.get('/:id/versions', async (req: AuthRequest, res: Response) => {
  const doc = await Document.findOne({ _id: req.params.id, org_id: req.user!.org_id });
  if (!doc) return res.status(404).json({ error: 'not_found' });

  const versions = await documentService.listVersions(doc._id as any);
  return res.json({ data: versions });
});

export default router;
