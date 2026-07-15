import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * Insight — text-based industry / regulatory update.
 * No image, thumbnail, banner or image-URL fields: these are text articles only.
 * The admin dashboard writes them; the mobile app reads the same collection
 * through the same REST API.
 */
export interface IInsight extends Document {
  title: string;             // required
  summary: string;           // required — short summary shown in feeds
  content: string;           // full article body
  source: string;            // required — Source Name (e.g. "Bureau of Indian Standards")
  link: string;              // required — Source URL ("Visit Official Source")
  category: string;
  country?: string;          // optional
  tags: string[];
  published: boolean;
  featured: boolean;
  createdBy?: Types.ObjectId;
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InsightSchema: Schema = new Schema(
  {
    title: { type: String, required: true, unique: true },
    summary: { type: String, required: true },
    content: { type: String, default: '' },
    source: { type: String, required: true },        // Source Name
    link: { type: String, required: true },          // Source URL
    category: { type: String, required: true, index: true },
    country: { type: String },                       // optional
    tags: [{ type: String, index: true }],
    published: { type: Boolean, default: true, index: true },
    featured: { type: Boolean, default: false, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    publishedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,   // createdAt + updatedAt
  }
);

export const Insight = mongoose.models.Insight || mongoose.model<IInsight>('Insight', InsightSchema);
