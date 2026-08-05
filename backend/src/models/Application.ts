import { Schema, model, Document, Types } from 'mongoose';

export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'docs_review'
  | 'docs_required'
  | 'tech_review'
  | 'testing'
  | 'approval_pending'
  | 'approved'
  | 'rejected'
  | 'on_hold'
  | 'cert_issued'
  | 'cancelled';

export const ALLOWED_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  draft:            ['submitted', 'cancelled'],
  submitted:        ['docs_review', 'cancelled'],
  docs_review:      ['tech_review', 'docs_required', 'rejected', 'on_hold'],
  docs_required:    ['docs_review', 'cancelled'],
  tech_review:      ['testing', 'approval_pending', 'docs_required', 'rejected'],
  testing:          ['approval_pending', 'docs_required', 'rejected'],
  approval_pending: ['approved', 'rejected', 'on_hold'],
  approved:         ['cert_issued'],
  cert_issued:      [],            // terminal — issue Certification doc
  rejected:         [],            // terminal
  on_hold:          ['docs_review', 'tech_review', 'cancelled'],
  cancelled:        [],            // terminal
};

export interface IStatusTransition {
  from: ApplicationStatus;
  to: ApplicationStatus;
  by: Types.ObjectId;
  at: Date;
  reason?: string;
  comment?: string;
  override?: boolean;   // true when set by an admin override (bypassed the state machine)
}

export interface IApplication extends Document {
  application_number: string;              // human-friendly: APP-2026-0042
  org_id: Types.ObjectId;
  // Optional: an enquiry-created draft may not yet resolve to a catalog product.
  // When absent, product_status is 'pending_validation' and a manager attaches
  // the real product during triage — the customer still gets a Draft Application.
  product_id?: Types.ObjectId;
  product_status: 'validated' | 'pending_validation';
  workflow_id: string;                     // references Workflow._id (e.g. "wf_bis_crs_v1")
  cert_type: string;                       // "BIS_CRS", "EPR", "TEC_ETA", etc.
  hs_code?: string;                        // HS/HSN classification (set by manager on manual review)

  // Manual-review metadata — populated when an application is created via
  // "Continue as Manual Application" (no verified certification mapping). A
  // Certification Manager uses it to identify the product and continue. Optional
  // and additive; the legacy `manual_review` tag is retained for compatibility.
  manual_review?: {
    reason?: string;
    original_product?: string;
    requested_markets?: string[];
    confidence_score?: number;             // 0–100; 0 when no mapping was found
    ai_summary?: string;
  };

  // Current state
  status: ApplicationStatus;
  current_stage?: string;                  // e.g. "tech_review"
  status_history: IStatusTransition[];     // immutable append-only

  // Ownership & assignment
  //
  // Sprint 2 (Ownership Foundation) — typed ownership axes. Every field here is
  // OPTIONAL and purely additive: no route or service reads them for
  // authorization or visibility yet (that is a later cutover sprint). Until then
  // `created_by` continues to back ownership for backward compatibility; after
  // the cutover it becomes immutable audit-only metadata (never authorization).
  customer_id?: Types.ObjectId;            // owning customer (Organization) — future visibility axis
  consultant_id?: Types.ObjectId;          // servicing consultant
  employee_id?: Types.ObjectId;            // reviewing employee
  manager_id?: Types.ObjectId;             // oversight / escalation target
  created_by: Types.ObjectId;              // immutable creator (audit) — see note above
  assignees: Types.ObjectId[];             // consultants/managers working on it
  primary_assignee?: Types.ObjectId;

  // Documents (references to Document collection — versioned separately)
  documents: Array<{
    document_id: Types.ObjectId;
    required_for_stage: string;
    label: string;                         // "Trademark Certificate", etc.
    added_at: Date;
  }>;

