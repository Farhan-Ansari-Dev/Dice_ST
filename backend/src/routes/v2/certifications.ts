import { Router, Request, Response, NextFunction } from 'express'
import { authenticate, AuthRequest } from '../../middleware/authMongo'
import { authorize } from '../../middleware/authorize'
import { Certification } from '../../models/Certification'
import { Application } from '../../models/Application'
import { sendSuccess, sendError } from '../../utils/response'
import { stripProtected } from '../../utils/sanitize'
import { documentService } from '../../services/documentService'

const router = Router()
const wrap = (fn: any) => (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next)

// Ownership scoping for reads. Staff (admin/super_admin) operate platform-wide;
// employees are org-scoped; clients see only certifications produced by an
// application they created. An org-less client cannot be scoped by org_id
// ({ org_id: undefined } would match every org-less record — the same IDOR trap
// documented in routes/v2/applications.ts), so scope by owned applications.
const certOwnershipFilter = async (req: AuthRequest): Promise<any> => {
  const role = req.user!.role
  if (role === 'admin' || role === 'super_admin') return {}
  if (role === 'employee') return { org_id: req.user!.org_id }
  const ownedAppIds = await Application.find({ created_by: req.user!._id }).distinct('_id')
  return { application_id: { $in: ownedAppIds } }
}

router.get('/', authenticate, authorize(['admin','employee','super_admin','client']), wrap(async (req: AuthRequest, res: Response) => {
  const query: any = await certOwnershipFilter(req)

  if (req.query.showDeleted !== 'true') {
    query.deleted_at = { $exists: false }
  }

  // includeDeleted: the soft-delete pre-find hook would override showDeleted=true
  const certs = await Certification.find(query)
    .setOptions(req.query.showDeleted === 'true' ? ({ includeDeleted: true } as any) : {})
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

router.get('/:id', authenticate, authorize(['admin','employee','super_admin','client']), wrap(async (req: AuthRequest, res: Response) => {
  const filter = { ...(await certOwnershipFilter(req)), _id: req.params.id }
  const cert = await Certification.findOne(filter)
    .populate('org_id', 'name')
    .populate('product_id', 'name')
    .lean()
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
    ...stripProtected(req.body),
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
    { ...stripProtected(req.body), updated_at: new Date() },
    { returnDocument: 'after' }
  )
  if (!cert) return sendError(res, 'Not found', 404)
  return sendSuccess(res, cert, 'Updated successfully')
}))

router.delete('/:id', authenticate, authorize(['admin','super_admin']), wrap(async (req: AuthRequest, res: Response) => {
  const cert = await Certification.findOneAndUpdate(
    certScope(req),
    { deleted_at: new Date(), updated_at: new Date() },
    { returnDocument: 'after' }
  )
  if (!cert) return sendError(res, 'Not found', 404)
  return sendSuccess(res, cert, 'Deleted successfully')
}))

router.post('/:id/restore', authenticate, authorize(['admin','super_admin']), wrap(async (req: AuthRequest, res: Response) => {
  // includeDeleted — the soft-delete pre-find hook would otherwise hide the
  // certification being restored.
  const cert = await Certification.findOneAndUpdate(
    certScope(req),
    { $unset: { deleted_at: 1 }, updated_at: new Date() },
    { returnDocument: 'after' }
  ).setOptions({ includeDeleted: true } as any)
  if (!cert) return sendError(res, 'Not found', 404)
  return sendSuccess(res, cert, 'Restored successfully')
}))

// Download the official certificate PDF. Resolves the linked Document
// (certificate_document_id) to a short-lived presigned URL, reusing the same
// documentService the /documents routes use. Ownership is enforced by
// certOwnershipFilter (clients can only reach certs from their own applications).
router.get('/:id/download', authenticate, authorize(['admin','employee','super_admin','client']), wrap(async (req: AuthRequest, res: Response) => {
  const filter = { ...(await certOwnershipFilter(req)), _id: req.params.id }
  const cert = await Certification.findOne(filter).lean()
  if (!cert) return sendError(res, 'Not found', 404)
  if (!cert.certificate_document_id) {
    return sendError(res, 'Certificate document is not available yet', 409)
  }
  const url = await documentService.getDownloadUrl(
    cert.certificate_document_id as any,
    undefined,
    req.user!._id as any,
  )
  return sendSuccess(res, { url, expires_in: 900 })
}))

export default router
