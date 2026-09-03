/**
 * Trade Traffic routes.
 *
 *   POST /trade/traffic  { productName?, productDescription?, code?, market? }
 *
 * Validates the product↔HS pairing (wrong-HS detection) and returns verified
 * trade traffic when a real provider has it — otherwise an honest "unavailable"
 * state. Never fabricates trade numbers.
 */
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authMongo';
import { validate } from '../../middleware/validate';
import { sendSuccess } from '../../utils/response';
import { requireAiConsentIf, bodyHasProductText } from '../../services/ai/aiConsent';
import { getTradeTraffic } from '../../services/tradeDataService';

const router = Router();
const wrap = (handler: any) => (req: Request, res: Response, next: NextFunction) => handler(req, res, next).catch(next);

const trafficSchema = {
  body: z
    .object({
      productName: z.string().max(200).optional(),
      productDescription: z.string().max(1000).optional(),
      code: z.string().max(20).optional(),
      market: z.string().max(3).optional(),
    })
    .refine((b) => [b.productName, b.productDescription, b.code].some((v) => v && String(v).trim()), {
      message: 'Provide a product name, description or HS code.',
    }),
};

// Trade traffic classifies the product↔HS pairing via AI when product text is
// supplied; a code-only request needs no AI consent.
router.post('/traffic', authenticate, validate(trafficSchema), requireAiConsentIf(bodyHasProductText), wrap(async (req: Request, res: Response) => {
  const result = await getTradeTraffic(req.body);
  return sendSuccess(res, result);
}));

export default router;
