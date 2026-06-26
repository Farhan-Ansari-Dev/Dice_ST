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
}, { timestamps: true });

export default mongoose.model<IMarketCertification>('MarketCertification', MarketCertificationSchema);
