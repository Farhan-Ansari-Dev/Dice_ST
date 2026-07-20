/**
 * Product catalog routes.
 *
 * Products are the THINGS being certified. In the single-tenant DICE model the
 * catalog is Sanyog-managed at the platform level (org-optional): staff maintain
 * it, and clients pick a product from it when creating an Application.
 *
 * Reads: any authenticated user (clients need to browse the catalog).
 * Writes: admin / super_admin only (catalog is Sanyog-curated).
 */
import { Router, Request, Response, NextFunction } from 'express'
import { authenticate, requireRole, AuthRequest } from '../../middleware/authMongo'
import { Product } from '../../models/Product'
import { Application } from '../../models/Application'
import { sendSuccess, sendError } from '../../utils/response'
import { stripProtected } from '../../utils/sanitize'
import { getPaginationData, buildPaginationResponse } from '../../utils/pagination'

const router = Router()
const wrap = (fn: any) => (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next)

// Terminal application statuses — a product "in use" means it backs an application
// that isn't finished/closed.
const ACTIVE_APP_STATUSES = ['draft', 'submitted', 'docs_review', 'docs_required', 'tech_review', 'testing', 'approval_pending', 'approved', 'on_hold']

// Case-insensitive exact-match escape for a user string used in a RegExp.
const rxExact = (s: string) => new RegExp(`^${String(s ?? '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')

// A duplicate is the SAME name + brand + model_number + category (case-insensitive),
// among non-deleted products. Same name with a different brand/model is allowed.
async function findDuplicate(body: any, excludeId?: string) {
  const q: any = {
    deleted_at: null,
    name: rxExact(body.name),
    brand: body.brand ? rxExact(body.brand) : { $in: [null, ''] },
    model_number: body.model_number ? rxExact(body.model_number) : { $in: [null, ''] },
    category: rxExact(body.category),
  }
  if (excludeId) q._id = { $ne: excludeId }
  return Product.findOne(q as any).lean()
}

// GET /products — catalog list with search + pagination
router.get('/', authenticate, wrap(async (req: AuthRequest, res: Response) => {
  const query: any = {}
  if (req.query.showDeleted !== 'true') query.deleted_at = null
  if (req.query.category) query.category = req.query.category
  if (req.query.q) {
    const rx = new RegExp(String(req.query.q).trim(), 'i')
    query.$or = [{ name: rx }, { brand: rx }, { model_number: rx }]
  }

  const { page, limit, skip } = getPaginationData({ page: req.query.page as string, limit: req.query.limit as string })
  const [items, total] = await Promise.all([
    Product.find(query)
      .setOptions(req.query.showDeleted === 'true' ? ({ includeDeleted: true } as any) : {})
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Product.countDocuments(query),
  ])

  return res.json({ success: true, data: items, meta: buildPaginationResponse(total, page, limit) })
}))

// GET /products/:id
router.get('/:id', authenticate, wrap(async (req: AuthRequest, res: Response) => {
  const product = await Product.findById(req.params.id).lean()
  if (!product) return sendError(res, 'Not found', 404)
  return sendSuccess(res, product)
}))

// GET /products/:id/usage — how many active applications reference this product.
// Used by the admin UI to confirm before archiving ("used by X active applications").
router.get('/:id/usage', authenticate, wrap(async (req: AuthRequest, res: Response) => {
  const active_application_count = await Application.countDocuments({
    product_id: req.params.id,
    status: { $in: ACTIVE_APP_STATUSES },
    deleted_at: null,
  } as any)
  return sendSuccess(res, { active_application_count })
}))

// POST /products — create (admin/super_admin)
router.post('/', authenticate, requireRole('admin', 'super_admin'), wrap(async (req: AuthRequest, res: Response) => {
  if (!req.body?.name || !req.body?.category) return sendError(res, 'name and category are required', 400)
  const dup = await findDuplicate(req.body)
  if (dup) return sendError(res, 'A product with the same name, brand, model and category already exists', 409)

  const product = new Product({
    ...stripProtected(req.body),
    created_at: new Date(),
    updated_at: new Date(),
  })
  await product.save()
  return sendSuccess(res, product, 'Created successfully', 201)
}))

// PUT /products/:id — update (admin/super_admin)
router.put('/:id', authenticate, requireRole('admin', 'super_admin'), wrap(async (req: AuthRequest, res: Response) => {
  // Re-check duplicates against the resulting identity (merge existing + patch).
  const existing = await Product.findById(req.params.id).lean()
  if (!existing) return sendError(res, 'Not found', 404)
  const merged = { ...existing, ...stripProtected(req.body) }
  const dup = await findDuplicate(merged, req.params.id)
  if (dup) return sendError(res, 'A product with the same name, brand, model and category already exists', 409)

  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { ...stripProtected(req.body), updated_at: new Date() },
    { returnDocument: 'after' }
  )
  if (!product) return sendError(res, 'Not found', 404)
  return sendSuccess(res, product, 'Updated successfully')
}))

// DELETE /products/:id — soft delete (admin/super_admin)
router.delete('/:id', authenticate, requireRole('admin', 'super_admin'), wrap(async (req: AuthRequest, res: Response) => {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { deleted_at: new Date(), updated_at: new Date() },
    { returnDocument: 'after' }
  )
  if (!product) return sendError(res, 'Not found', 404)
  return sendSuccess(res, product, 'Deleted successfully')
}))

// POST /products/:id/restore — (admin/super_admin)
router.post('/:id/restore', authenticate, requireRole('admin', 'super_admin'), wrap(async (req: AuthRequest, res: Response) => {
  // includeDeleted: the soft-delete pre-find hook would otherwise hide the target.
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { deleted_at: null, updated_at: new Date() },
    { returnDocument: 'after' }
  ).setOptions({ includeDeleted: true } as any)
  if (!product) return sendError(res, 'Not found', 404)
  return sendSuccess(res, product, 'Restored successfully')
}))

export default router
