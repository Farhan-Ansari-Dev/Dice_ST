import mongoose, { Document, Schema } from 'mongoose';

export interface IKnowledge extends Document {
  category: string;
  question: string;
  answer: string;
  keywords: string[];
  created_at: Date;
  updated_at: Date;
}

const KnowledgeSchema = new Schema<IKnowledge>(
  {
    category: { type: String, required: true },
    question: { type: String, required: true },
    answer: { type: String, required: true },
    keywords: { type: [String], default: [] },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

// Create a text index on question and answer for fast keyword-based retrieval
KnowledgeSchema.index({ question: 'text', answer: 'text', keywords: 'text' });

export const Knowledge = mongoose.model<IKnowledge>('Knowledge', KnowledgeSchema);
