import { Router, Request, Response, NextFunction } from 'express'
import { authenticate, AuthRequest } from '../../middleware/authMongo'
import { authorize } from '../../middleware/authorize'
import { Certification } from '../../models/Certification'
import { Application } from '../../models/Application'
import { sendSuccess, sendError } from '../../utils/response'

const router = Router()
const wrap = (fn: any) => (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next)

router.get('/', authenticate, authorize(['admin','employee','super_admin']), wrap(async (req: AuthRequest, res: Response) => {
  const query: any = {}
  if (req.user!.role !== 'admin' && req.user!.role !== 'super_admin') {
    query.org_id = req.user!.org_id
  }
  
  if (req.query.showDeleted !== 'true') {
    query.deleted_at = { $exists: false }
  }

  const certs = await Certification.find(query)
    .populate('org_id', 'name')
    .populate('product_id', 'name')
    .sort({ created_at: -1 })
    .lean()
    
  return sendSuccess(res, certs)
}))

// Admins/super_admins operate platform-wide (matching the list route); others stay org-scoped.
const certScope = (req: AuthRequest): any => {
  const filter: any = { _id: req.params.id }
  if (req.user!.role !== 'admin' && req.user!.role !== 'super_admin') {
    filter.org_id = req.user!.org_id
  }
  return filter
}

router.get('/:id', authenticate, authorize(['admin','employee','super_admin']), wrap(async (req: AuthRequest, res: Response) => {
  const cert = await Certification.findOne(certScope(req)).lean()
  if (!cert) return sendError(res, 'Not found', 404)
  return sendSuccess(res, cert)
}))

router.post('/', authenticate, authorize(['admin','employee','super_admin']), wrap(async (req: AuthRequest, res: Response) => {
  // The schema requires org_id + product_id + application_id. Admins have no org of
  // their own, so when an application_id is supplied we derive org/product from it
  // server-side (never trusting client-sent org_id).
  let org_id = req.user!.org_id
  let { product_id } = req.body
  if (req.body.application_id) {
    const app = await Application.findById(req.body.application_id).lean()
    if (!app) return sendError(res, 'Application not found', 400)
    org_id = app.org_id as any
    product_id = product_id || app.product_id
  }
  const cert = new Certification({
    ...req.body,
    org_id,
    product_id,
    created_at: new Date(),
    updated_at: new Date()
  })
  await cert.save()
  return sendSuccess(res, cert, 'Created successfully', 201)
}))

router.put('/:id', authenticate, authorize(['admin','employee','super_admin']), wrap(async (req: AuthRequest, res: Response) => {
  const cert = await Certification.findOneAndUpdate(
    certScope(req),
    { ...req.body, updated_at: new Date() },
    { new: true }
  )
  if (!cert) return sendError(res, 'Not found', 404)
  return sendSuccess(res, cert, 'Updated successfully')
}))

router.delete('/:id', authenticate, authorize(['admin','super_admin']), wrap(async (req: AuthRequest, res: Response) => {
  const cert = await Certification.findOneAndUpdate(
    certScope(req),
    { deleted_at: new Date(), updated_at: new Date() },
    { new: true }
  )
  if (!cert) return sendError(res, 'Not found', 404)
  return sendSuccess(res, cert, 'Deleted successfully')
}))

router.post('/:id/restore', authenticate, wrap(async (req: AuthRequest, res: Response) => {
  const cert = await Certification.findOneAndUpdate(
    certScope(req),
    { $unset: { deleted_at: 1 }, updated_at: new Date() },
    { new: true }
  )
  if (!cert) return sendError(res, 'Not found', 404)
  return sendSuccess(res, cert, 'Restored successfully')
}))

export default router
