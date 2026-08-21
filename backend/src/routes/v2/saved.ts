/**
 * Saved items (Market Access bookmarks) routes.
 *
 *   POST   /saved                      { itemType, itemId, metadata? }  → save (idempotent)
 *   GET    /saved            ?itemType=opportunity                       → my saved items
 *   DELETE /saved/:itemType/:itemId                                      → un-save
 *
 * Strictly user-scoped: every query is filtered by the authenticated user, so a
 * user can only ever read or delete their OWN saved items. Saving is duplicate-
 * safe (unique index + upsert). For opportunities, the referenced object must
 * exist — we never persist a bookmark to a non-existent id.
 */
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../../middleware/authMongo';
import { validate } from '../../middleware/validate';
import { sendSuccess, sendError } from '../../utils/response';
import { SavedItem, SAVED_ITEM_TYPES, SavedItemType } from '../../models/SavedItem';
import { BusinessOpportunity } from '../../models/BusinessOpportunity';

const router = Router();
const wrap = (handler: any) => (req: Request, res: Response, next: NextFunction) => handler(req, res, next).catch(next);

const createSchema = {
  body: z.object({
    itemType: z.enum(SAVED_ITEM_TYPES),
    itemId: z.string().min(1).max(100),
    metadata: z.record(z.any()).optional(),
  }),
};

const listSchema = {
  query: z.object({
    itemType: z.enum(SAVED_ITEM_TYPES).optional(),
  }),
};

const deleteSchema = {
  params: z.object({
    itemType: z.enum(SAVED_ITEM_TYPES),
    itemId: z.string().min(1).max(100),
  }),
};

/** Confirm the referenced object actually exists before bookmarking it. */
async function itemExists(itemType: string, itemId: string): Promise<boolean> {
  if (itemType === 'opportunity') {
    const opp = await BusinessOpportunity.findById(itemId).select('_id').lean().catch(() => null);
    return !!opp;
  }
  return false;
}

// ── Save (idempotent) ───────────────────────────────────────────────────────
router.post('/', authenticate, validate(createSchema), wrap(async (req: AuthRequest, res: Response) => {
  const { itemType, itemId, metadata } = req.body as { itemType: SavedItemType; itemId: string; metadata?: any };

  if (!(await itemExists(itemType, itemId))) {
    return sendError(res, 'The item you tried to save does not exist.', 404);
  }

  // Upsert keeps saving duplicate-safe: a second save just refreshes metadata.
  const saved = await SavedItem.findOneAndUpdate(
    { user_id: req.user!._id, item_type: itemType, item_id: itemId } as any,
    { $set: { metadata: metadata ?? {} }, $setOnInsert: { user_id: req.user!._id, item_type: itemType, item_id: itemId } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  return sendSuccess(res, saved, 'Saved', 201);
}));

// ── My saved items ──────────────────────────────────────────────────────────
router.get('/', authenticate, validate(listSchema), wrap(async (req: AuthRequest, res: Response) => {
  const filter: any = { user_id: req.user!._id };
  if (req.query.itemType) filter.item_type = req.query.itemType;
  const items = await SavedItem.find(filter).sort({ createdAt: -1 }).lean();
  return sendSuccess(res, items);
}));

// ── Un-save ─────────────────────────────────────────────────────────────────
router.delete('/:itemType/:itemId', authenticate, validate(deleteSchema), wrap(async (req: AuthRequest, res: Response) => {
  const { itemType, itemId } = req.params;
  const result = await SavedItem.deleteOne({ user_id: req.user!._id, item_type: itemType, item_id: itemId } as any);
  return sendSuccess(res, { removed: result.deletedCount > 0 });
}));

export default router;
