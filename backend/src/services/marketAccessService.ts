import MarketRequirement from '../models/MarketRequirement';
import MarketCertification from '../models/MarketCertification';
import ProductCategory from '../models/ProductCategory';
import { Workflow } from '../models/Workflow';
import { Organization } from '../models/Organization';
import mongoose from 'mongoose';
import { marketForCode } from '../utils/marketCatalog';

export interface RecommendedCertificationBody {
  id: string;
  name: string;
  legal_name?: string;
  allowed_cert_types: string[];
  accreditations: string[];
  scope?: string;
  countries: string[];
  product_categories: string[];
  recommendation_reason?: string;
}

export interface CertificationBodyFilters {
  certType?: string;
  country?: string;
  accreditation?: string;
  scope?: string;
  productCategory?: string;
  q?: string;
}

export interface MarketAccessOutput {
  readyMarkets: Array<{ country: string; score: number; missing: string[] }>;
  partialMarkets: Array<{ country: string; score: number; missing: string[] }>;
  blockedMarkets: Array<{ country: string; score: number; missing: string[] }>;
}

// ── Certification intelligence (the single resolver output) ──────────────────

export interface ResolvedDocument {
  doc_type: string;
  label: string;
  mandatory: boolean;
  required_for_stage: string;
  reason: string;
}

export interface ResolvedCertification {
  code: string;
  name: string;
  market: string;
  authority: string;
  estimatedTimeline: string;
  estimatedCost: string;
  renewalCycle: string;
  mandatory: boolean;
  workflow: {
    cert_type: string;
    display_name: string;
    issuing_body: string;
    estimated_duration_days: number;
    validity_period_months: number;
    fee_structure: Record<string, any>;
  } | null;
  requiredDocuments: ResolvedDocument[];
  requiredBusinessInfo: string[];
  governmentReferences: Array<{ label: string; url: string }>;
}

export interface ResolvedMarket {
  marketCode: string;
  market: string | null;
  verified: boolean;
  message?: string;
  requiredCertifications: ResolvedCertification[];
  optionalCertifications: ResolvedCertification[];
}

export interface CertificationIntelligence {
  product: string;
  productCategory: { id: string; name: string } | null;
  productValidationRequired: boolean;
  markets: ResolvedMarket[];
}

const UNVERIFIED_MESSAGE =
  "We don't currently have a verified compliance mapping for this product and market. A certification specialist will review it.";

export class MarketAccessService {
  /**
   * THE single certification resolver. Given a product (category name or id)
   * and a list of ISO market codes, returns exactly what our compliance
   * database knows — required/optional certifications, each enriched from its
   * Workflow (authority, timeline, cost, renewal, required documents, business
   * info, government references). Never invents certifications: when there is no
   * verified mapping it returns an honest, flagged result.
   *
   * Reused by the AI route, the market-access route, mobile and admin.
   */
  static async resolveCertifications(
    product: string,
    marketCodes: string[],
  ): Promise<CertificationIntelligence> {
    const category = await this.resolveCategory(product);
    const codes = Array.isArray(marketCodes) ? marketCodes : [];

    const markets: ResolvedMarket[] = [];
    for (const rawCode of codes) {
      const marketCode = String(rawCode || '').trim().toUpperCase();
      const market = marketForCode(marketCode);

      // Market not catalogued, or product not resolvable → honest empty result.
      if (!market || !category) {
        markets.push({
          marketCode,
          market,
          verified: false,
          message: UNVERIFIED_MESSAGE,
          requiredCertifications: [],
          optionalCertifications: [],
        });
        continue;
      }

      const requirement = await MarketRequirement.findOne({
        country: market,
        productCategoryId: category.id,
      })
        .populate('requiredCertifications')
        .populate('optionalCertifications');

      if (!requirement) {
        markets.push({
          marketCode,
          market,
          verified: false,
          message: UNVERIFIED_MESSAGE,
          requiredCertifications: [],
          optionalCertifications: [],
        });
        continue;
      }

      const required = await Promise.all(
        ((requirement.requiredCertifications as any[]) || []).map((c) =>
          this.enrichCertification(c, market, true),
        ),
      );
      const optional = await Promise.all(
        ((requirement.optionalCertifications as any[]) || []).map((c) =>
          this.enrichCertification(c, market, false),
        ),
      );

      markets.push({
        marketCode,
        market,
        verified: true,
        requiredCertifications: required,
        optionalCertifications: optional,
      });
    }

    return {
      product,
      productCategory: category,
      productValidationRequired: !category,
      markets,
    };
  }

