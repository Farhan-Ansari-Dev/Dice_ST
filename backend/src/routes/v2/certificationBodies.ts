/**
 * Certification Body selection — a secondary feature layered onto the existing
 * Application lifecycle. The default is always Sanyog-managed. CB choice is an
 * attribute on the Application (per certification) — no new workflow.
 *
 * Customer sets a preferred CB (found via search, or entered manually); a
 * manager then accepts or overrides it. For Sanyog-managed, staff assign the CB.
 * Only real, eligible Organizations(type='cb') are ever surfaced or accepted.
 */
import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, AuthRequest, requireRole, ADMIN_ROLES } from '../../middleware/authMongo';
import { Application } from '../../models/Application';
import { MarketAccessService } from '../../services/marketAccessService';

const router = Router();
const wrap = (fn: any) => (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
const STAFF_ROLES = ['admin', 'super_admin', 'employee'];

// The "Find a Certification Body" explanation shown before the searchable list.
const WHY_REQUIRED =
  'A Certification Body (CB) is the accredited organisation that assesses your product and issues the certificate. The CB you use affects your cost, timeline, and which markets accept the result — so it is worth choosing deliberately.';
const FACTORS = [
  { key: 'accreditation', label: 'Accreditation & scope', detail: 'The CB must be accredited for this exact certification and product scope.' },
  { key: 'cost', label: 'Cost', detail: 'Fees vary between certification bodies.' },
  { key: 'timeline', label: 'Timeline', detail: 'Turnaround time can differ significantly.' },
  { key: 'country', label: 'Country coverage', detail: 'Some CBs are recognised in more destination markets than others.' },
  { key: 'expertise', label: 'Product expertise', detail: 'Experience with your product type reduces back-and-forth.' },
];

const s = (v: any) => (v === undefined || v === null ? undefined : String(v).trim() || undefined);

/**
 * GET /certification-bodies?cert_type=&country=&accreditation=&scope=&product_category=&q=
 * Explains first, then returns the searchable, filtered list of REAL eligible CBs.
 */
router.get('/', authenticate, wrap(async (req: AuthRequest, res: Response) => {
  const certType = s(req.query.cert_type);
  const certificationBodies = await MarketAccessService.searchCertificationBodies({
    certType,
    country: s(req.query.country),
    accreditation: s(req.query.accreditation),
    scope: s(req.query.scope),
    productCategory: s(req.query.product_category),
    q: s(req.query.q),
  });
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

/** Load an application the caller may act on (owner, or staff). */
async function loadApplication(req: AuthRequest, res: Response) {
  const filter: any = { _id: req.params.id };
  if (!STAFF_ROLES.includes(req.user!.role)) filter.created_by = req.user!._id;
  const application = await Application.findOne(filter);
  if (!application) {
    res.status(404).json({ success: false, message: 'Application not found.' });
    return null;
  }
  return application;
}

/**
 * PUT /certification-bodies/application/:id  (customer)
 * Records the customer's preferred CB. Never blocks — default stays Sanyog-managed.
 * body: { mode: 'sanyog_managed' | 'customer_selected', org_id?, name? }
 */
router.put('/application/:id', authenticate, wrap(async (req: AuthRequest, res: Response) => {
  const mode = s(req.body?.mode);
  if (mode !== 'sanyog_managed' && mode !== 'customer_selected') {
    return res.status(400).json({ success: false, message: 'mode must be sanyog_managed or customer_selected.' });
  }

  const application = await loadApplication(req, res);
  if (!application) return;

  const cb: any = { mode, source: 'customer', status: 'pending', selected_by: req.user!._id, selected_at: new Date() };

  if (mode === 'customer_selected') {
    const orgId = s(req.body?.org_id);
    const name = s(req.body?.name);
    if (orgId) {
      // Must be a real CB that is ELIGIBLE for this certification.
      const eligible = await MarketAccessService.isEligibleCB(orgId, application.cert_type);
      if (!eligible) {
        return res.status(400).json({ success: false, message: 'That Certification Body is not eligible for this certification.' });
      }
      cb.org_id = orgId;
    } else if (name) {
      cb.name = name; // off-platform CB the customer already works with
    } else {
      return res.status(400).json({ success: false, message: 'Select a Certification Body or enter its name.' });
    }
  }

  application.certification_body = cb;
  await application.save();
  return res.json({ success: true, data: application.certification_body });
}));

/**
 * PUT /certification-bodies/application/:id/review  (manager/staff)
 * action: 'accept' | 'override' | 'assign'
 *  - accept:   confirm the customer's choice.
 *  - override: replace it (org_id or name) — a reason is required.
 *  - assign:   staff pick a CB for a Sanyog-managed application.
 */
router.put(
  '/application/:id/review',
  authenticate,
  requireRole(...ADMIN_ROLES),
  wrap(async (req: AuthRequest, res: Response) => {
    const action = s(req.body?.action);
    if (!['accept', 'override', 'assign'].includes(action || '')) {
      return res.status(400).json({ success: false, message: 'action must be accept, override or assign.' });
    }

    const application = await Application.findById(req.params.id);
    if (!application) return res.status(404).json({ success: false, message: 'Application not found.' });

    const existing: any = application.certification_body || { mode: 'sanyog_managed' };
    const cb: any = { ...existing, reviewed_by: req.user!._id, reviewed_at: new Date() };

    if (action === 'accept') {
      cb.status = 'accepted';
    } else {
      // override / assign both set the CB on staff authority.
      const orgId = s(req.body?.org_id);
      const name = s(req.body?.name);
      const reason = s(req.body?.reason);
      if (action === 'override' && !reason) {
        return res.status(400).json({ success: false, message: 'A reason is required to override the customer’s Certification Body.' });
      }
      if (orgId) {
        const eligible = await MarketAccessService.isEligibleCB(orgId, application.cert_type);
        if (!eligible) {
          return res.status(400).json({ success: false, message: 'That Certification Body is not eligible for this certification.' });
        }
        cb.org_id = orgId;
        cb.name = undefined;
      } else if (name) {
        cb.name = name;
        cb.org_id = undefined;
      } else {
        return res.status(400).json({ success: false, message: 'Provide a Certification Body (org_id or name).' });
      }
      cb.mode = 'customer_selected';
      cb.source = 'staff';
      cb.status = action === 'override' ? 'overridden' : 'accepted';
      if (reason) cb.review_reason = reason;
    }

    application.certification_body = cb;
    await application.save();
    return res.json({ success: true, data: application.certification_body });
  }),
);

export default router;
