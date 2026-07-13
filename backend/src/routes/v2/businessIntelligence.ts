import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../../middleware/authMongo';
import { authorize } from '../../middleware/authorize';
import * as bic from '../../controllers/businessIntelligenceController';

const router = Router();

// All BI data is global reference/market-intelligence content (no org ownership),
// so authenticated users may READ it. Mutations (POST/PUT/DELETE) are restricted
// to admins to prevent unauthorized modification of shared platform data.
router.use(authenticate);
router.use((req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.method === 'GET') return next();
  return authorize(['admin', 'super_admin'], { orgScoped: false })(req, res, next);
});

// Countries
router.get('/countries', bic.getCountries);
router.get('/countries/:id', bic.getCountry);
router.post('/countries', bic.createCountry);
router.put('/countries/:id', bic.updateCountry);
router.delete('/countries/:id', bic.deleteCountry);

// Opportunities
router.get('/opportunities', bic.getOpportunities);
router.get('/opportunities/:id', bic.getOpportunity);
router.post('/opportunities', bic.createOpportunity);
router.put('/opportunities/:id', bic.updateOpportunity);
router.delete('/opportunities/:id', bic.deleteOpportunity);

// Guides
router.get('/guides', bic.getGuides);
router.get('/guides/:id', bic.getGuide);
router.post('/guides', bic.createGuide);
router.put('/guides/:id', bic.updateGuide);
router.delete('/guides/:id', bic.deleteGuide);

// Market Trends
router.get('/trends', bic.getMarketTrends);
router.post('/trends', bic.createMarketTrend);
router.put('/trends/:id', bic.updateMarketTrend);
router.delete('/trends/:id', bic.deleteMarketTrend);

// Government Schemes
router.get('/schemes', bic.getGovernmentSchemes);
router.post('/schemes', bic.createGovernmentScheme);
router.put('/schemes/:id', bic.updateGovernmentScheme);
router.delete('/schemes/:id', bic.deleteGovernmentScheme);

export default router;
