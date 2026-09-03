import { Schema, model, Document, Types } from 'mongoose';

export interface IUser extends Document {
  email: string;
  phone?: string;
  name: string;
  avatar_url?: string;          // S3 key
  role: 'super_admin' | 'admin' | 'consultant' | 'employee' | 'client' | 'viewer' | 'cb' | 'lab' | 'ib';
  org_id?: Types.ObjectId;
  locale: string;               // "en-IN", "hi-IN", etc.
  country_code: string;         // "IN", "AE", "SA" — drives data-residency policy

  // Sign in with Apple subject id ("sub"). Stable, opaque IDENTITY KEY for an
  // Apple user (NOT a display name). Used to map the same Apple account to the
  // same DICE account across logins, even when Hide My Email is toggled.
  apple_sub?: string;

  // Auth (passwords are optional — primary login is OTP)
  password_hash?: string;
  otp_hash?: string;
  otp_expires_at?: Date;
  otp_attempts: number;

  // Phone-change verification (a new number must be proven before it replaces
  // the existing one, so a hijacked session cannot silently move the account).
  pending_phone?: string;
  phone_otp_hash?: string;
  phone_otp_expires_at?: Date;
  phone_otp_attempts: number;

  // 2FA for high-privilege accounts
  totp_secret?: string;
  totp_enabled: boolean;

  // Devices for push notifications
  expo_push_tokens: string[];
  webpush_subscriptions: Array<{
    endpoint: string;
    keys: { p256dh: string; auth: string };
    created_at: Date;
  }>;

  // Per-user notification preferences (overrides default channel selection)
  notification_preferences?: {
    push?: Record<string, boolean>;
    email?: Record<string, boolean>;
    sms?: Record<string, boolean>;
    quiet_hours?: { start: string; end: string; timezone: string };
  };

  // Onboarding profile — captured by the post-login onboarding wizard.
  // Stored server-side so a returning user skips onboarding on any device
  // (SecureStore alone is per-install and is lost on reinstall).
  business_role?: string;
  industries: string[];
  target_markets: string[];
  interested_certifications: string[];
  company_size?: string;
  business_goals: string[];
  company_name?: string;
  gst_number?: string;
  cin?: string;                 // Corporate Identification Number (MCA)
  iec?: string;                 // Import-Export Code (DGFT) — for exporters
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  onboarding_completed_at?: Date;

  // Consultant verification
  consultant_verification_status?: 'pending' | 'verified' | 'rejected';
  consultant_verification_documents?: Array<{
    url: string;
    name: string;
    uploaded_at: Date;
  }>;
  consultant_rejection_reason?: string;

  // DPDP / GDPR
  consents: {
    privacy_policy: { version: string; accepted_at: Date };
    marketing: boolean;
    analytics: boolean;
    // Explicit consent to third-party AI processing. Absent ⇒ NOT consented
    // (existing users are never silently migrated to consented). See services/ai/aiConsent.
    ai?: {
      consented: boolean;
      version: string;
      consented_at?: Date;
      declined_at?: Date;
    };
  };

