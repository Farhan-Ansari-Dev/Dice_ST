import { Request, Response } from 'express';
import mongoose from 'mongoose';
import ProductCategory from '../models/ProductCategory';
import MarketCertification from '../models/MarketCertification';
import MarketRequirement from '../models/MarketRequirement';
import { MarketAccessService } from '../services/marketAccessService';
import { codeForMarket } from '../utils/marketCatalog';

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
