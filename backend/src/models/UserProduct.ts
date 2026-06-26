import mongoose, { Schema, Document } from 'mongoose';

export interface IUserProduct extends Document {
  userId: string;
  productName: string;
  categoryId: mongoose.Types.ObjectId;
  existingCertifications: mongoose.Types.ObjectId[];
  targetMarkets: string[];
  createdAt: Date;
  updatedAt: Date;
}

const UserProductSchema: Schema = new Schema({
  userId: { type: String, required: true },
  productName: { type: String, required: true },
  categoryId: { type: Schema.Types.ObjectId, ref: 'ProductCategory', required: true },
  existingCertifications: [{ type: Schema.Types.ObjectId, ref: 'MarketCertification' }],
  targetMarkets: [{ type: String }],
}, { timestamps: true });

export default mongoose.model<IUserProduct>('UserProduct', UserProductSchema);
