import { Schema, model, Document } from 'mongoose';

export interface IGovernmentScheme extends Document {
  title: string;
  slug: string;
  ministry: string;
  overview: string;
  eligibility: string;
  benefits: string;
  applicationProcess: string;
  officialLink: string;
  active: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const GovernmentSchemeSchema = new Schema<IGovernmentScheme>(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    ministry: { type: String, required: true },
    overview: { type: String, required: true },
    eligibility: { type: String, required: true },
    benefits: { type: String, required: true },
    applicationProcess: { type: String },
    officialLink: { type: String },
    active: { type: Boolean, default: true, index: true },
    deletedAt: { type: Date, index: true },
  },
  { timestamps: true }
);

export const GovernmentScheme = model<IGovernmentScheme>('GovernmentScheme', GovernmentSchemeSchema);
