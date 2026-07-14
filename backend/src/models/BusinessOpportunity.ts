import { Schema, model, Document, Types } from 'mongoose';

export interface IBusinessOpportunity extends Document {
  title: string;
  slug: string;
  banner?: string; // S3 Key or URL
  category: string;
  industry: string;
  country: string; // Target Market Country Code or Name
  overview: string;
  investment: number;
  investmentCurrency: string;
  profitMargin: string; // e.g. "15-20%"
  demand: 'Low' | 'Medium' | 'High' | 'Very High';
  risk: 'Low' | 'Medium' | 'High';
  growthRate: string; // e.g. "12% YoY"
  targetMarket: string;
  requiredCertifications: string[]; // Linked or text
  optionalCertifications: string[];
  recommendedCertifications: string[];
  governmentSchemes: string[];
  businessGuide?: Types.ObjectId; // Link to a Business Guide
  faqs: { question: string; answer: string }[];
  downloads: { name: string; url: string }[];
  seoTitle?: string;
  seoDescription?: string;
  status: 'draft' | 'published' | 'archived';
  isFeatured: boolean;
  isPinned: boolean;
  active: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BusinessOpportunitySchema = new Schema<IBusinessOpportunity>(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    banner: { type: String },
    category: { type: String, required: true },
    industry: { type: String, required: true, index: true },
    country: { type: String, required: true, index: true },
    overview: { type: String, required: true },
    investment: { type: Number, required: true },
    investmentCurrency: { type: String, default: 'INR' },
    profitMargin: { type: String },
    demand: { type: String, enum: ['Low', 'Medium', 'High', 'Very High'], default: 'Medium' },
    risk: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    growthRate: { type: String },
    targetMarket: { type: String },
    requiredCertifications: [{ type: String }],
    optionalCertifications: [{ type: String }],
    recommendedCertifications: [{ type: String }],
    governmentSchemes: [{ type: String }],
    businessGuide: { type: Schema.Types.ObjectId, ref: 'BusinessGuide' },
    faqs: [{ question: String, answer: String }],
    downloads: [{ name: String, url: String }],
    seoTitle: { type: String },
    seoDescription: { type: String },
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft', index: true },
    isFeatured: { type: Boolean, default: false },
    isPinned: { type: Boolean, default: false },
    active: { type: Boolean, default: true, index: true },
    deletedAt: { type: Date, index: true },
  },
  { timestamps: true }
);

export const BusinessOpportunity = model<IBusinessOpportunity>('BusinessOpportunity', BusinessOpportunitySchema);
