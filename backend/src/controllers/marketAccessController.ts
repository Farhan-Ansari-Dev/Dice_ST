import { Request, Response } from 'express';
import mongoose from 'mongoose';
import ProductCategory from '../models/ProductCategory';
import MarketCertification from '../models/MarketCertification';
import MarketRequirement from '../models/MarketRequirement';
import { MarketAccessService } from '../services/marketAccessService';

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
