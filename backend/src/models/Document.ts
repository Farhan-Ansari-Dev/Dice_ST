import { Schema, model, Document as MongooseDoc, Types } from 'mongoose';

/**
 * A LOGICAL document (e.g. "BIS Test Report for Product X").
 * The actual file content lives in document_versions — this is the pointer.
 *
 * Pattern: parent doc holds current_version_id (denormalized for fast reads).
 * All previous versions are queryable from document_versions by document_id.
 */
export interface IDocument extends MongooseDoc {
  org_id: Types.ObjectId;
  uploaded_by: Types.ObjectId;

  // Identity
  name: string;
  doc_type: string;                       // "test_report", "trademark", "factory_license", "invoice", etc.
  category?: string;                      // "supporting_document", "compliance_evidence", "internal_note"

  // Linkage — a doc can be associated with multiple resources
  application_ids: Types.ObjectId[];
  certification_id?: Types.ObjectId;
  product_id?: Types.ObjectId;

  // Versioning pointers (denormalized for read speed)
  current_version_id: Types.ObjectId;
  version_count: number;

  // Search & organisation
  tags: string[];
  description?: string;

  // Access control
  visibility: 'private' | 'org' | 'shared_external';
  shared_with: Types.ObjectId[];          // user ids with explicit access (beyond org)

  // Compliance / legal
  retention_until?: Date;                 // legal-hold until — cannot delete until this date
  is_legal_hold: boolean;
  pii_classification: 'none' | 'low' | 'medium' | 'high';   // for GDPR/DPDP handling

  // Lifecycle
  archived_at?: Date;
  deleted_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const DocumentSchema = new Schema<IDocument>(
  {
    // Optional: staff users have no Organization (same as Payment.org_id)
    org_id:      { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    uploaded_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    name:     { type: String, required: true, trim: true },
    doc_type: { type: String, required: true, index: true },
    category: { type: String },

    application_ids:  [{ type: Schema.Types.ObjectId, ref: 'Application', index: true }],
    certification_id: { type: Schema.Types.ObjectId, ref: 'Certification', index: true },
    product_id:       { type: Schema.Types.ObjectId, ref: 'Product', index: true },

    current_version_id: { type: Schema.Types.ObjectId, ref: 'DocumentVersion', required: true },
    version_count:      { type: Number, default: 1 },

    tags:        { type: [String], default: [], index: true },
    description: String,

    visibility:  { type: String, enum: ['private', 'org', 'shared_external'], default: 'org' },
    shared_with: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    retention_until:    Date,
    is_legal_hold:      { type: Boolean, default: false, index: true },
    pii_classification: { type: String, enum: ['none', 'low', 'medium', 'high'], default: 'low' },

    archived_at: Date,
    deleted_at:  { type: Date, index: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Indexes
DocumentSchema.index({ org_id: 1, doc_type: 1, created_at: -1 });
DocumentSchema.index({ org_id: 1, created_at: -1 });
DocumentSchema.index({ application_ids: 1 });
DocumentSchema.index({ name: 'text', description: 'text', tags: 'text' });

// Prevent deletion when legal-hold or retention-locked
(DocumentSchema as any).pre("deleteOne", { document: true }, function (this: any, next: any) {
  if (this.is_legal_hold) return next(new Error('Cannot delete: document is under legal hold'));
  if (this.retention_until && this.retention_until > new Date()) {
    return next(new Error(`Cannot delete: retention until ${this.retention_until.toISOString()}`));
  }
  });

DocumentSchema.pre(/^find/, function (this: any) {
  if (!this.getOptions().includeDeleted) this.where({ deleted_at: null });
});

export const Document = model<IDocument>('Document', DocumentSchema);
