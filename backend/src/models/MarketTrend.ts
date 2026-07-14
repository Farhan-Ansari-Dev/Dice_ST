import { Schema, model, Document } from 'mongoose';

export interface IMarketTrend extends Document {
  title: string;
  slug: string;
  industry: string;
  trendType: 'Growth' | 'Decline' | 'Emerging' | 'Regulatory';
  description: string;
  impactScore: number; // 0-100
  active: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MarketTrendSchema = new Schema<IMarketTrend>(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    industry: { type: String, required: true, index: true },
    trendType: { type: String, enum: ['Growth', 'Decline', 'Emerging', 'Regulatory'], required: true },
    description: { type: String, required: true },
    impactScore: { type: Number, default: 50 },
    active: { type: Boolean, default: true, index: true },
    deletedAt: { type: Date, index: true },
  },
  { timestamps: true }
);

export const MarketTrend = model<IMarketTrend>('MarketTrend', MarketTrendSchema);
