import { Request, Response } from 'express';
import { Country } from '../models/Country';
import { BusinessOpportunity } from '../models/BusinessOpportunity';
import { BusinessGuide } from '../models/BusinessGuide';
import { MarketTrend } from '../models/MarketTrend';
import { GovernmentScheme } from '../models/GovernmentScheme';
import { Product } from '../models/Product';
import { sendSuccess } from '../utils/response';

const wrap = (fn: any) => (req: Request, res: Response, next: any) => fn(req, res, next).catch(next);

// --- COUNTRIES ---
export const getCountries = wrap(async (req: Request, res: Response) => {
  const countries = await Country.find({ active: true });
  sendSuccess(res, countries);
});
export const getCountry = wrap(async (req: Request, res: Response) => {
  const country = await Country.findById(req.params.id);
  sendSuccess(res, country);
});
export const createCountry = wrap(async (req: Request, res: Response) => {
  const country = await Country.create(req.body);
  sendSuccess(res, country);
});
export const updateCountry = wrap(async (req: Request, res: Response) => {
  const country = await Country.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
  sendSuccess(res, country);
});
export const deleteCountry = wrap(async (req: Request, res: Response) => {
  const country = await Country.findByIdAndUpdate(req.params.id, { active: false, deletedAt: new Date() }, { returnDocument: 'after' });
  sendSuccess(res, country);
});

// --- BUSINESS OPPORTUNITIES ---
export const getOpportunities = wrap(async (req: Request, res: Response) => {
  const { status, industry, country, limit = 50 } = req.query;
  const query: any = { active: true };
  if (status) query.status = status;
  if (industry) query.industry = industry;
  if (country) query.country = country;
  
  const opps = await BusinessOpportunity.find(query).limit(Number(limit)).populate('businessGuide');
  sendSuccess(res, opps);
});
export const getOpportunity = wrap(async (req: Request, res: Response) => {
  const opp = await BusinessOpportunity.findById(req.params.id).populate('businessGuide');
  sendSuccess(res, opp);
});
export const createOpportunity = wrap(async (req: Request, res: Response) => {
  const opp = await BusinessOpportunity.create(req.body);
  sendSuccess(res, opp);
});
export const updateOpportunity = wrap(async (req: Request, res: Response) => {
  const opp = await BusinessOpportunity.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
  sendSuccess(res, opp);
});
export const deleteOpportunity = wrap(async (req: Request, res: Response) => {
  const opp = await BusinessOpportunity.findByIdAndUpdate(req.params.id, { active: false, deletedAt: new Date() }, { returnDocument: 'after' });
  sendSuccess(res, opp);
});

// --- BUSINESS GUIDES ---
export const getGuides = wrap(async (req: Request, res: Response) => {
  const guides = await BusinessGuide.find({ active: true });
  sendSuccess(res, guides);
});
export const getGuide = wrap(async (req: Request, res: Response) => {
  const guide = await BusinessGuide.findById(req.params.id).populate('relatedGuides');
  sendSuccess(res, guide);
});
export const createGuide = wrap(async (req: Request, res: Response) => {
  const guide = await BusinessGuide.create(req.body);
  sendSuccess(res, guide);
});
export const updateGuide = wrap(async (req: Request, res: Response) => {
  const guide = await BusinessGuide.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
  sendSuccess(res, guide);
});
export const deleteGuide = wrap(async (req: Request, res: Response) => {
  const guide = await BusinessGuide.findByIdAndUpdate(req.params.id, { active: false, deletedAt: new Date() }, { returnDocument: 'after' });
  sendSuccess(res, guide);
});

// --- MARKET TRENDS ---
export const getMarketTrends = wrap(async (req: Request, res: Response) => {
  const trends = await MarketTrend.find({ active: true });
  sendSuccess(res, trends);
});
export const createMarketTrend = wrap(async (req: Request, res: Response) => {
  const trend = await MarketTrend.create(req.body);
  sendSuccess(res, trend);
});
export const updateMarketTrend = wrap(async (req: Request, res: Response) => {
  const trend = await MarketTrend.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
  sendSuccess(res, trend);
});
export const deleteMarketTrend = wrap(async (req: Request, res: Response) => {
  const trend = await MarketTrend.findByIdAndUpdate(req.params.id, { active: false, deletedAt: new Date() }, { returnDocument: 'after' });
  sendSuccess(res, trend);
});

// --- GOVERNMENT SCHEMES ---
export const getGovernmentSchemes = wrap(async (req: Request, res: Response) => {
  const schemes = await GovernmentScheme.find({ active: true });
  sendSuccess(res, schemes);
});
export const createGovernmentScheme = wrap(async (req: Request, res: Response) => {
  const scheme = await GovernmentScheme.create(req.body);
  sendSuccess(res, scheme);
});
export const updateGovernmentScheme = wrap(async (req: Request, res: Response) => {
  const scheme = await GovernmentScheme.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
  sendSuccess(res, scheme);
});
export const deleteGovernmentScheme = wrap(async (req: Request, res: Response) => {
  const scheme = await GovernmentScheme.findByIdAndUpdate(req.params.id, { active: false, deletedAt: new Date() }, { returnDocument: 'after' });
  sendSuccess(res, scheme);
});