  // Preferred Certification Body for this application (per certification).
  // Default is Sanyog-managed (staff assign the CB later); the customer may also
  // find/enter a CB, which a manager then accepts or overrides. Same
  // Workflow/lifecycle regardless — this is an attribute, not a separate workflow.
  certification_body?: {
    mode: 'sanyog_managed' | 'customer_selected';
    org_id?: Types.ObjectId;               // an approved, eligible Organization(type='cb')
    name?: string;                         // manual off-platform CB ("I already have a CB")
    source?: 'customer' | 'staff';         // who set the current value
    status?: 'pending' | 'accepted' | 'overridden';   // manager review state
    review_reason?: string;                // required when a manager overrides
    reviewed_by?: Types.ObjectId;
    reviewed_at?: Date;
    selected_by?: Types.ObjectId;
    selected_at?: Date;
  };

  // Timeline
  submitted_at?: Date;
  estimated_completion_at?: Date;
  completed_at?: Date;
  due_at?: Date;                           // SLA deadline

  // Financial
  fee: {
    base_inr: number;
    expedited: boolean;
    paid: boolean;
    payment_id?: Types.ObjectId;
  };

  // Priority & flags
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tags: string[];

  // Renewal: when this application was created to renew an expiring certificate,
  // this points at the predecessor cert. On issuance the new Certification is
  // linked to it (predecessor/successor) and the old cert is marked 'renewed'.
  renewal_of_cert_id?: Types.ObjectId;

  // External references (issuing body)
  external_ref?: {
    body: string;                          // "BIS", "CPCB", "TEC", etc.
    reference_number?: string;             // their tracking number
    portal_url?: string;
  };

  // Computed for fast dashboard queries (denormalized)
  progress_percent: number;
  days_in_current_stage: number;
  is_overdue: boolean;

  // Soft-delete & timestamps
  deleted_at?: Date;
  created_at: Date;
  updated_at: Date;

  canTransitionTo(newStatus: ApplicationStatus): boolean;
  transitionTo(newStatus: ApplicationStatus, userId: Types.ObjectId, meta?: { reason?: string }): void;
}

const StatusTransitionSchema = new Schema<IStatusTransition>(
  {
    from:    { type: String, required: true },
    to:      { type: String, required: true },
    by:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
    at:      { type: Date, default: Date.now },
    reason:  String,
    comment: String,
    override: Boolean,
  },
  { _id: false }
);

