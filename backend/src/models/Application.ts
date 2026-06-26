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
}

export interface IApplication extends Document {
  application_number: string;              // human-friendly: APP-2026-0042
  org_id: Types.ObjectId;
  product_id: Types.ObjectId;
  workflow_id: string;                     // references Workflow._id (e.g. "wf_bis_crs_v1")
  cert_type: string;                       // "BIS_CRS", "EPR", "TEC_ETA", etc.

  // Current state
  status: ApplicationStatus;
  current_stage?: string;                  // e.g. "tech_review"
  status_history: IStatusTransition[];     // immutable append-only

  // Ownership & assignment
  created_by: Types.ObjectId;
  assignees: Types.ObjectId[];             // consultants/managers working on it
  primary_assignee?: Types.ObjectId;

  // Documents (references to Document collection — versioned separately)
  documents: Array<{
    document_id: Types.ObjectId;
    required_for_stage: string;
    label: string;                         // "Trademark Certificate", etc.
    added_at: Date;
  }>;

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
}

const StatusTransitionSchema = new Schema<IStatusTransition>(
  {
    from:    { type: String, required: true },
    to:      { type: String, required: true },
    by:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
    at:      { type: Date, default: Date.now },
    reason:  String,
    comment: String,
  },
  { _id: false }
);

const ApplicationSchema = new Schema<IApplication>(
  {
    application_number: { type: String, required: true, unique: true, index: true },
    org_id:             { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    product_id:         { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    workflow_id:        { type: String, required: true, index: true },
    cert_type:          { type: String, required: true, index: true },

    status: {
      type: String,
      enum: Object.keys(ALLOWED_TRANSITIONS) as ApplicationStatus[],
      default: 'draft',
      index: true,
    },
    current_stage:  String,
    status_history: { type: [StatusTransitionSchema], default: [] },

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
