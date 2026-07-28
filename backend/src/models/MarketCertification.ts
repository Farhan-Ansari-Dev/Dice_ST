import mongoose, { Schema, Document } from 'mongoose';

export interface IMarketCertification extends Document {
  certificationName: string;
  code: string;
  country: string;
  authority: string;
  description?: string;
  estimatedTimeline: string;
  estimatedCost: string;
  renewalCycle: string;
  /**
   * Links this market certification to its Workflow (the single source of truth
   * for required documents, business info, stages, fees and references). When
   * absent, the resolver falls back to matching Workflow.cert_type === code.
   */
  workflow_cert_type?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MarketCertificationSchema: Schema = new Schema({
  certificationName: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  country: { type: String, required: true },
  authority: { type: String, required: true },
  description: { type: String },
  estimatedTimeline: { type: String, required: true },
  estimatedCost: { type: String, required: true },
  renewalCycle: { type: String, required: true },
  workflow_cert_type: { type: String, index: true },
}, { timestamps: true });

export default mongoose.model<IMarketCertification>('MarketCertification', MarketCertificationSchema);
