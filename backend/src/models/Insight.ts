import mongoose, { Schema, Document } from 'mongoose';

export interface IInsight extends Document {
  title: string;
  summary: string;
  category: string;
  country: string;
  source: string;
  link: string;
  tags: string[];
  relevanceScore: number;
  publishedAt: Date;
  createdAt: Date;
}

const InsightSchema: Schema = new Schema(
  {
    title: { type: String, required: true, unique: true },
    summary: { type: String, required: true },
    category: { type: String, required: true, index: true },
    country: { type: String, required: true },
    source: { type: String, required: true },
    link: { type: String, default: '' },
    tags: [{ type: String, index: true }],
    relevanceScore: { type: Number, default: 0 },
    publishedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

export const Insight = mongoose.models.Insight || mongoose.model<IInsight>('Insight', InsightSchema);
