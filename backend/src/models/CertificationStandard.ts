import { Schema, model, Document, Types } from 'mongoose';

export interface IDocumentRequirement {
  name: string;
  description: string;
  is_mandatory: boolean;
}

export interface ICertificationStandard extends Document {
  certification_id: Types.ObjectId;
  country_code: string; // ISO 3166-1 alpha-2
  required_documents: IDocumentRequirement[];
  created_by: Types.ObjectId;
  updated_by: Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const DocumentRequirementSchema = new Schema<IDocumentRequirement>({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  is_mandatory: { type: Boolean, default: true },
}, { _id: false });

const CertificationStandardSchema = new Schema<ICertificationStandard>(
  {
    certification_id: { type: Schema.Types.ObjectId, ref: 'Certification', required: true },
    country_code: { type: String, required: true, uppercase: true, trim: true, minlength: 2, maxlength: 2 },
    required_documents: { type: [DocumentRequirementSchema], default: [] },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Ensure a unique standard for each certification + country combination
CertificationStandardSchema.index({ certification_id: 1, country_code: 1 }, { unique: true });

export const CertificationStandard = model<ICertificationStandard>('CertificationStandard', CertificationStandardSchema);
