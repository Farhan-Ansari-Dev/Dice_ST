import { Schema, model, Document, Types } from 'mongoose';

/**
 * A Product is the THING being certified.
 * One product can have multiple Applications across different cert types.
 */
export interface IProduct extends Document {
  org_id: Types.ObjectId;
  name: string;
  brand?: string;
  model_number?: string;
  category: string;             // "Electronics", "Food", "Wireless Device", etc.
  sub_category?: string;
  hsn_code?: string;            // Indian customs classification

  description?: string;
  specifications?: Record<string, any>;   // flexible spec sheet
  images: string[];                       // S3 keys

  // Manufacturing
  manufacturer?: {
    name: string;
    country_code: string;
    factory_address?: string;
  };

  // Trade
  is_imported: boolean;
  countries_of_sale: string[];   // ISO country codes

  // Status
  active: boolean;
  deleted_at?: Date;

  created_at: Date;
  updated_at: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    org_id:       { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    name:         { type: String, required: true, trim: true },
    brand:        { type: String, trim: true },
    model_number: { type: String, trim: true },
    category:     { type: String, required: true, index: true },
    sub_category: { type: String },
    hsn_code:     { type: String, index: true },

    description:    String,
    specifications: { type: Schema.Types.Mixed, default: {} },
    images:         { type: [String], default: [] },

    manufacturer: {
      name:            String,
      country_code:    { type: String, default: 'IN' },
      factory_address: String,
    },

    is_imported:        { type: Boolean, default: false, index: true },
    countries_of_sale:  { type: [String], default: ['IN'] },

    active:     { type: Boolean, default: true, index: true },
    deleted_at: { type: Date, index: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

ProductSchema.index({ org_id: 1, category: 1, active: 1 });
ProductSchema.index({ org_id: 1, name: 'text', brand: 'text', model_number: 'text' });

ProductSchema.pre(/^find/, function (this: any) {
  if (!this.getOptions().includeDeleted) this.where({ deleted_at: null });
});

export const Product = model<IProduct>('Product', ProductSchema);