  /**
   * Find certification bodies — searchable and filtered. Returns ONLY real,
   * approved Organizations(type='cb'). Certification eligibility
   * (allowed_cert_types) is the HARD filter: an ineligible CB is never returned.
   * Country / accreditation / scope / product-category / free-text narrow
   * further. Never invents a CB — an empty result is an honest "none available".
   * Future AI ranking may only re-rank these verified organisations.
   */
  static async searchCertificationBodies(
    filters: CertificationBodyFilters,
  ): Promise<RecommendedCertificationBody[]> {
    const and: any[] = [];

    // Certification eligibility — the CB must be able to issue this cert
    // (explicitly listed, or empty = handles all).
    if (filters.certType) {
      and.push({
        $or: [
          { 'settings.allowed_cert_types': filters.certType.trim() },
          { 'settings.allowed_cert_types': { $size: 0 } },
        ],
      });
    }
    if (filters.country) {
      and.push({ 'cb_profile.countries': filters.country.trim().toUpperCase() });
    }
    if (filters.accreditation) {
      and.push({ 'cb_profile.accreditations': new RegExp(escapeRegex(filters.accreditation.trim()), 'i') });
    }
    if (filters.scope) {
      and.push({ 'cb_profile.scope': new RegExp(escapeRegex(filters.scope.trim()), 'i') });
    }
    if (filters.productCategory) {
      and.push({ 'cb_profile.product_categories': new RegExp(`^${escapeRegex(filters.productCategory.trim())}$`, 'i') });
    }
    if (filters.q) {
      and.push({
        $or: [
          { name: new RegExp(escapeRegex(filters.q.trim()), 'i') },
          { legal_name: new RegExp(escapeRegex(filters.q.trim()), 'i') },
        ],
      });
    }

    const query: any = { type: 'cb' };
    if (and.length) query.$and = and;

    const cbs = await Organization.find(query).sort({ name: 1 }).lean();

    return cbs.map((o: any) => ({
      id: o._id.toString(),
      name: o.name,
      legal_name: o.legal_name,
      allowed_cert_types: o.settings?.allowed_cert_types ?? [],
      accreditations: o.cb_profile?.accreditations ?? [],
      scope: o.cb_profile?.scope,
      countries: o.cb_profile?.countries ?? [],
      product_categories: o.cb_profile?.product_categories ?? [],
    }));
  }

  /** True when a CB org is eligible to issue the given certification. */
  static async isEligibleCB(orgId: string, certType?: string): Promise<boolean> {
    const org: any = await Organization.findOne({ _id: orgId, type: 'cb' }).lean();
    if (!org) return false;
    if (!certType) return true;
    const allowed: string[] = org.settings?.allowed_cert_types ?? [];
    return allowed.length === 0 || allowed.includes(certType);
  }

  /** Resolve a product string to a ProductCategory (by name, id, or keyword). */
  private static async resolveCategory(
    product: string,
  ): Promise<{ id: string; name: string } | null> {
    const term = String(product || '').trim();
    if (!term) return null;
    const norm = term.toLowerCase();

    // Layered matching (most precise first) so more products resolve before the
    // manual-review fallback. Existing exact matches still take priority, so this
    // is purely additive / backward compatible.
    // 1. Exact category name (case-insensitive).
    let cat: any = await ProductCategory.findOne({
      categoryName: new RegExp(`^${escapeRegex(term)}$`, 'i'),
    });
    // 2. Category id.
    if (!cat && mongoose.Types.ObjectId.isValid(term)) {
      cat = await ProductCategory.findById(term);
    }
    // 3. Exact keyword.
    if (!cat) {
      cat = await ProductCategory.findOne({ keywords: norm });
    }
    // 4. Keyword token match — any significant word of the product name is a
    //    curated keyword (e.g. "Air Purifier" → keyword "purifier").
    if (!cat) {
      const tokens = norm.split(/[^a-z0-9]+/).filter((t) => t.length > 2);
      if (tokens.length) cat = await ProductCategory.findOne({ keywords: { $in: tokens } });
    }
    // 5. Phrase containment — a category name or keyword appears within the
    //    product name (e.g. "Air Purifier XL 3000" → "Air Purifier"). Categories
    //    are a small curated set, so this whole-set scan is cheap and precise.
    if (!cat) {
      const all = await ProductCategory.find({}).lean();
      cat = (all as any[]).find((c) =>
        norm.includes(String(c.categoryName || '').toLowerCase()) ||
        (c.keywords || []).some((k: any) => k && norm.includes(String(k).toLowerCase())),
      ) || null;
    }
    return cat ? { id: cat._id.toString(), name: (cat as any).categoryName } : null;
  }

