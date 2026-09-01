import { Schema, model, Document, Types } from 'mongoose';

/**
 * CBRequest — a customer's request for a quote/contact from a Certification Body
 * (Organization type='cb'). Its own lightweight lifecycle, distinct from the
 * Application workflow: a customer can shop CBs before (or alongside) a formal
 * Application. When raised from an Application it preserves `application_id` and
 * reuses that application's product / cert / market context.
 *
 * Ownership is by `customer_id` (Organization) + `user_id` (creator); routes must
 * scope non-staff reads/writes to the caller's own requests. Human id: CBR-YYYY-NNNNN.
 */
export type CBRequestStatus =
  | 'draft'
  | 'submitted'
  | 'sent_to_cb'
  | 'acknowledged'
  | 'quote_received'
  | 'accepted'
  | 'rejected'
  | 'cancelled'
  | 'closed';

export const CB_REQUEST_STATUSES: CBRequestStatus[] = [
  'draft', 'submitted', 'sent_to_cb', 'acknowledged', 'quote_received', 'accepted', 'rejected', 'cancelled', 'closed',
];

// Terminal states a customer/staff cannot transition out of.
export const CB_REQUEST_TERMINAL: CBRequestStatus[] = ['rejected', 'cancelled', 'closed'];

interface ICBStatusEvent {
  from: CBRequestStatus;
  to: CBRequestStatus;
  by: Types.ObjectId;
  at: Date;
  note?: string;          // customer-visible note attached to this transition
}

export interface ICBRequest extends Document {
  request_number: string;                 // human-friendly: CBR-2026-00031

  // Ownership / relationships (all real DICE entities — nothing duplicated)
  customer_id?: Types.ObjectId;           // owning customer Organization
  user_id: Types.ObjectId;                // the person who raised it (immutable)
  certification_body_id: Types.ObjectId;  // Organization(type='cb')
  application_id?: Types.ObjectId;        // preserved when raised from an Application
  product_id?: Types.ObjectId;
  cert_type?: string;                     // certification/scheme
  markets: string[];                      // ISO alpha-2 destination markets (authoritative)
  market?: string;                        // DEPRECATED mirror = markets[0] (back-compat)
  product_category?: string;

  // Customer-supplied
  message?: string;
  details?: Record<string, unknown>;      // quantity / spec / free-form (customer-provided)
  document_ids: Types.ObjectId[];         // reuses the Document system

  // Match snapshot (from the matching engine at request time — for transparency/audit)
  match_snapshot?: { score?: number; reasons?: string[] };

  // Lifecycle
  status: CBRequestStatus;
  status_history: ICBStatusEvent[];
  assigned_to?: Types.ObjectId;           // staff owner

  // CB response (recorded by staff) — customer-visible summary vs internal notes kept apart
  cb_response?: {
    summary?: string;                     // customer-visible
    quote_amount?: number;                // major currency unit; only when real
    quote_currency?: string;
    valid_until?: Date;
    recorded_by?: Types.ObjectId;
    recorded_at?: Date;
  };
  internal_notes?: string;                // staff-only — NEVER returned on customer routes

  created_at: Date;
  updated_at: Date;
}

const CBStatusEventSchema = new Schema<ICBStatusEvent>(
  {
    from: { type: String, required: true },
    to:   { type: String, required: true },
    by:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
    at:   { type: Date, default: Date.now },
    note: { type: String, trim: true },
  },
  { _id: false },
);

const CBRequestSchema = new Schema<ICBRequest>(
  {
    request_number: { type: String, required: true, unique: true, index: true },

    customer_id:           { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    user_id:               { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    certification_body_id: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    application_id:        { type: Schema.Types.ObjectId, ref: 'Application', index: true },
    product_id:            { type: Schema.Types.ObjectId, ref: 'Product' },
    cert_type:             { type: String, trim: true },
    markets:               { type: [String], default: [] },   // normalized ISO alpha-2 (setter below)
    market:                { type: String, trim: true, uppercase: true },  // deprecated mirror
    product_category:      { type: String, trim: true },

    message:      { type: String, trim: true },
    details:      { type: Schema.Types.Mixed, default: {} },
    document_ids: [{ type: Schema.Types.ObjectId, ref: 'Document' }],

    match_snapshot: {
      score:   { type: Number },
      reasons: { type: [String], default: undefined },
    },

    status:         { type: String, enum: CB_REQUEST_STATUSES, default: 'submitted', index: true },
    status_history: { type: [CBStatusEventSchema], default: [] },
    assigned_to:    { type: Schema.Types.ObjectId, ref: 'User', index: true },

    cb_response: {
      summary:        { type: String, trim: true },
      quote_amount:   { type: Number },
      quote_currency: { type: String, trim: true, uppercase: true },
      valid_until:    { type: Date },
      recorded_by:    { type: Schema.Types.ObjectId, ref: 'User' },
      recorded_at:    { type: Date },
    },
    internal_notes: { type: String, trim: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

// Normalise market codes to unique ISO alpha-2 upper-case (same rule as matching).
CBRequestSchema.path('markets').set((v: string[]) => {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const r of Array.isArray(v) ? v : []) {
    const code = String(r ?? '').trim().toUpperCase();
    if (/^[A-Z]{2}$/.test(code) && !seen.has(code)) { seen.add(code); out.push(code); }
  }
  return out;
});

// Dashboards + ownership scoping + duplicate detection.
CBRequestSchema.index({ customer_id: 1, status: 1, created_at: -1 });
CBRequestSchema.index({ certification_body_id: 1, status: 1 });
CBRequestSchema.index({ assigned_to: 1, status: 1 });
// Duplicate protection is now market-agnostic: one active request per
// (user, certification body, certification type), regardless of market set.
CBRequestSchema.index({ user_id: 1, certification_body_id: 1, cert_type: 1, status: 1 });
// Multikey index to filter requests by any requested market.
CBRequestSchema.index({ markets: 1, status: 1 });

export const CBRequest = model<ICBRequest>('CBRequest', CBRequestSchema);
