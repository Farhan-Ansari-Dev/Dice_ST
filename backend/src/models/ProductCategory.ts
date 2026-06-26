import mongoose, { Schema, Document } from 'mongoose';

export interface IProductCategory extends Document {
  categoryName: string;
  keywords: string[];
  description?: string;
  industry: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProductCategorySchema: Schema = new Schema({
  categoryName: { type: String, required: true, unique: true },
  keywords: [{ type: String }],
  description: { type: String },
  industry: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model<IProductCategory>('ProductCategory', ProductCategorySchema);
