import { Router } from 'express';
import {
  getProductCategories,
  getCertifications,
  getCountries,
  getMarketRules,
  checkMarketAccess
} from '../controllers/marketAccessController';

const router = Router();

router.get('/product-categories', getProductCategories);
router.get('/certifications', getCertifications);
router.get('/countries', getCountries);
router.get('/rules', getMarketRules);

// Support both GET and POST for checking access, as requested
router.post('/check', checkMarketAccess);
router.get('/check', checkMarketAccess);

export default router;
