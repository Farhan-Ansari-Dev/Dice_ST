import { Schema, model, Document, Types } from 'mongoose';

/**
 * CertificationBodyScope — one structured statement of what a Certification Body
 * (Organization type='cb') is accredited to do: a specific certification/scheme,
 * for specific product categories / industries, in specific markets, under a
 * specific accreditation and service type, with a validity window.
 *
 * This is the precise, matchable alternative to the CB's free-text
 * `cb_profile.scope`. A CB has many scopes. The matching engine (cbMatchingService)
 * reads these — never free text — to decide eligibility and score.
 *
 * Representations deliberately mirror the rest of DICE so nothing is duplicated:
 *   - cert_type: string          (same keys as Application.cert_type / allowed_cert_types)
 *   - product_categories: string (same as Product.category / cb_profile.product_categories)
 *   - markets: ISO alpha-2 codes (same as Application.manual_review.requested_markets / Country.code)
 *   - standard_id / accreditation_id: refs to the real catalog entities where present
 */
export type CBScopeStatus = 'draft' | 'active' | 'expired' | 'suspended' | 'archived';

export interface ICertificationBodyScope extends Document {
  certification_body_id: Types.ObjectId;   // Organization(type='cb')
  cert_type: string;                       // the certification/scheme this scope covers
  standard_id?: Types.ObjectId;            // CertificationStandard (optional)
  product_categories: string[];            // empty = all categories under this cert
  industries: string[];                    // empty = all industries
  markets: string[];                       // ISO alpha-2 codes; empty = all supported markets
  service_type?: string;                   // e.g. "product_certification", "type_approval"
  accreditation_id?: Types.ObjectId;       // Accreditation backing this scope
  scope_description?: string;
  document_ids: Types.ObjectId[];          // evidence (Document refs) — internal, never public

  status: CBScopeStatus;
  valid_from?: Date;
  valid_until?: Date;

  verified_by?: Types.ObjectId;
  verified_at?: Date;

  created_by?: Types.ObjectId;
  updated_by?: Types.ObjectId;
  deleted_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const CertificationBodyScopeSchema = new Schema<ICertificationBodyScope>(
  {
    certification_body_id: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    cert_type:             { type: String, required: true, trim: true, index: true },
    standard_id:           { type: Schema.Types.ObjectId, ref: 'CertificationStandard' },
    product_categories:    { type: [String], default: [] },
    industries:            { type: [String], default: [] },
    markets:               { type: [String], default: [] },   // stored upper-cased (setter below)
    service_type:          { type: String, trim: true },
    accreditation_id:      { type: Schema.Types.ObjectId, ref: 'Accreditation' },
    scope_description:      { type: String, trim: true },
    document_ids:          [{ type: Schema.Types.ObjectId, ref: 'Document' }],

    status:     { type: String, enum: ['draft', 'active', 'expired', 'suspended', 'archived'], default: 'draft', index: true },
    valid_from:  { type: Date },
    valid_until: { type: Date, index: true },

    verified_by: { type: Schema.Types.ObjectId, ref: 'User' },
    verified_at: { type: Date },

    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User' },
    deleted_at: { type: Date, index: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

// Normalise market codes to ISO alpha-2 upper-case for exact matching.
CertificationBodyScopeSchema.path('markets').set((v: string[]) =>
  Array.isArray(v) ? v.map((m) => String(m).trim().toUpperCase()).filter(Boolean) : v,
);

// Matching hot paths: by CB, and by (cert_type, status) fan-outs.
CertificationBodyScopeSchema.index({ certification_body_id: 1, cert_type: 1, status: 1 });
CertificationBodyScopeSchema.index({ cert_type: 1, status: 1, markets: 1 });

CertificationBodyScopeSchema.pre(/^find/, function (this: any) {
  if (!this.getOptions().includeDeleted) this.where({ deleted_at: null });
});

export const CertificationBodyScope = model<ICertificationBodyScope>('CertificationBodyScope', CertificationBodyScopeSchema);
