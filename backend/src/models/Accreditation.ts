import { Schema, model, Document, Types } from 'mongoose';

/**
 * Accreditation — a structured accreditation authority / programme that a
 * Certification Body (Organization type='cb') can hold. Replaces the free-text
 * `cb_profile.accreditations: string[]` with a real referenceable entity so a
 * CB's accreditation can be verified, dated, and matched precisely.
 *
 * This is catalog data (few rows, shared across CBs) — not per-customer data.
 */
export type AccreditationStatus = 'active' | 'expired' | 'suspended' | 'archived';

export interface IAccreditation extends Document {
  name: string;                 // "National Accreditation Board for Certification Bodies"
  code: string;                 // short unique key, e.g. "NABCB", "UKAS", "DAC"
  country_code?: string;        // ISO 3166-1 alpha-2 of the accreditation authority
  description?: string;
  website?: string;
  verification_source?: string; // where this accreditation can be independently checked
  status: AccreditationStatus;

  created_by?: Types.ObjectId;
  updated_by?: Types.ObjectId;
  deleted_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const AccreditationSchema = new Schema<IAccreditation>(
  {
    name:                { type: String, required: true, trim: true },
    code:                { type: String, required: true, trim: true, uppercase: true },
    country_code:        { type: String, trim: true, uppercase: true, minlength: 2, maxlength: 2 },
    description:         { type: String, trim: true },
    website:             { type: String, trim: true },
    verification_source: { type: String, trim: true },
    status:              { type: String, enum: ['active', 'expired', 'suspended', 'archived'], default: 'active', index: true },

    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User' },
    deleted_at: { type: Date, index: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

// Unique short code among live rows (sparse-safe via partial filter on deleted_at).
AccreditationSchema.index({ code: 1 }, { unique: true, partialFilterExpression: { deleted_at: null } });
AccreditationSchema.index({ name: 'text' });

// Mirror the project-wide soft-delete convention (see Organization/Application).
AccreditationSchema.pre(/^find/, function (this: any) {
  if (!this.getOptions().includeDeleted) this.where({ deleted_at: null });
});

export const Accreditation = model<IAccreditation>('Accreditation', AccreditationSchema);
