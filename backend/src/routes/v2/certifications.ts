import { Router, Request, Response, NextFunction } from 'express'
import { authenticate, AuthRequest } from '../../middleware/authMongo'
import { authorize } from '../../middleware/authorize'
import { Certification } from '../../models/Certification'
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

router.get('/:id', authenticate, authorize(['admin','employee','super_admin']), wrap(async (req: AuthRequest, res: Response) => {
  const cert = await Certification.findOne({ _id: req.params.id, org_id: req.user!.org_id }).lean()
  if (!cert) return sendError(res, 'Not found', 404)
  return sendSuccess(res, cert)
}))

router.post('/', authenticate, authorize(['admin','employee','super_admin']), wrap(async (req: AuthRequest, res: Response) => {
  const cert = new Certification({
    ...req.body,
    org_id: req.user!.org_id,
    created_at: new Date(),
    updated_at: new Date()
  })
  await cert.save()
  return sendSuccess(res, cert, 'Created successfully', 201)
}))

router.put('/:id', authenticate, authorize(['admin','employee','super_admin']), wrap(async (req: AuthRequest, res: Response) => {
  const cert = await Certification.findOneAndUpdate(
    { _id: req.params.id, org_id: req.user!.org_id },
    { ...req.body, updated_at: new Date() },
    { new: true }
  )
  if (!cert) return sendError(res, 'Not found', 404)
  return sendSuccess(res, cert, 'Updated successfully')
}))

router.delete('/:id', authenticate, authorize(['admin','super_admin']), wrap(async (req: AuthRequest, res: Response) => {
  const cert = await Certification.findOneAndUpdate(
    { _id: req.params.id, org_id: req.user!.org_id },
    { deleted_at: new Date(), updated_at: new Date() },
    { new: true }
  )
  if (!cert) return sendError(res, 'Not found', 404)
  return sendSuccess(res, cert, 'Deleted successfully')
}))

router.post('/:id/restore', authenticate, wrap(async (req: AuthRequest, res: Response) => {
  const cert = await Certification.findOneAndUpdate(
    { _id: req.params.id, org_id: req.user!.org_id },
    { $unset: { deleted_at: 1 }, updated_at: new Date() },
    { new: true }
  )
  if (!cert) return sendError(res, 'Not found', 404)
  return sendSuccess(res, cert, 'Restored successfully')
}))

export default router
