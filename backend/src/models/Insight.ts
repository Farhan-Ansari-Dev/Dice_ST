import mongoose, { Schema, Document } from 'mongoose';

export interface IInsight extends Document {
  title: string;
  summary: string;
  content: string;
  category: string;
  country: string;
  source: string;
  link: string;
  imageUrl: string;
  author: string;
  tags: string[];
  relevanceScore: number;
  published: boolean;
  featured: boolean;
  targetCountries: string[];
  certifications: string[];
  publishedAt: Date;
  createdAt: Date;
}

const InsightSchema: Schema = new Schema(
  {
    title: { type: String, required: true, unique: true },
    summary: { type: String, required: true },
    content: { type: String, default: '' },          // full article body (mobile app reads this)
    category: { type: String, required: true, index: true },
    country: { type: String, required: true },
    source: { type: String, required: true },
    link: { type: String, default: '' },
    imageUrl: { type: String, default: '' },          // mobile app expects imageUrl
    author: { type: String, default: '' },
    tags: [{ type: String, index: true }],
    relevanceScore: { type: Number, default: 0 },
    published: { type: Boolean, default: true, index: true },
    featured: { type: Boolean, default: false, index: true },
    targetCountries: [{ type: String }],
    certifications: [{ type: String }],
    publishedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

export const Insight = mongoose.models.Insight || mongoose.model<IInsight>('Insight', InsightSchema);
