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
import { Types } from 'mongoose';
import { authenticate, AuthRequest, requireRole, ADMIN_ROLES } from '../../middleware/authMongo';
import { Application } from '../../models/Application';
import { Organization } from '../../models/Organization';
import { CertificationBodyScope } from '../../models/CertificationBodyScope';
import { audit, AuditLog } from '../../models/AuditLog';
import { MarketAccessService } from '../../services/marketAccessService';
import { matchCertificationBodies, normalizeMarkets, CBRequirement } from '../../services/cbMatchingService';

const router = Router();
const wrap = (fn: any) => (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
const STAFF_ROLES = ['admin', 'super_admin', 'employee'];
const isStaff = (req: AuthRequest) => STAFF_ROLES.includes(req.user!.role);
const isObjId = (v?: string) => !!v && Types.ObjectId.isValid(v);

/** Build a matching requirement from an Application the caller may see. */
async function requirementFromApplication(req: AuthRequest, appId: string): Promise<CBRequirement | null> {
  const filter: any = { _id: appId };
  if (!isStaff(req)) filter.created_by = req.user!._id;   // ownership
  const app: any = await Application.findOne(filter).populate('product_id', 'category sub_category').lean();
  if (!app) return null;
  // Use the application's COMPLETE requested-market set (never truncate to [0]).
  return {
    cert_type: app.cert_type,
    product_category: app.product_id?.category,
    markets: app.manual_review?.requested_markets || [],
    require_accreditation: false,
  };
}

/** Public projection of a CB scope — never leaks internal evidence (document_ids). */
function publicScope(sc: any) {
  return {
    id: String(sc._id),
    cert_type: sc.cert_type,
    product_categories: sc.product_categories || [],
    industries: sc.industries || [],
    markets: sc.markets || [],
    service_type: sc.service_type,
    accreditation_id: sc.accreditation_id ? String(sc.accreditation_id) : undefined,
    scope_description: sc.scope_description,
    status: sc.status,
    valid_from: sc.valid_from,
    valid_until: sc.valid_until,
    verified_at: sc.verified_at,
  };
}

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

// ═══════════════════════════════════════════════════════════════
// Find Your CB — matching (customer)
// ═══════════════════════════════════════════════════════════════

/**
 * GET /certification-bodies/match
 * Query: cert_type, product_category, market, industry (csv), service_type,
 *        require_accreditation=true, application_id, limit.
 * When application_id is given, the requirement is derived from that application
 * (ownership-checked); explicit query params override the derived values.
 * Matching is server-side and deterministic — the client renders score/reasons.
 */
router.get('/match', authenticate, wrap(async (req: AuthRequest, res: Response) => {
  let requirement: CBRequirement | null = null;

  const appId = s(req.query.application_id);
  if (appId) {
    if (!isObjId(appId)) return res.status(400).json({ success: false, message: 'Invalid application_id.' });
    requirement = await requirementFromApplication(req, appId);
    if (!requirement) return res.status(404).json({ success: false, message: 'Application not found.' });
  } else {
    requirement = { cert_type: s(req.query.cert_type) || '' };
  }

  // Explicit params override derived context.
  const certType = s(req.query.cert_type) ?? requirement.cert_type;
  if (!certType) return res.status(400).json({ success: false, message: 'cert_type (or application_id) is required.' });
  // Markets: `markets` (csv) is authoritative; a legacy `market` is accepted too.
  // Explicit query params override any application-derived context.
  const explicitMarkets = normalizeMarkets(s(req.query.markets) ?? s(req.query.market));
  requirement = {
    cert_type: certType,
    product_category: s(req.query.product_category) ?? requirement.product_category,
    markets: explicitMarkets.length ? explicitMarkets : normalizeMarkets(requirement.markets),
    industries: s(req.query.industry) ? String(req.query.industry).split(',').map((x) => x.trim()).filter(Boolean) : requirement.industries,
    service_type: s(req.query.service_type) ?? requirement.service_type,
    require_accreditation: s(req.query.require_accreditation) === 'true' || requirement.require_accreditation,
  };

  const limit = Math.min(Math.max(parseInt(s(req.query.limit) || '50', 10) || 50, 1), 100);
  const matches = await matchCertificationBodies(requirement, { limit });

  return res.json({
    success: true,
    data: {
      requirement,
      count: matches.length,
      available: matches.length > 0,
      certificationBodies: matches,
      message: matches.length === 0
        ? 'No certification bodies currently match all of your requirements. Try a different market or certification, or contact Sanyog.'
        : undefined,
    },
  });
}));

// ═══════════════════════════════════════════════════════════════
// Admin — CB directory management (staff only)
// ═══════════════════════════════════════════════════════════════

/** GET /certification-bodies/admin — paginated CB list with filters. */
router.get('/admin', authenticate, requireRole(...ADMIN_ROLES), wrap(async (req: AuthRequest, res: Response) => {
  const page = Math.max(parseInt(s(req.query.page) || '1', 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(s(req.query.limit) || '20', 10) || 20, 1), 100);
  const filter: any = { type: 'cb' };
  const vstatus = s(req.query.verification_status);
  if (vstatus) filter['cb_verification.status'] = vstatus;
  const country = s(req.query.country);
  if (country) filter['address.country_code'] = country.toUpperCase();
  const certType = s(req.query.cert_type);
  if (certType) filter['settings.allowed_cert_types'] = certType;
  const q = s(req.query.q);
  if (q) filter.$or = [{ name: new RegExp(q, 'i') }, { legal_name: new RegExp(q, 'i') }];

  const [items, total] = await Promise.all([
    Organization.find(filter).sort({ updated_at: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Organization.countDocuments(filter),
  ]);
  return res.json({ success: true, data: items, pagination: { page, limit, total, total_pages: Math.ceil(total / limit) } });
}));

/** POST /certification-bodies — create a CB (Organization type='cb', draft). */
router.post('/', authenticate, requireRole(...ADMIN_ROLES), wrap(async (req: AuthRequest, res: Response) => {
  const name = s(req.body?.name);
  if (!name) return res.status(400).json({ success: false, message: 'name is required.' });
  const cb = await Organization.create({
    name,
    legal_name: s(req.body?.legal_name),
    type: 'cb',
    owner_user_id: req.user!._id,   // catalog owner = creating admin
    address: { country_code: (s(req.body?.country_code) || 'IN').toUpperCase(), city: s(req.body?.city) },
    contact: { email: s(req.body?.email), phone: s(req.body?.phone), website: s(req.body?.website) },
    branding: { logo_url: s(req.body?.logo_url) },
    settings: { allowed_cert_types: Array.isArray(req.body?.allowed_cert_types) ? req.body.allowed_cert_types : [] },
    cb_profile: {
      accreditations: Array.isArray(req.body?.accreditations) ? req.body.accreditations : [],
      scope: s(req.body?.scope),
      countries: Array.isArray(req.body?.countries) ? req.body.countries.map((c: string) => String(c).toUpperCase()) : [],
      product_categories: Array.isArray(req.body?.product_categories) ? req.body.product_categories : [],
    },
    cb_verification: { status: 'draft', checks: {} },
  });
  await audit({ actor: req.user!._id as any, org_id: req.user!.org_id as any, resource_type: 'organization', resource_id: cb._id as any, action: 'created', notes: `certification body created: ${name}` });
  return res.status(201).json({ success: true, data: cb });
}));

/** GET /certification-bodies/:id/audit — immutable audit trail for a CB (staff). */
router.get('/:id/audit', authenticate, requireRole(...ADMIN_ROLES), wrap(async (req: AuthRequest, res: Response) => {
  if (!isObjId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid id.' });
  const logs = await AuditLog.find({ 'meta.resource_type': 'organization', 'meta.resource_id': req.params.id } as any)
    .sort({ ts: -1 }).limit(200).populate('meta.actor', 'name email').lean();
  const data = logs.map((l: any) => ({ _id: l._id, ts: l.ts, action: l.meta?.action, actor: l.meta?.actor || null, notes: l.meta?.notes }));
  return res.json({ success: true, data });
}));

/** GET /certification-bodies/:id/scopes — public active scopes for a CB. */
router.get('/:id/scopes', authenticate, wrap(async (req: AuthRequest, res: Response) => {
  if (!isObjId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid id.' });
  const filter: any = { certification_body_id: req.params.id };
  if (!isStaff(req)) filter.status = 'active';   // customers only see live scopes
  const scopes = await CertificationBodyScope.find(filter).sort({ cert_type: 1 }).lean();
  return res.json({ success: true, data: scopes.map(publicScope) });
}));

/** POST /certification-bodies/:id/scopes — add a structured scope (staff). */
router.post('/:id/scopes', authenticate, requireRole(...ADMIN_ROLES), wrap(async (req: AuthRequest, res: Response) => {
  if (!isObjId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid id.' });
  const cb = await Organization.findOne({ _id: req.params.id, type: 'cb' });
  if (!cb) return res.status(404).json({ success: false, message: 'Certification body not found.' });
  const certType = s(req.body?.cert_type);
  if (!certType) return res.status(400).json({ success: false, message: 'cert_type is required.' });
  const scope = await CertificationBodyScope.create({
    certification_body_id: cb._id,
    cert_type: certType,
    standard_id: isObjId(s(req.body?.standard_id)) ? req.body.standard_id : undefined,
    product_categories: Array.isArray(req.body?.product_categories) ? req.body.product_categories : [],
    industries: Array.isArray(req.body?.industries) ? req.body.industries : [],
    markets: Array.isArray(req.body?.markets) ? req.body.markets : [],
    service_type: s(req.body?.service_type),
    accreditation_id: isObjId(s(req.body?.accreditation_id)) ? req.body.accreditation_id : undefined,
    scope_description: s(req.body?.scope_description),
    document_ids: Array.isArray(req.body?.document_ids) ? req.body.document_ids.filter(isObjId) : [],
    status: (s(req.body?.status) || 'draft') as any,
    valid_from: req.body?.valid_from ? new Date(req.body.valid_from) : undefined,
    valid_until: req.body?.valid_until ? new Date(req.body.valid_until) : undefined,
    created_by: req.user!._id,
  });
  await audit({ actor: req.user!._id as any, org_id: req.user!.org_id as any, resource_type: 'organization', resource_id: cb._id as any, action: 'updated', notes: `CB scope added: ${certType}` });
  return res.status(201).json({ success: true, data: scope });
}));

/** PATCH /certification-bodies/scopes/:scopeId — update a scope (staff). */
router.patch('/scopes/:scopeId', authenticate, requireRole(...ADMIN_ROLES), wrap(async (req: AuthRequest, res: Response) => {
  if (!isObjId(req.params.scopeId)) return res.status(400).json({ success: false, message: 'Invalid id.' });
  const scope = await CertificationBodyScope.findById(req.params.scopeId);
  if (!scope) return res.status(404).json({ success: false, message: 'Scope not found.' });
  const b = req.body || {};
  const fields = ['cert_type', 'product_categories', 'industries', 'markets', 'service_type', 'scope_description', 'status'] as const;
  for (const f of fields) if (b[f] !== undefined) (scope as any)[f] = b[f];
  if (b.standard_id !== undefined) (scope as any).standard_id = isObjId(b.standard_id) ? b.standard_id : undefined;
  if (b.accreditation_id !== undefined) (scope as any).accreditation_id = isObjId(b.accreditation_id) ? b.accreditation_id : undefined;
  if (b.valid_from !== undefined) (scope as any).valid_from = b.valid_from ? new Date(b.valid_from) : undefined;
  if (b.valid_until !== undefined) (scope as any).valid_until = b.valid_until ? new Date(b.valid_until) : undefined;
  (scope as any).updated_by = req.user!._id;
  await scope.save();
  await audit({ actor: req.user!._id as any, org_id: req.user!.org_id as any, resource_type: 'organization', resource_id: scope.certification_body_id as any, action: 'updated', notes: `CB scope updated: ${scope.cert_type}` });
  return res.json({ success: true, data: scope });
}));

/** DELETE /certification-bodies/scopes/:scopeId — soft-delete a scope (staff). */
router.delete('/scopes/:scopeId', authenticate, requireRole(...ADMIN_ROLES), wrap(async (req: AuthRequest, res: Response) => {
  if (!isObjId(req.params.scopeId)) return res.status(400).json({ success: false, message: 'Invalid id.' });
  const scope = await CertificationBodyScope.findByIdAndUpdate(req.params.scopeId, { deleted_at: new Date(), updated_by: req.user!._id });
  if (!scope) return res.status(404).json({ success: false, message: 'Scope not found.' });
  await audit({ actor: req.user!._id as any, org_id: req.user!.org_id as any, resource_type: 'organization', resource_id: scope.certification_body_id as any, action: 'deleted', notes: `CB scope removed: ${scope.cert_type}` });
  return res.json({ success: true });
}));

/** POST /certification-bodies/:id/verify — record verification checks (staff). */
router.post('/:id/verify', authenticate, requireRole(...ADMIN_ROLES), wrap(async (req: AuthRequest, res: Response) => {
  if (!isObjId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid id.' });
  const cb = await Organization.findOne({ _id: req.params.id, type: 'cb' });
  if (!cb) return res.status(404).json({ success: false, message: 'Certification body not found.' });
  const checks = {
    organization:  !!req.body?.checks?.organization,
    accreditation: !!req.body?.checks?.accreditation,
    scope:         !!req.body?.checks?.scope,
    contact:       !!req.body?.checks?.contact,
  };
  const allPassed = checks.organization && checks.accreditation && checks.scope && checks.contact;
  cb.cb_verification = {
    status: allPassed ? 'verified' : 'pending_review',
    checks,
    notes: s(req.body?.notes),
    verified_by: req.user!._id as any,
    verified_at: new Date(),
    reverify_at: req.body?.reverify_at ? new Date(req.body.reverify_at) : undefined,
  } as any;
  await cb.save();
  await audit({ actor: req.user!._id as any, org_id: req.user!.org_id as any, resource_type: 'organization', resource_id: cb._id as any, action: 'status_changed', notes: `CB verification: ${cb.cb_verification!.status}` });
  return res.json({ success: true, data: cb.cb_verification });
}));

/** POST /certification-bodies/:id/publish — require all checks, set verified (staff). */
router.post('/:id/publish', authenticate, requireRole(...ADMIN_ROLES), wrap(async (req: AuthRequest, res: Response) => {
  if (!isObjId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid id.' });
  const cb = await Organization.findOne({ _id: req.params.id, type: 'cb' });
  if (!cb) return res.status(404).json({ success: false, message: 'Certification body not found.' });
  const c = cb.cb_verification?.checks;
  if (!c || !(c.organization && c.accreditation && c.scope && c.contact)) {
    return res.status(422).json({ success: false, message: 'All verification checks must pass before publishing.' });
  }
  cb.cb_verification!.status = 'verified';
  cb.cb_verification!.verified_by = req.user!._id as any;
  cb.cb_verification!.verified_at = new Date();
  await cb.save();
  await audit({ actor: req.user!._id as any, org_id: req.user!.org_id as any, resource_type: 'organization', resource_id: cb._id as any, action: 'status_changed', notes: 'CB published (verified)' });
  return res.json({ success: true, data: cb.cb_verification });
}));

/** POST /certification-bodies/:id/suspend — remove from public results (staff). */
router.post('/:id/suspend', authenticate, requireRole(...ADMIN_ROLES), wrap(async (req: AuthRequest, res: Response) => {
  if (!isObjId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid id.' });
  const cb = await Organization.findOne({ _id: req.params.id, type: 'cb' });
  if (!cb) return res.status(404).json({ success: false, message: 'Certification body not found.' });
  cb.cb_verification = { ...(cb.cb_verification as any), status: 'suspended', notes: s(req.body?.reason) } as any;
  await cb.save();
  await audit({ actor: req.user!._id as any, org_id: req.user!.org_id as any, resource_type: 'organization', resource_id: cb._id as any, action: 'updated', notes: `CB suspended${req.body?.reason ? ': ' + s(req.body.reason) : ''}` });
  return res.json({ success: true, data: cb.cb_verification });
}));

/** PATCH /certification-bodies/:id — update CB profile fields (staff). */
router.patch('/:id', authenticate, requireRole(...ADMIN_ROLES), wrap(async (req: AuthRequest, res: Response) => {
  if (!isObjId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid id.' });
  const cb = await Organization.findOne({ _id: req.params.id, type: 'cb' });
  if (!cb) return res.status(404).json({ success: false, message: 'Certification body not found.' });
  const b = req.body || {};
  if (b.name !== undefined) cb.name = s(b.name) || cb.name;
  if (b.legal_name !== undefined) cb.legal_name = s(b.legal_name);
  if (b.email !== undefined || b.phone !== undefined || b.website !== undefined) {
    cb.contact = { ...(cb.contact as any), email: s(b.email) ?? cb.contact?.email, phone: s(b.phone) ?? cb.contact?.phone, website: s(b.website) ?? cb.contact?.website };
  }
  if (b.logo_url !== undefined) cb.branding = { ...(cb.branding as any), logo_url: s(b.logo_url) };
  if (b.city !== undefined || b.country_code !== undefined) {
    cb.address = { ...(cb.address as any), city: s(b.city) ?? cb.address?.city, country_code: (s(b.country_code) || cb.address?.country_code || 'IN').toUpperCase() };
  }
  if (Array.isArray(b.allowed_cert_types)) cb.settings = { ...(cb.settings as any), allowed_cert_types: b.allowed_cert_types };
  if (b.cb_profile) {
    cb.cb_profile = {
      accreditations: Array.isArray(b.cb_profile.accreditations) ? b.cb_profile.accreditations : (cb.cb_profile?.accreditations || []),
      scope: s(b.cb_profile.scope) ?? cb.cb_profile?.scope,
      countries: Array.isArray(b.cb_profile.countries) ? b.cb_profile.countries.map((c: string) => String(c).toUpperCase()) : (cb.cb_profile?.countries || []),
      product_categories: Array.isArray(b.cb_profile.product_categories) ? b.cb_profile.product_categories : (cb.cb_profile?.product_categories || []),
    };
  }
  await cb.save();
  await audit({ actor: req.user!._id as any, org_id: req.user!.org_id as any, resource_type: 'organization', resource_id: cb._id as any, action: 'updated', notes: 'CB profile updated' });
  return res.json({ success: true, data: cb });
}));

/**
 * GET /certification-bodies/:id — public CB profile. Never exposes internal
 * verification notes or scope evidence documents. Optionally scores against a
 * cert_type/market passed in the query.
 */
router.get('/:id', authenticate, wrap(async (req: AuthRequest, res: Response) => {
  if (!isObjId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid id.' });
  const cb: any = await Organization.findOne({ _id: req.params.id, type: 'cb' }).lean();
  if (!cb) return res.status(404).json({ success: false, message: 'Certification body not found.' });

  const scopeFilter: any = { certification_body_id: cb._id };
  if (!isStaff(req)) scopeFilter.status = 'active';
  const scopes = await CertificationBodyScope.find(scopeFilter).lean();

  const verified = cb.cb_verification?.status === 'verified';
  const profile: any = {
    id: String(cb._id),
    name: cb.name,
    legal_name: cb.legal_name,
    logo_url: cb.branding?.logo_url,
    website: cb.contact?.website,
    email: cb.contact?.email,
    phone: cb.contact?.phone,
    location: { city: cb.address?.city, country_code: cb.address?.country_code },
    allowed_cert_types: cb.settings?.allowed_cert_types || [],
    accreditations: cb.cb_profile?.accreditations || [],
    countries: cb.cb_profile?.countries || [],
    product_categories: cb.cb_profile?.product_categories || [],
    scope_summary: cb.cb_profile?.scope,
    scopes: scopes.map(publicScope),
    // Public verification view: status + which checks passed + date. Notes are staff-only.
    verification: {
      verified,
      status: cb.cb_verification?.status,
      checks: cb.cb_verification?.checks,
      verified_at: cb.cb_verification?.verified_at,
    },
  };
  if (isStaff(req)) profile.verification.notes = cb.cb_verification?.notes;

  // Optional match scoring for "entered from matching" context.
  const certType = s(req.query.cert_type);
  if (certType) {
    const [m] = await matchCertificationBodies(
      { cert_type: certType, product_category: s(req.query.product_category), markets: normalizeMarkets(s(req.query.markets) ?? s(req.query.market)) },
      { limit: 500 },
    ).then((all) => all.filter((x) => x.id === String(cb._id)));
    if (m) { profile.match_score = m.match_score; profile.match_reasons = m.match_reasons; profile.market_coverage = m.market_coverage; }
  }

  return res.json({ success: true, data: profile });
}));

export default router;