  // Lifecycle
  email_verified_at?: Date;
  last_active_at?: Date;
  deleted_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email:         { type: String, required: true, lowercase: true, trim: true },
    phone:         { type: String, trim: true },
    name:          { type: String, required: true, trim: true },
    avatar_url:    { type: String },
    role:          { type: String, enum: ['super_admin', 'admin', 'consultant', 'employee', 'client', 'viewer', 'cb', 'lab', 'ib'], default: 'client', index: true },
    org_id:        { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    locale:        { type: String, default: 'en-IN' },
    country_code:  { type: String, default: 'IN', uppercase: true },

    apple_sub:        { type: String, trim: true },

    password_hash:    { type: String, select: false },
    otp_hash:         { type: String, select: false },
    otp_expires_at:   { type: Date, select: false },
    otp_attempts:     { type: Number, default: 0, select: false },

    pending_phone:        { type: String, trim: true, select: false },
    phone_otp_hash:       { type: String, select: false },
    phone_otp_expires_at: { type: Date, select: false },
    phone_otp_attempts:   { type: Number, default: 0, select: false },

    totp_secret:   { type: String, select: false },
    totp_enabled:  { type: Boolean, default: false },

    business_role:             { type: String, trim: true },
    industries:                { type: [String], default: [] },
    target_markets:            { type: [String], default: [] },
    interested_certifications: { type: [String], default: [] },
    company_size:              { type: String, trim: true },
    business_goals:            { type: [String], default: [] },
    company_name:              { type: String, trim: true },
    gst_number:                { type: String, trim: true, uppercase: true },
    cin:                       { type: String, trim: true, uppercase: true },
    iec:                       { type: String, trim: true, uppercase: true },
    address: {
      line1:   { type: String, trim: true },
      line2:   { type: String, trim: true },
      city:    { type: String, trim: true },
      state:   { type: String, trim: true },
      pincode: { type: String, trim: true },
    },
    onboarding_completed_at:   { type: Date },

    consultant_verification_status: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
    },
    consultant_verification_documents: [{
      url:         { type: String, required: true },
      name:        { type: String, required: true },
      uploaded_at: { type: Date, default: Date.now },
      _id: false,
    }],
    consultant_rejection_reason: { type: String },

    expo_push_tokens: { type: [String], default: [] },
    webpush_subscriptions: [
      {
        endpoint:   { type: String, required: true },
        keys: {
          p256dh: { type: String, required: true },
          auth:   { type: String, required: true },
        },
        created_at: { type: Date, default: Date.now },
        _id: false,
      },
    ],

    notification_preferences: {
      push:        { type: Schema.Types.Mixed },
      email:       { type: Schema.Types.Mixed },
      sms:         { type: Schema.Types.Mixed },
      quiet_hours: {
        start:    String,
        end:      String,
        timezone: { type: String, default: 'Asia/Kolkata' },
      },
    },

    consents: {
      privacy_policy: {
        version:     { type: String, default: '1.0' },
        accepted_at: { type: Date, default: Date.now },
      },
      marketing:  { type: Boolean, default: false },
      analytics:  { type: Boolean, default: true },
      // Third-party AI consent — no default record; absence means not consented.
      ai: {
        consented:    { type: Boolean, default: false },
        version:      { type: String },
        consented_at: { type: Date },
        declined_at:  { type: Date },
      },
    },

    email_verified_at: Date,
    last_active_at:    Date,
    deleted_at:        { type: Date, index: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Unique email when not soft-deleted
UserSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { deleted_at: null } });
UserSchema.index({ phone: 1 }, { unique: true, sparse: true });
// One Apple identity → one live account (soft-deleted rows are excluded, so a
// re-registration after deletion is not blocked — mirrors the email index).
UserSchema.index({ apple_sub: 1 }, { unique: true, partialFilterExpression: { apple_sub: { $type: 'string' }, deleted_at: null } });
UserSchema.index({ org_id: 1, role: 1 });

// Clear any stale/invalid consultant_verification_status values before save.
// The DB may contain "unverified" (or other legacy strings) from before the enum was defined.
// "unverified" is semantically equivalent to undefined — the field absent means not yet submitted.
const VALID_CVS = new Set(['pending', 'verified', 'rejected']);
UserSchema.pre('save', function () {
  if (this.consultant_verification_status !== undefined && !VALID_CVS.has(this.consultant_verification_status as string)) {
    this.consultant_verification_status = undefined;
  }
});

// Auto-exclude soft-deleted in default queries (use .setOptions({ includeDeleted: true }) to bypass)
UserSchema.pre(/^find/, function (this: any) {
  if (!this.getOptions().includeDeleted) {
    this.where({ deleted_at: null });
  }
});

export const User = model<IUser>('User', UserSchema);
