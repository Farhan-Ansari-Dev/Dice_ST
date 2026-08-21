import { Request, Response } from 'express';
import mongoose from 'mongoose';
import ProductCategory from '../models/ProductCategory';
import MarketCertification from '../models/MarketCertification';
import MarketRequirement from '../models/MarketRequirement';
import HsCode from '../models/HsCode';
import { BusinessOpportunity } from '../models/BusinessOpportunity';
import { Country } from '../models/Country';
import { MarketAccessService } from '../services/marketAccessService';
import { codeForMarket } from '../utils/marketCatalog';

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * GET /market-access/search?q=
 * Domain-aware search over GLOBAL reference data only (HS codes, certifications,
 * opportunities, markets, product categories) — never user-specific records, so
 * no cross-user data is exposed. Returns typed, grouped results the app deep-
 * links into. Empty groups are honest "nothing found", never fabricated.
 */
export const searchMarketAccess = async (req: Request, res: Response): Promise<any> => {
  try {
    const q = String(req.query.q ?? '').trim();
    if (q.length < 2) {
      return res.json({ query: q, results: { hsCodes: [], certifications: [], opportunities: [], markets: [], categories: [] } });
    }
    const rx = new RegExp(escapeRegex(q), 'i');
    const digits = q.replace(/[^0-9]/g, '');
    const LIMIT = 6;

    const [hsCodes, certifications, opportunities, markets, categories] = await Promise.all([
      HsCode.find({
        active: true,
        $or: [
          { keywords: rx },
          { description: rx },
          ...(digits.length >= 2 ? [{ code: new RegExp(`^${digits}`) }] : []),
        ],
      }).sort({ level: -1 }).limit(LIMIT).lean(),
      MarketCertification.find({ $or: [{ certificationName: rx }, { code: rx }, { authority: rx }] }).limit(LIMIT).lean(),
      BusinessOpportunity.find({ active: true, status: 'published', $or: [{ title: rx }, { industry: rx }, { category: rx }, { country: rx }] }).limit(LIMIT).lean(),
      Country.find({ active: true, $or: [{ name: rx }, { code: rx }] }).limit(LIMIT).lean(),
      ProductCategory.find({ $or: [{ categoryName: rx }, { keywords: rx }] }).limit(LIMIT).lean(),
    ]);

    return res.json({
      query: q,
      results: {
        hsCodes: hsCodes.map((h: any) => ({ code: h.code, displayCode: h.displayCode, description: h.description, source: h.source })),
        certifications: certifications.map((c: any) => ({ code: c.code, name: c.certificationName, authority: c.authority, country: c.country })),
        opportunities: opportunities.map((o: any) => ({ _id: String(o._id), title: o.title, industry: o.industry, country: o.country, investment: o.investment, demand: o.demand, requiredCertifications: o.requiredCertifications })),
        markets: markets.map((m: any) => ({ code: m.code, name: m.name, flag: m.flag })),
        categories: categories.map((c: any) => ({ id: String(c._id), name: c.categoryName })),
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error searching market access' });
  }
};

/**
 * GET /market-access/coverage
 * Returns exactly the product categories and markets that have verified
 * requirement data (source of truth = MarketRequirement), so the mobile New
 * Certification screen offers only combinations the analyzer can actually
 * resolve — instead of listing products/markets that always return "no mapping".
 * Response: { categories: string[], markets: { code, name }[] }
 */
export const getCoverage = async (_req: Request, res: Response): Promise<any> => {
  try {
    const [countryNames, catIds] = await Promise.all([
      MarketRequirement.distinct('country'),
      MarketRequirement.distinct('productCategoryId'),
    ]);

    const cats = await ProductCategory.find({ _id: { $in: catIds } }).sort({ categoryName: 1 });
    const categories = cats.map((c: any) => c.categoryName).filter(Boolean);

    // Map each covered market name back to a resolver-understood ISO code; drop
    // any that aren't catalogued (defensive — keeps the UI in lock-step with the
    // resolver so a selectable market can never fail to resolve).
    const seen = new Set<string>();
    const markets = (countryNames as string[])
      .map((name) => ({ code: codeForMarket(name), name }))
      .filter((m): m is { code: string; name: string } => !!m.code && !seen.has(m.code) && !!seen.add(m.code))
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json({ categories, markets });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching coverage' });
  }
};

export const getProductCategories = async (req: Request, res: Response): Promise<any> => {
  try {
    const categories = await ProductCategory.find().sort({ categoryName: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching categories' });
  }
};

export const getCertifications = async (req: Request, res: Response): Promise<any> => {
  try {
    const certifications = await MarketCertification.find().sort({ certificationName: 1 });
    res.json(certifications);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching certifications' });
  }
};

export const getCountries = async (req: Request, res: Response): Promise<any> => {
  try {
    const countries = await MarketRequirement.distinct('country');
    res.json(countries.sort());
  } catch (error) {
    res.status(500).json({ message: 'Error fetching countries' });
  }
};

export const getMarketRules = async (req: Request, res: Response): Promise<any> => {
  try {
    const rules = await MarketRequirement.find()
      .populate('productCategoryId')
      .populate('requiredCertifications');
    res.json(rules);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching rules' });
  }
};

export const checkMarketAccess = async (req: Request, res: Response): Promise<any> => {
  try {
    const { productCategory, certificationsOwned } = req.body;
    
    let category = await ProductCategory.findOne({ categoryName: productCategory });
    if (!category && mongoose.Types.ObjectId.isValid(productCategory)) {
      category = await ProductCategory.findById(productCategory);
    }
    
    if (!category) {
      return res.status(404).json({ message: 'Product category not found' });
    }

    const output = await MarketAccessService.calculateMarketAccess(
      category._id.toString(),
      certificationsOwned || []
    );

    res.json(output);
  } catch (error) {
    res.status(500).json({ message: 'Error calculating market access' });
  }
};
