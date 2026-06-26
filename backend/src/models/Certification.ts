import { Schema, model, Document, Types } from 'mongoose';

export type CertificationStatus =
  | 'active'           // issued, in validity
  | 'expiring_soon'    // computed via cron — auto-flipped 30 days before expiry
  | 'expired'
  | 'renewed'          // superseded by new cert
  | 'revoked'
  | 'suspended';

export interface ICertification extends Document {
  cert_number: string;                    // e.g. "CM/L-7654321"
  cert_type: string;                      // "BIS_CRS"
  org_id: Types.ObjectId;
  product_id: Types.ObjectId;
  application_id: Types.ObjectId;         // approved application that produced this

  issuing_body: string;                   // "Bureau of Indian Standards"
  scheme: string;                         // e.g. "IS 13252 (Part 1)"

  issue_date: Date;
  expiry_date: Date;
  validity_period_months: number;

  status: CertificationStatus;
  status_changed_at: Date;
  revocation_reason?: string;

  // Files
  certificate_document_id?: Types.ObjectId;    // ref to Document — the official cert PDF
  test_report_document_ids: Types.ObjectId[];

  // Renewal chain (linked list)
  predecessor_cert_id?: Types.ObjectId;        // cert this one renewed
  successor_cert_id?: Types.ObjectId;          // cert that renewed this one
  renewal_due_at?: Date;                       // when to start renewal process (~60 days before expiry)

  // Metadata
  scope?: string;                              // what's covered (product variants, etc.)
  notes?: string;
  tags: string[];

  // Public verification (optional)
  public_verifiable: boolean;
  verification_url?: string;

  deleted_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const CertificationSchema = new Schema<ICertification>(
  {
    cert_number:    { type: String, required: true, unique: true, index: true },
    cert_type:      { type: String, required: true, index: true },
    org_id:         { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    product_id:     { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    application_id: { type: Schema.Types.ObjectId, ref: 'Application', required: true, index: true },

    issuing_body: { type: String, required: true },
    scheme:       { type: String, required: true },

    issue_date:             { type: Date, required: true },
    expiry_date:            { type: Date, required: true, index: true },
    validity_period_months: { type: Number, default: 12 },

    status:            { type: String, enum: ['active', 'expiring_soon', 'expired', 'renewed', 'revoked', 'suspended'], default: 'active', index: true },
    status_changed_at: { type: Date, default: Date.now },
    revocation_reason: String,

    certificate_document_id: { type: Schema.Types.ObjectId, ref: 'Document' },
    test_report_document_ids: [{ type: Schema.Types.ObjectId, ref: 'Document' }],

    predecessor_cert_id: { type: Schema.Types.ObjectId, ref: 'Certification' },
    successor_cert_id:   { type: Schema.Types.ObjectId, ref: 'Certification' },
    renewal_due_at:      { type: Date, index: true },

    scope: String,
    notes: String,
    tags:  { type: [String], default: [] },

    public_verifiable: { type: Boolean, default: false },
    verification_url:  String,

    deleted_at: { type: Date, index: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Critical indexes
CertificationSchema.index({ org_id: 1, status: 1, expiry_date: 1 });
CertificationSchema.index({ expiry_date: 1, status: 1 });                // for expiry-cron (range scan)
CertificationSchema.index({ org_id: 1, cert_type: 1, issue_date: -1 });

// Auto-flip "expiring_soon" + "expired" via a daily job (see jobs/certificationLifecycle.ts)
CertificationSchema.statics.computeStatus = function (cert: ICertification): CertificationStatus {
  const now = Date.now();
  const expiryMs = cert.expiry_date.getTime();
  const daysToExpiry = (expiryMs - now) / (1000 * 60 * 60 * 24);

  if (cert.status === 'revoked' || cert.status === 'renewed' || cert.status === 'suspended') {
    return cert.status;
  }
  if (daysToExpiry < 0) return 'expired';
  if (daysToExpiry <= 30) return 'expiring_soon';
  return 'active';
};

CertificationSchema.pre(/^find/, function (this: any) {
  if (!this.getOptions().includeDeleted) this.where({ deleted_at: null });
});

export const Certification = model<ICertification>('Certification', CertificationSchema);
