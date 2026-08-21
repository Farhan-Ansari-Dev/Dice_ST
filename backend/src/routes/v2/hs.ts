/**
 * HS classification routes.
 *
 *   POST /hs/validate  { code?, productDescription? }  → HsValidationResult
 *   POST /hs/suggest   { productDescription }          → dataset-backed candidates
 *
 * These are the ONLY sanctioned way for the app to classify or validate an HS
 * code. A code is verified strictly against the HsCode dataset; AI assists but
 * never becomes the source of truth (see services/hsValidationService).
 *
 * When a result carries requiresManualReview, the client routes the user to the
 * EXISTING expert-review workflow (POST /leads → createDraftApplication with
 * manualReview) — no separate review system is introduced here.
 */
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authMongo';
import { validate } from '../../middleware/validate';
import { sendSuccess } from '../../utils/response';
import { validateHsCode, suggestHsCodes } from '../../services/hsValidationService';
import { analyzeProductHs } from '../../services/productHsService';

const router = Router();
const wrap = (handler: any) => (req: Request, res: Response, next: NextFunction) => handler(req, res, next).catch(next);

const validateSchema = {
  body: z
    .object({
      code: z.string().max(20).optional(),
      productDescription: z.string().max(500).optional(),
    })
    .refine((b) => (b.code && b.code.trim()) || (b.productDescription && b.productDescription.trim()), {
      message: 'Provide an HS code, a product description, or both.',
    }),
};

const suggestSchema = {
  body: z.object({
    productDescription: z.string().min(1).max(500),
  }),
};

const analyzeSchema = {
  body: z
    .object({
      productName: z.string().max(200).optional(),
      productDescription: z.string().max(1000).optional(),
      category: z.string().max(120).optional(),
      brand: z.string().max(120).optional(),
      model: z.string().max(120).optional(),
      code: z.string().max(20).optional(),
      market: z.string().max(3).optional(),
    })
    .refine(
      (b) =>
        [b.productName, b.productDescription, b.category, b.brand, b.model, b.code].some(
          (v) => v && String(v).trim(),
        ),
      { message: 'Provide at least a product name, description or HS code.' },
    ),
};

// POST /hs/validate
router.post('/validate', authenticate, validate(validateSchema), wrap(async (req: Request, res: Response) => {
  const { code, productDescription } = req.body as { code?: string; productDescription?: string };
  const result = await validateHsCode({ code, productDescription });
  return sendSuccess(res, result);
}));

// POST /hs/suggest
router.post('/suggest', authenticate, validate(suggestSchema), wrap(async (req: Request, res: Response) => {
  const { productDescription } = req.body as { productDescription: string };
  const result = await suggestHsCodes(productDescription);
  return sendSuccess(res, result);
}));

// POST /hs/analyze — Product Analyzer: classify a product and/or validate a
// user-supplied HS code against it (wrong-HS detection + recommendations).
router.post('/analyze', authenticate, validate(analyzeSchema), wrap(async (req: Request, res: Response) => {
  const result = await analyzeProductHs(req.body);
  return sendSuccess(res, result);
}));

export default router;
