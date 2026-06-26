import mongoose, { Schema, Document } from 'mongoose';
import { IProductCategory } from './ProductCategory';
import { IMarketCertification } from './MarketCertification';

export interface IMarketRequirement extends Document {
  country: string;
  productCategoryId: mongoose.Types.ObjectId | IProductCategory;
  requiredCertifications: mongoose.Types.ObjectId[] | IMarketCertification[];
  optionalCertifications: mongoose.Types.ObjectId[] | IMarketCertification[];
  marketReadinessRules?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MarketRequirementSchema: Schema = new Schema({
  country: { type: String, required: true },
  productCategoryId: { type: Schema.Types.ObjectId, ref: 'ProductCategory', required: true },
  requiredCertifications: [{ type: Schema.Types.ObjectId, ref: 'MarketCertification' }],
  optionalCertifications: [{ type: Schema.Types.ObjectId, ref: 'MarketCertification' }],
  marketReadinessRules: { type: String },
}, { timestamps: true });

MarketRequirementSchema.index({ country: 1, productCategoryId: 1 }, { unique: true });

export default mongoose.model<IMarketRequirement>('MarketRequirement', MarketRequirementSchema);
