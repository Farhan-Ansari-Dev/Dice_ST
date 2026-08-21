/**
 * Certification enquiry captured from a marketing/overview page.
 *
 * A Lead is deliberately NOT an Application: the user has expressed interest
 * but has supplied none of the documentation an Application requires. The
 * certification manager qualifies the lead and converts it manually.
 */
import { Schema, model, Document, Types } from 'mongoose';

export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'converted', 'rejected'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export interface ILead extends Document {
  /** Certification the enquiry is about, e.g. 'pcoc_scoc', 'saber'. */
  service_id: string;
  service_name: string;

  user_id?: Types.ObjectId;
  org_id?: Types.ObjectId;

  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  company_name?: string;

  product_description?: string;
  target_markets: string[];
  notes?: string;

  status: LeadStatus;
  /** Free-text log the certification manager appends to. */
  admin_notes: Array<{ note: string; author: Types.ObjectId; at: Date }>;
  assigned_to?: Types.ObjectId;
  converted_application_id?: Types.ObjectId;
  /** Optional link to the Market Access opportunity this enquiry came from. */
  opportunity_id?: Types.ObjectId;

  source: string;
  created_at: Date;
  updated_at: Date;
}

const LeadSchema = new Schema<ILead>(
  {
    service_id:   { type: String, required: true, index: true },
    service_name: { type: String, required: true },

    user_id: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    org_id:  { type: Schema.Types.ObjectId, ref: 'Organization', index: true },

    contact_name:  { type: String, required: true, trim: true },
    contact_email: { type: String, required: true, lowercase: true, trim: true },
    contact_phone: { type: String, trim: true },
    company_name:  { type: String, trim: true },

    product_description: { type: String, trim: true },
    target_markets:      { type: [String], default: [] },
    notes:               { type: String, trim: true },

    status: { type: String, enum: LEAD_STATUSES, default: 'new', index: true },
    admin_notes: [{
      note:   { type: String, required: true },
      author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      at:     { type: Date, default: Date.now },
      _id: false,
    }],
    assigned_to:              { type: Schema.Types.ObjectId, ref: 'User' },
    converted_application_id: { type: Schema.Types.ObjectId, ref: 'Application' },

    // Additive: links a lead back to the Market Access opportunity it came from
    // (optional; existing leads are unaffected). Lets admin filter/trace
    // opportunity-sourced enquiries.
    opportunity_id: { type: Schema.Types.ObjectId, ref: 'BusinessOpportunity' },

    source: { type: String, default: 'mobile_app' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

LeadSchema.index({ status: 1, created_at: -1 });
LeadSchema.index({ service_id: 1, created_at: -1 });

export const Lead = model<ILead>('Lead', LeadSchema);
