import { Schema, model, Document as MongooseDoc, Types } from 'mongoose';

/**
 * IMMUTABLE — never updated after creation.
 *
 * One row per upload. The parent Document.current_version_id points
 * at the latest one. Old versions remain queryable for audit.
 *
 * Storage: file content is in S3, identified by s3_key.
 *          sha256 makes each version content-addressable (dedupe possible).
 */
export interface IDocumentVersion extends MongooseDoc {
  document_id: Types.ObjectId;
  version_number: number;                 // 1, 2, 3...

  // S3 reference
  s3_bucket: string;
  s3_key: string;                         // e.g. orgs/{org_id}/docs/{doc_id}/v{n}-{filename}
  s3_region: string;

  // Content metadata
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  sha256: string;                         // integrity + dedupe key
  page_count?: number;                    // for PDFs

  // Capture context
  uploaded_by: Types.ObjectId;
  uploaded_at: Date;
  upload_ip?: string;
  upload_user_agent?: string;
  change_reason?: string;                 // "addressed reviewer comments", etc.

  // Processing outputs (filled async after upload)
  ocr_text?: string;                      // full-text indexed via $text index
  ai_extracted?: {
    summary?: string;
    key_fields?: Record<string, any>;     // e.g. { gst: "...", date: "...", parties: [...] }
    compliance_score?: number;            // 0–100, AI's confidence the doc is compliant
    issues?: string[];
  };
  thumbnail_s3_key?: string;
  virus_scan?: {
    scanned_at: Date;
    clean: boolean;
    engine: string;
  };

  // Cryptographic signing (optional — for legal-grade evidence)
  signature?: {
    algorithm: string;
    value: string;
    signed_at: Date;
    cert_chain_s3_key?: string;
  };
}

const DocumentVersionSchema = new Schema<IDocumentVersion>(
  {
    document_id:    { type: Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
    version_number: { type: Number, required: true },

    s3_bucket: { type: String, required: true },
    s3_key:    { type: String, required: true },
    s3_region: { type: String, default: 'ap-south-1' },

    original_filename: { type: String, required: true },
    mime_type:         { type: String, required: true },
    size_bytes:        { type: Number, required: true },
    sha256:            { type: String, required: true, index: true },
    page_count:        Number,

    uploaded_by:       { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    uploaded_at:       { type: Date, default: Date.now, index: true },
    upload_ip:         String,
    upload_user_agent: String,
    change_reason:     String,

    ocr_text: { type: String },
    ai_extracted: {
      summary:          String,
      key_fields:       { type: Schema.Types.Mixed, default: {} },
      compliance_score: Number,
      issues:           [String],
    },
    thumbnail_s3_key: String,
    virus_scan: {
      scanned_at: Date,
      clean:      Boolean,
      engine:     String,
    },

    signature: {
      algorithm:         String,
      value:             String,
      signed_at:         Date,
      cert_chain_s3_key: String,
    },
  },
  { timestamps: false }                   // immutable — no updated_at
);

// Unique version per document
DocumentVersionSchema.index({ document_id: 1, version_number: -1 }, { unique: true });
// Dedupe / integrity lookup
DocumentVersionSchema.index({ sha256: 1 });
// Full-text search on OCR'd content
DocumentVersionSchema.index({ ocr_text: 'text', 'ai_extracted.summary': 'text' });

// IMMUTABILITY GUARDS
(DocumentVersionSchema as any).pre("save", function (this: any, next: any) {
  if (!this.isNew) {
    // Allow only specific async-processing fields to be updated
    const allowedUpdates = ['ocr_text', 'ai_extracted', 'thumbnail_s3_key', 'virus_scan', 'signature'];
    const modified = this.modifiedPaths();
    const forbidden = modified.filter((p: string) => !allowedUpdates.some(a => p.startsWith(a)));
    if (forbidden.length) {
      return next(new Error(`DocumentVersion is immutable. Forbidden modifications: ${forbidden.join(',')}`));
    }
  }
  });

(DocumentVersionSchema as any).pre("deleteOne", { document: true }, function (this: any, next: any) {
  next(new Error('DocumentVersion cannot be deleted — versions are immutable for audit'));
});

export const DocumentVersion = model<IDocumentVersion>('DocumentVersion', DocumentVersionSchema);
