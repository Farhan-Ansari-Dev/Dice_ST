import { Schema, model, Document } from 'mongoose';

export interface IBusinessGuide extends Document {
  title: string;
  slug: string;
  banner?: string;
  content: string; // Markdown or HTML
  images: string[];
  tables: any[]; // Or JSON for dynamic tables
  downloads: { name: string; url: string }[];
  faqs: { question: string; answer: string }[];
  relatedGuides: Schema.Types.ObjectId[];
  active: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BusinessGuideSchema = new Schema<IBusinessGuide>(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    banner: { type: String },
    content: { type: String, required: true },
    images: [{ type: String }],
    tables: [{ type: Schema.Types.Mixed }],
    downloads: [{ name: String, url: String }],
    faqs: [{ question: String, answer: String }],
    relatedGuides: [{ type: Schema.Types.ObjectId, ref: 'BusinessGuide' }],
    active: { type: Boolean, default: true, index: true },
    deletedAt: { type: Date, index: true },
  },
  { timestamps: true }
);

export const BusinessGuide = model<IBusinessGuide>('BusinessGuide', BusinessGuideSchema);