  /** Enrich a MarketCertification with its Workflow-owned intelligence. */
  private static async enrichCertification(
    cert: any,
    market: string,
    mandatory: boolean,
  ): Promise<ResolvedCertification> {
    const workflowCertType: string = cert.workflow_cert_type || cert.code;
    const wf: any = await Workflow.findOne({ cert_type: workflowCertType, active: true })
      .sort({ version: -1 })
      .lean();

    const requiredDocuments: ResolvedDocument[] = [];
    const requiredBusinessInfo: string[] = [];
    const governmentReferences: Array<{ label: string; url: string }> = [];
    let workflow: ResolvedCertification['workflow'] = null;

    if (wf) {
      workflow = {
        cert_type: wf.cert_type,
        display_name: wf.display_name,
        issuing_body: wf.issuing_body,
        estimated_duration_days: wf.estimated_duration_days,
        validity_period_months: wf.validity_period_months,
        fee_structure: wf.fee_structure || {},
      };
      // Flatten stage documents, de-duplicating by doc_type (upload once), and
      // record the first stage that requires each — the "why".
      const seen = new Set<string>();
      for (const stage of wf.stages || []) {
        for (const doc of stage.required_docs || []) {
          if (seen.has(doc.doc_type)) continue;
          seen.add(doc.doc_type);
          requiredDocuments.push({
            doc_type: doc.doc_type,
            label: doc.label,
            mandatory: doc.mandatory,
            required_for_stage: stage.label,
            reason: `Required by ${cert.certificationName} during the "${stage.label}" stage.`,
          });
        }
      }
      requiredBusinessInfo.push(...(wf.required_business_info || []));
      governmentReferences.push(...(wf.helpful_links || []));
    }

    return {
      code: cert.code,
      name: cert.certificationName,
      market,
      authority: cert.authority,
      estimatedTimeline: cert.estimatedTimeline,
      estimatedCost: cert.estimatedCost,
      renewalCycle: cert.renewalCycle,
      mandatory,
      workflow,
      requiredDocuments,
      requiredBusinessInfo,
      governmentReferences,
    };
  }

  static async calculateMarketAccess(
    categoryId: string,
    ownedCertificationIds: string[],
  ): Promise<MarketAccessOutput> {
    const requirements = await MarketRequirement.find({ productCategoryId: categoryId })
      .populate('requiredCertifications')
      .populate('optionalCertifications');

    const result: MarketAccessOutput = {
      readyMarkets: [],
      partialMarkets: [],
      blockedMarkets: [],
    };

    const ownedSet = new Set(ownedCertificationIds.map((id) => id.toString()));

    for (const req of requirements) {
      const requiredCerts = req.requiredCertifications as any[];
      const missingCerts: string[] = [];

      let ownedRequiredCount = 0;

      for (const cert of requiredCerts) {
        if (ownedSet.has(cert._id.toString())) {
          ownedRequiredCount++;
        } else {
          missingCerts.push(cert.certificationName);
        }
      }

      const totalRequired = requiredCerts.length;
      let score = 100;
      if (totalRequired > 0) {
        score = Math.round((ownedRequiredCount / totalRequired) * 100);
      }

      const marketData = {
        country: req.country,
        score,
        missing: missingCerts,
      };

      if (score === 100) {
        result.readyMarkets.push(marketData);
      } else if (score > 0) {
        result.partialMarkets.push(marketData);
      } else {
        result.blockedMarkets.push(marketData);
      }
    }

    return result;
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
