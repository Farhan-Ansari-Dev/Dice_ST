import { Schema, model, Document, Types } from 'mongoose';

export interface IOrganization extends Document {
  name: string;
  legal_name?: string;
  type: 'manufacturer' | 'importer' | 'consultant' | 'cb' | 'lab' | 'other';

  // Indian compliance identifiers
  gst_number?: string;
  pan_number?: string;
  iec_code?: string;          // Importer-Exporter Code
  cin?: string;               // Corporate Identification Number

  // Address
  address: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    country_code: string;     // "IN", "AE", etc. — controls data-residency cluster
    pincode?: string;
  };

  contact: {
    email?: string;
    phone?: string;
    website?: string;
  };

  // Branding (white-label support for consultants)
  branding?: {
    logo_url?: string;
    primary_color?: string;
  };

  // Subscription
  subscription: {
    tier: 'free' | 'starter' | 'pro' | 'enterprise';
    seats: number;            // licensed user count
    trial_ends_at?: Date;
    renewed_at?: Date;
    razorpay_customer_id?: string;
    razorpay_subscription_id?: string;
  };

  owner_user_id: Types.ObjectId;

  // Settings
  settings: {
    require_2fa_for_admins: boolean;
    allowed_cert_types: string[];      // empty = all
    notification_preferences: Record<string, boolean>;
  };

  // Certification-Body profile (only meaningful when type='cb'). Powers the
  // "Find a Certification Body" search filters. `settings.allowed_cert_types`
  // remains the hard eligibility filter (which certifications this CB can issue).
  cb_profile?: {
    accreditations: string[];
    scope?: string;
    countries: string[];               // ISO codes the CB is recognised in
    product_categories: string[];
  };

  // Sprint 3 (Ownership Backfill) — marks an auto-provisioned "Personal
  // Organization" that wraps a single-user customer so every Application can
  // point customer_id at an Organization (the locked ownership decision).
  // Optional + additive; nothing reads it in production yet.
  is_personal?: boolean;

  deleted_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name:        { type: String, required: true, trim: true },
    legal_name:  { type: String, trim: true },
    type:        { type: String, enum: ['manufacturer', 'importer', 'consultant', 'cb', 'lab', 'other'], default: 'manufacturer', index: true },

    gst_number:  { type: String, trim: true, uppercase: true },
    pan_number:  { type: String, trim: true, uppercase: true },
    iec_code:    { type: String, trim: true },
    cin:         { type: String, trim: true, uppercase: true },

    address: {
      line1:        String,
      line2:        String,
      city:         String,
      state:        String,
      country_code: { type: String, default: 'IN', uppercase: true, index: true },
      pincode:      String,
    },

    contact: {
      email:   String,
      phone:   String,
      website: String,
    },

    branding: {
      logo_url:      String,
      primary_color: String,
    },

    subscription: {
      tier:                     { type: String, enum: ['free', 'starter', 'pro', 'enterprise'], default: 'free', index: true },
      seats:                    { type: Number, default: 1 },
      trial_ends_at:            Date,
      renewed_at:               Date,
      razorpay_customer_id:     String,
      razorpay_subscription_id: String,
    },

    owner_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    settings: {
      require_2fa_for_admins:   { type: Boolean, default: false },
      allowed_cert_types:       { type: [String], default: [] },
      notification_preferences: { type: Schema.Types.Mixed, default: {} },
    },

    cb_profile: {
      accreditations:     { type: [String], default: [] },
      scope:              { type: String, trim: true },
      countries:          { type: [String], default: [] },
      product_categories: { type: [String], default: [] },
    },

    // Sprint 3 — personal-organization marker (see interface note). Additive.
    is_personal: { type: Boolean, default: false },

    deleted_at: { type: Date, index: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

OrganizationSchema.index({ gst_number: 1 }, { unique: true, sparse: true });
// At most one personal Organization per owner — makes provisioning idempotent
// and duplicate-execution safe (a race loses to a duplicate-key error we retry).
OrganizationSchema.index(
  { owner_user_id: 1, is_personal: 1 },
  { unique: true, partialFilterExpression: { is_personal: true } },
);
OrganizationSchema.index({ 'address.country_code': 1, 'subscription.tier': 1 });
OrganizationSchema.index({ name: 'text', legal_name: 'text' });

OrganizationSchema.pre(/^find/, function (this: any) {
  if (!this.getOptions().includeDeleted) this.where({ deleted_at: null });
});

export const Organization = model<IOrganization>('Organization', OrganizationSchema);
