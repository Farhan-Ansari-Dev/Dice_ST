import MarketRequirement from '../models/MarketRequirement';
import MarketCertification from '../models/MarketCertification';
import ProductCategory from '../models/ProductCategory';
import mongoose from 'mongoose';

export interface MarketAccessOutput {
  readyMarkets: Array<{ country: string; score: number; missing: string[] }>;
  partialMarkets: Array<{ country: string; score: number; missing: string[] }>;
  blockedMarkets: Array<{ country: string; score: number; missing: string[] }>;
}

export class MarketAccessService {
  static async calculateMarketAccess(
    categoryId: string,
    ownedCertificationIds: string[]
  ): Promise<MarketAccessOutput> {
    const requirements = await MarketRequirement.find({ productCategoryId: categoryId })
      .populate('requiredCertifications')
      .populate('optionalCertifications');

    const result: MarketAccessOutput = {
      readyMarkets: [],
      partialMarkets: [],
      blockedMarkets: [],
    };

    const ownedSet = new Set(ownedCertificationIds.map(id => id.toString()));

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
