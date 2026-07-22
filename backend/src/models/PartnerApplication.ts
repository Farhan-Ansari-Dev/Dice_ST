/**
 * Partner Program application (CB / Lab / Inspection Body).
 *
 * Reviewed by staff, who approve or reject with a reason. Approval is what
 * eventually promotes the applicant to a partner role, so the decision and its
 * author are recorded.
 */
import { Document, model, Schema, Types } from 'mongoose';

export const PARTNER_STATUSES = ['pending', 'under_review', 'approved', 'rejected'] as const;
export type PartnerStatus = (typeof PARTNER_STATUSES)[number];

export const PARTNER_TYPES = ['Certification Body', 'Testing Laboratory', 'Inspection Body', 'Consultant'] as const;

export interface IPartnerApplication extends Document {
  user_id: Types.ObjectId;
  org_id?: Types.ObjectId;

  partner_type: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;

  accreditations?: string;
  scope?: string;
  website?: string;
  documents: Array<{ name: string; url: string; uploaded_at: Date }>;

  status: PartnerStatus;
  decision_reason?: string;
  decided_by?: Types.ObjectId;
  decided_at?: Date;
  admin_notes: Array<{ note: string; author: Types.ObjectId; at: Date }>;

  created_at: Date;
  updated_at: Date;
}

const PartnerApplicationSchema = new Schema<IPartnerApplication>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    org_id:  { type: Schema.Types.ObjectId, ref: 'Organization', index: true },

    partner_type: { type: String, required: true },
    company_name: { type: String, required: true, trim: true, maxlength: 200 },
    contact_name: { type: String, required: true, trim: true, maxlength: 120 },
    email:        { type: String, required: true, lowercase: true, trim: true },
    phone:        { type: String, required: true, trim: true },

    accreditations: { type: String, trim: true, maxlength: 2000 },
    scope:          { type: String, trim: true, maxlength: 2000 },
    website:        { type: String, trim: true },
    documents: [{
      name:        { type: String, required: true },
      url:         { type: String, required: true },
      uploaded_at: { type: Date, default: Date.now },
      _id: false,
    }],

    status:          { type: String, enum: PARTNER_STATUSES, default: 'pending', index: true },
    decision_reason: { type: String, trim: true, maxlength: 1000 },
    decided_by:      { type: Schema.Types.ObjectId, ref: 'User' },
    decided_at:      { type: Date },
    admin_notes: [{
      note:   { type: String, required: true },
      author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      at:     { type: Date, default: Date.now },
      _id: false,
    }],
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

PartnerApplicationSchema.index({ status: 1, created_at: -1 });

export const PartnerApplication = model<IPartnerApplication>('PartnerApplication', PartnerApplicationSchema);
