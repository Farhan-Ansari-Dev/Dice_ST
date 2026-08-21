/**
 * HsCode — the authoritative HS (Harmonized System) classification dictionary.
 *
 * This is a REFERENCE model, deliberately distinct from product instances
 * (Product / UserProduct) and from the coarse ProductCategory grouping. It is
 * the single source of truth the HS validation service consumes: a code is only
 * ever treated as "verified" because a row exists here, sourced from an official
 * published nomenclature (recorded per-row in `source` / `sourceVersion`).
 *
 * IMPORTANT — data integrity:
 *   - Every row must originate from an authoritative source (WCO HS-2022, etc.).
 *   - AI must NEVER create rows here. AI may only rank/compare existing rows.
 *   - Coverage is intentionally a curated subset ("Verified HS coverage
 *     currently available in DICE"), NOT a complete global HS database.
 *
 * Domain boundary: HS classification identifies WHAT a product is. It is NOT a
 * country tariff code, an import/export duty, a VAT/GST rate, or a certification
 * requirement — those live in their own models and are only *linked* by code.
 */
import { Schema, model, Document, Types } from 'mongoose';

/** Nomenclature level of a code: 4 = heading, 6 = subheading, 8 = national. */
export type HsLevel = 4 | 6 | 8;

export interface IHsCode extends Document {
  /** Normalized, digits-only code, e.g. "851713". Unique. */
  code: string;
  /** Human display form with dots, e.g. "8517.13". */
  displayCode: string;
  level: HsLevel;
  /** Official heading/subheading text from the source nomenclature. */
  description: string;
  /** 2-digit chapter, e.g. "85". */
  chapter: string;
  /** 4-digit heading, e.g. "8517". */
  heading: string;
  /** Section (roman numeral), optional, e.g. "XVI". */
  section?: string;
  /** Search keywords used to derive dataset-backed candidates. */
  keywords: string[];
  /** Optional link to the coarse ProductCategory (reuse, not duplication). */
  productCategoryId?: Types.ObjectId;
  /** Statistical unit, optional (e.g. "u"). */
  unit?: string;
  /** Authoritative source name, e.g. "WCO HS-2022". Required for integrity. */
  source: string;
  /** Source version/year, e.g. "2022". Required for integrity. */
  sourceVersion: string;
  /** When this row was verified against the source. Required for integrity. */
  verifiedAt: Date;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const HsCodeSchema = new Schema<IHsCode>(
  {
    code:        { type: String, required: true, unique: true, index: true },
    displayCode: { type: String, required: true },
    level:       { type: Number, enum: [4, 6, 8], required: true },
    description: { type: String, required: true },
    chapter:     { type: String, required: true, index: true },
    heading:     { type: String, required: true, index: true },
    section:     { type: String },
    keywords:    { type: [String], default: [], index: true },
    productCategoryId: { type: Schema.Types.ObjectId, ref: 'ProductCategory', index: true },
    unit:        { type: String },
    // Provenance — never optional in practice; a row without a real source must
    // not exist. Enforced required so seeds cannot silently omit it.
    source:        { type: String, required: true },
    sourceVersion: { type: String, required: true },
    verifiedAt:    { type: Date, required: true },
    active:      { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export const HsCode = model<IHsCode>('HsCode', HsCodeSchema);
export default HsCode;
