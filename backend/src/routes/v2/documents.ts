/**
 * Document routes — S3 presigned uploads + immutable versioning.
 */
import { Router, Response } from 'express';
import { Types } from 'mongoose';
import { Document, DocumentVersion } from '../../models';
import { documentService } from '../../services/documentService';
import { authenticate, AuthRequest } from '../../middleware/authMongo';

const router = Router();
router.use(authenticate);

// Step 1: Get presigned URL for direct browser-to-S3 upload
router.post('/presign', async (req: AuthRequest, res: Response) => {
  const { filename, mime_type, size_bytes, sha256, doc_type, document_id } = req.body;
  if (!filename || !mime_type || !size_bytes || !sha256 || !doc_type) {
    return res.status(400).json({ error: 'missing_fields' });
  }

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
router.post('/finalize', async (req: AuthRequest, res: Response) => {
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
  const filter: any = { org_id: req.user!.org_id };
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
  const doc = await Document.findOne({ _id: req.params.id, org_id: req.user!.org_id });
  if (!doc) return res.status(404).json({ error: 'not_found' });

  const url = await documentService.getDownloadUrl(
    doc._id as any,
    version ? parseInt(version as string, 10) : undefined,
    req.user!._id as any
  );
  return res.json({ data: { url, expires_in: 900 } });
});

// List all versions of a document
router.get('/:id/versions', async (req: AuthRequest, res: Response) => {
  const doc = await Document.findOne({ _id: req.params.id, org_id: req.user!.org_id });
  if (!doc) return res.status(404).json({ error: 'not_found' });

  const versions = await documentService.listVersions(doc._id as any);
  return res.json({ data: versions });
});

export default router;
