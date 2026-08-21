import { Router } from 'express';
import {
  getProductCategories,
  getCertifications,
  getCountries,
  getMarketRules,
  checkMarketAccess,
  getCoverage,
  searchMarketAccess
} from '../controllers/marketAccessController';
import { authenticate } from '../middleware/authMongo';

const router = Router();

router.get('/coverage', getCoverage);
router.get('/search', authenticate, searchMarketAccess);
router.get('/product-categories', getProductCategories);
router.get('/certifications', getCertifications);
router.get('/countries', getCountries);
router.get('/rules', getMarketRules);

// Support both GET and POST for checking access, as requested
router.post('/check', checkMarketAccess);
router.get('/check', checkMarketAccess);

export default router;
