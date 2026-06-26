import { Schema, model, Document } from 'mongoose';
import type { ApplicationStatus } from './Application';

/**
 * Workflow definitions for each certification type.
 *
 * Stored as DATA so adding a new cert type (e.g., new EU CE Marking Cat. III)
 * is a database insert — zero code change.
 *
 * Each workflow describes the stages, required docs per stage, SLAs, and fees.
 */
export interface IWorkflowStage {
  id: ApplicationStatus;            // matches Application.status enum
  label: string;
  description?: string;
  sla_days: number;
  required_docs: Array<{
    doc_type: string;
    label: string;
    mandatory: boolean;
  }>;
  next_states: ApplicationStatus[]; // allowed transitions
  assignee_role?: string;           // who handles this stage
  auto_advance?: boolean;           // skip if no manual action needed
}

export interface IWorkflow {
  _id: string;                      // human-readable, e.g. "wf_bis_crs_v1"
  cert_type: string;                // "BIS_CRS", "EPR", "TEC_ETA", "LMPC", "FSSAI", ...
  display_name: string;
  description?: string;
  version: number;
  active: boolean;

  issuing_body: string;             // "Bureau of Indian Standards"
  country_code: string;             // "IN" / "EU" / "US"
  estimated_duration_days: number;
  validity_period_months: number;

  stages: IWorkflowStage[];

  fee_structure: {
    application_fee_inr: number;
    annual_fee_inr?: number;
    expedited_surcharge_inr?: number;
    test_fee_inr?: number;
  };

  // Customer-facing
  customer_description?: string;
  required_business_info: string[]; // ["gst_number", "factory_address", ...]
  helpful_links?: Array<{ label: string; url: string }>;

  created_at: Date;
  updated_at: Date;
}

const WorkflowStageSchema = new Schema<IWorkflowStage>(
  {
    id:          { type: String, required: true },
    label:       { type: String, required: true },
    description: String,
    sla_days:    { type: Number, default: 7 },
    required_docs: [{
      doc_type:  { type: String, required: true },
      label:     { type: String, required: true },
      mandatory: { type: Boolean, default: true },
      _id: false,
    }],
    next_states:    [String],
    assignee_role:  String,
    auto_advance:   { type: Boolean, default: false },
  },
  { _id: false }
);

const WorkflowSchema = new Schema<any>(
  {
    _id:                     { type: String, required: true },     // override ObjectId with readable id
    cert_type:               { type: String, required: true, index: true },
    display_name:            { type: String, required: true },
    description:             String,
    version:                 { type: Number, default: 1 },
    active:                  { type: Boolean, default: true, index: true },

    issuing_body:            { type: String, required: true },
    country_code:            { type: String, default: 'IN', index: true },
    estimated_duration_days: { type: Number, default: 45 },
    validity_period_months:  { type: Number, default: 24 },

    stages: { type: [WorkflowStageSchema], default: [] },

    fee_structure: {
      application_fee_inr:     { type: Number, default: 0 },
      annual_fee_inr:          Number,
      expedited_surcharge_inr: Number,
      test_fee_inr:            Number,
    },

    customer_description: String,
    required_business_info: [String],
    helpful_links: [{ label: String, url: String, _id: false }],
  },
  { _id: false, timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

WorkflowSchema.index({ cert_type: 1, active: 1, version: -1 });

export const Workflow = model<any>('Workflow', WorkflowSchema);