const ApplicationSchema = new Schema<IApplication>(
  {
    application_number: { type: String, required: true, unique: true, index: true },
    // org_id/workflow_id optional: single-tenant users have no Organization, and the
    // workflow (fee/duration defaults only; transitions use ALLOWED_TRANSITIONS) is
    // seeded, not always present. Same optional pattern as Payment/Inspection/Document.
    org_id:             { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    // Optional: enquiry-created drafts may await product validation (see IApplication).
    product_id:         { type: Schema.Types.ObjectId, ref: 'Product', index: true },
    product_status:     { type: String, enum: ['validated', 'pending_validation'], default: 'validated', index: true },
    workflow_id:        { type: String, index: true },
    cert_type:          { type: String, required: true, index: true },
    hs_code:            { type: String, trim: true },
    manual_review: {
      reason:            { type: String, trim: true },
      original_product:  { type: String, trim: true },
      requested_markets: { type: [String], default: undefined },
      confidence_score:  { type: Number },
      ai_summary:        { type: String, trim: true },
    },

    status: {
      type: String,
      enum: Object.keys(ALLOWED_TRANSITIONS) as ApplicationStatus[],
      default: 'draft',
      index: true,
    },
    current_stage:  String,
    status_history: { type: [StatusTransitionSchema], default: [] },

    // Sprint 2 — typed ownership axes (expand-only: optional, not yet read by auth).
    customer_id:       { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    consultant_id:     { type: Schema.Types.ObjectId, ref: 'User', index: true },
    employee_id:       { type: Schema.Types.ObjectId, ref: 'User', index: true },
    manager_id:        { type: Schema.Types.ObjectId, ref: 'User', index: true },
    created_by:        { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    assignees:         [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
    primary_assignee:  { type: Schema.Types.ObjectId, ref: 'User' },

    documents: [
      {
        document_id:        { type: Schema.Types.ObjectId, ref: 'Document', required: true },
        required_for_stage: { type: String, required: true },
        label:              { type: String, required: true },
        added_at:           { type: Date, default: Date.now },
        _id: false,
      },
    ],

    certification_body: {
      mode:          { type: String, enum: ['sanyog_managed', 'customer_selected'], default: 'sanyog_managed' },
      org_id:        { type: Schema.Types.ObjectId, ref: 'Organization' },
      name:          { type: String, trim: true },
      source:        { type: String, enum: ['customer', 'staff'] },
      status:        { type: String, enum: ['pending', 'accepted', 'overridden'], default: 'pending' },
      review_reason: { type: String, trim: true },
      reviewed_by:   { type: Schema.Types.ObjectId, ref: 'User' },
      reviewed_at:   { type: Date },
      selected_by:   { type: Schema.Types.ObjectId, ref: 'User' },
      selected_at:   { type: Date },
    },

    submitted_at:            Date,
    estimated_completion_at: Date,
    completed_at:            Date,
    due_at:                  { type: Date, index: true },

    fee: {
      base_inr:    { type: Number, default: 0 },
      expedited:   { type: Boolean, default: false },
      paid:        { type: Boolean, default: false },
      payment_id:  { type: Schema.Types.ObjectId, ref: 'Payment' },
    },

    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium', index: true },
    tags:     { type: [String], default: [] },

    renewal_of_cert_id: { type: Schema.Types.ObjectId, ref: 'Certification', index: true },

    external_ref: {
      body:             String,
      reference_number: String,
      portal_url:       String,
    },

    progress_percent:        { type: Number, default: 0 },
    days_in_current_stage:   { type: Number, default: 0 },
    is_overdue:              { type: Boolean, default: false, index: true },

    deleted_at: { type: Date, index: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// ─── Indexes (match dashboard/list query patterns) ───
ApplicationSchema.index({ org_id: 1, status: 1, created_at: -1 });
ApplicationSchema.index({ assignees: 1, status: 1, due_at: 1 });        // "my tasks, sorted by deadline"
ApplicationSchema.index({ org_id: 1, cert_type: 1, status: 1 });
ApplicationSchema.index({ is_overdue: 1, status: 1 });                  // overdue dashboard
ApplicationSchema.index({ tags: 1 });

// ─── Sprint 2: ownership-axis indexes (support the future ownership cutover) ───
// Additive only. These back the read patterns the cutover will use (customer
// visibility + per-staff work queues) without changing any current query.
ApplicationSchema.index({ customer_id: 1, status: 1, created_at: -1 });
ApplicationSchema.index({ consultant_id: 1, status: 1, due_at: 1 });
ApplicationSchema.index({ employee_id: 1, status: 1, due_at: 1 });
ApplicationSchema.index({ manager_id: 1, status: 1 });

// ─── Methods ───
ApplicationSchema.methods.canTransitionTo = function (newStatus: ApplicationStatus): boolean {
  return ALLOWED_TRANSITIONS[this.status as ApplicationStatus].includes(newStatus);
};

ApplicationSchema.methods.transitionTo = function (
  newStatus: ApplicationStatus,
  by: Types.ObjectId,
  opts: { reason?: string; comment?: string } = {}
) {
  if (!this.canTransitionTo(newStatus)) {
    throw new Error(`Invalid transition ${this.status} → ${newStatus}`);
  }
  this.status_history.push({
    from: this.status as ApplicationStatus,
    to: newStatus,
    by,
    at: new Date(),
    reason: opts.reason,
    comment: opts.comment,
  });
  this.status = newStatus;
  if (newStatus === 'submitted' && !this.submitted_at) this.submitted_at = new Date();
  if (['cert_issued', 'rejected', 'cancelled'].includes(newStatus)) this.completed_at = new Date();
};

ApplicationSchema.pre(/^find/, function (this: any) {
  if (!this.getOptions().includeDeleted) this.where({ deleted_at: null });
});

export const Application = model<IApplication>('Application', ApplicationSchema);
