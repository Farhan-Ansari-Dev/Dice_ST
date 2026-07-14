import { Schema, model, Document } from 'mongoose';

export interface ICountry extends Document {
  name: string;
  code: string;
  flag: string;
  demandLevel: 'Low' | 'Medium' | 'High' | 'Very High';
  importOpportunity: 'Low' | 'Medium' | 'High';
  exportOpportunity: 'Low' | 'Medium' | 'High';
  marketGrowth: number;
  overview: string;
  topImportedProducts: string[];
  topExportedProducts: string[];
  growingIndustries: string[];
  restrictedProducts: string[];
  mandatoryCertifications: string[];
  governmentPortals: { name: string; url: string }[];
  importProcedure: string;
  exportProcedure: string;
  active: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CountrySchema = new Schema<ICountry>(
  {
    name: { type: String, required: true, unique: true },
    code: { type: String, required: true, unique: true },
    flag: { type: String, required: true },
    demandLevel: { type: String, enum: ['Low', 'Medium', 'High', 'Very High'], default: 'Medium' },
    importOpportunity: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    exportOpportunity: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    marketGrowth: { type: Number, default: 0 },
    overview: { type: String },
    topImportedProducts: [{ type: String }],
    topExportedProducts: [{ type: String }],
    growingIndustries: [{ type: String }],
    restrictedProducts: [{ type: String }],
    mandatoryCertifications: [{ type: String }],
    governmentPortals: [{ name: String, url: String }],
    importProcedure: { type: String },
    exportProcedure: { type: String },
    active: { type: Boolean, default: true, index: true },
    deletedAt: { type: Date, index: true },
  },
  { timestamps: true }
);

export const Country = model<ICountry>('Country', CountrySchema);
