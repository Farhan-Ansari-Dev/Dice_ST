import { Schema, model, Document as MongooseDoc, Types } from 'mongoose';

/**
 * UploadTicket — server-side record of a document-upload transaction (H1).
 *
 * The upload flow is presign → client PUTs to S3 → finalize. finalize previously
 * trusted a client-supplied `s3_key`, so an authenticated user could finalize an
 * S3 object they were never allocated (another tenant's file, or any object the
 * app's IAM role can read) and then download it through their own document row.
 *
 * This record is created at presign time and binds the exact server-generated S3
 * key to the authenticated user/org and (for versioning) the target document.
 * finalize looks it up, verifies ownership + key + document, and atomically
 * consumes it (pending → consumed) so it cannot be replayed. A TTL index removes
 * pending tickets that were never finalized; expiry is ALSO checked in code so an
 * un-cleaned ticket is still rejected after it expires.
 */
export interface IUploadTicket extends MongooseDoc {
  s3_key: string;                       // exact server-generated key (authoritative)
  user_id: Types.ObjectId;              // the user this upload was allocated to
  org_id?: Types.ObjectId;              // uploader's org (absent for staff/platform)
  document_id?: Types.ObjectId;         // set when this upload is a new version
  doc_type: string;
  mime_type: string;
  size_bytes: number;
  sha256: string;
  status: 'pending' | 'consumed';
  created_at: Date;
  consumed_at?: Date;
  expires_at: Date;
}

const UploadTicketSchema = new Schema<IUploadTicket>({
  s3_key:      { type: String, required: true, index: true },
  user_id:     { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  org_id:      { type: Schema.Types.ObjectId, ref: 'Organization' },
  document_id: { type: Schema.Types.ObjectId, ref: 'Document' },
  doc_type:    { type: String, required: true },
  mime_type:   { type: String, required: true },
  size_bytes:  { type: Number, required: true },
  sha256:      { type: String, required: true },
  status:      { type: String, enum: ['pending', 'consumed'], default: 'pending', index: true },
  created_at:  { type: Date, default: Date.now },
  consumed_at: { type: Date },
  expires_at:  { type: Date, required: true },
});

// TTL cleanup for never-finalized tickets (expiry is also enforced in code).
UploadTicketSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

export const UploadTicket = model<IUploadTicket>('UploadTicket', UploadTicketSchema);
