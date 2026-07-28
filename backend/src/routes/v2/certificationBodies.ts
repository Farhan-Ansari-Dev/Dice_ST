/**
 * Certification Body selection — a secondary feature layered onto the existing
 * Application lifecycle. The default is always Sanyog-managed. CB choice is an
 * attribute on the Application (per certification) — no new workflow.
 */
import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../../middleware/authMongo';
import { Application } from '../../models/Application';
import { Organization } from '../../models/Organization';
import { MarketAccessService } from '../../services/marketAccessService';

const router = Router();
const wrap = (fn: any) => (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
const STAFF_ROLES = ['admin', 'super_admin', 'employee'];

// The "Help me choose" explanation shown BEFORE any list (never a list first).
const WHY_REQUIRED =
  'A Certification Body (CB) is the accredited organisation that assesses your product and issues the certificate. The CB you use affects your cost, timeline, and which markets accept the result — so it is worth choosing deliberately.';
const FACTORS = [
  { key: 'accreditation', label: 'Accreditation & scope', detail: 'The CB must be accredited for this exact certification and product scope.' },
  { key: 'cost', label: 'Cost', detail: 'Fees vary between certification bodies.' },
  { key: 'timeline', label: 'Timeline', detail: 'Turnaround time can differ significantly.' },
  { key: 'country', label: 'Country coverage', detail: 'Some CBs are recognised in more destination markets than others.' },
  { key: 'expertise', label: 'Product expertise', detail: 'Experience with your product type reduces back-and-forth.' },
];

/**
 * GET /certification-bodies?cert_type=BIS_CRS
 * Returns the "Help me choose" explanation and the real, approved CBs for this
 * certification. Never fabricates — an empty list is honest and the caller
 * should offer Sanyog-managed instead.
 */
router.get('/', authenticate, wrap(async (req: AuthRequest, res: Response) => {
  const certType = String(req.query.cert_type || '').trim();
  const certificationBodies = certType
    ? await MarketAccessService.recommendCertificationBodies(certType)
    : [];
  const available = certificationBodies.length > 0;

  return res.json({
    success: true,
    data: {
      certType,
      whyRequired: WHY_REQUIRED,
      factors: FACTORS,
      available,
      certificationBodies,
      message: available
        ? undefined
        : 'No accredited Certification Body is currently available for this certification. Sanyog can manage this certification for you.',
    },
  });
}));

/**
 * PUT /certification-bodies/application/:id
 * Records the customer's CB choice on their Application. Never blocks — default
 * remains Sanyog-managed.
 * body: { mode, org_id?, name? }
 */
router.put('/application/:id', authenticate, wrap(async (req: AuthRequest, res: Response) => {
  const mode = String(req.body?.mode || '').trim();
  if (!['sanyog_managed', 'customer_selected', 'recommended'].includes(mode)) {
    return res.status(400).json({ success: false, message: 'mode must be sanyog_managed, customer_selected or recommended.' });
  }

  const filter: any = { _id: req.params.id };
  if (!STAFF_ROLES.includes(req.user!.role)) filter.created_by = req.user!._id;
  const application = await Application.findOne(filter);
  if (!application) return res.status(404).json({ success: false, message: 'Application not found.' });

  const cb: any = { mode, selected_by: req.user!._id, selected_at: new Date() };

  if (mode === 'customer_selected' || mode === 'recommended') {
    const orgId = req.body?.org_id ? String(req.body.org_id) : undefined;
    const name = req.body?.name ? String(req.body.name).trim() : undefined;

    if (orgId) {
      // Must be a real, approved CB organisation.
      const org = await Organization.findOne({ _id: orgId, type: 'cb' });
      if (!org) return res.status(400).json({ success: false, message: 'The selected Certification Body was not found.' });
      cb.org_id = org._id;
      cb.name = org.name;
    } else if (name && mode === 'customer_selected') {
      // Off-platform CB the customer already works with.
      cb.name = name;
    } else {
      return res.status(400).json({ success: false, message: 'A Certification Body (org_id or name) is required for this mode.' });
    }
  }

  application.certification_body = cb;
  await application.save();

  return res.json({ success: true, data: application.certification_body });
}));

export default router;
