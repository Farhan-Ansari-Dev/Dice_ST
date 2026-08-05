/**
 * Application creation — the single place a Draft Application is minted.
 *
 * Both the direct "New Application" route (POST /applications) and the enquiry
 * intake (POST /leads, which auto-creates a linked Draft Application) go through
 * here, so the Lead → Application pipeline has exactly one creation path and can
 * never drift into parallel implementations.
 */
import { Types } from 'mongoose';
import { Application, Product, Workflow, audit } from '../models';
import type { IUser } from '../models';
import { resolveCustomerIdForCreate } from './ownership/dualWrite';

/** Thrown when the referenced catalog product does not exist. */
export class ProductNotFoundError extends Error {
  readonly code = 'product_not_found';
  constructor() {
    super('product_not_found');
    this.name = 'ProductNotFoundError';
  }
}

export interface CreateDraftApplicationInput {
  user: IUser;
  /** Optional: when it doesn't resolve to a catalog product, the draft is still
   *  created with product_status 'pending_validation' (unless `strict`). */
  product_id?: string | Types.ObjectId;
  cert_type: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  notes?: string;
  ip?: string;
  /** Direct "New Application" (catalog pick) requires a real product — set true
   *  to 404 on an unresolved product instead of creating a pending draft. */
  strict?: boolean;
  /** Extra tags to stamp on the application (e.g. ['manual_review']). Additive. */
  tags?: string[];
  /** Structured manual-review metadata (no verified certification mapping). */
  manualReview?: {
    reason?: string;
    original_product?: string;
    requested_markets?: string[];
    confidence_score?: number;
    ai_summary?: string;
  };
}

/**
 * Create a Draft Application for `user` against an existing catalog product.
 * Mirrors the historic inline logic of POST /applications exactly:
 * workflow-derived fee/duration defaults, platform-wide application number,
 * status `draft`, and an immutable audit entry.
 */
export async function createDraftApplication(input: CreateDraftApplicationInput) {
  // Resolve the product when supplied. An enquiry intake may not have a catalog
  // match — the draft is still created (one lifecycle for every customer); a
  // manager validates the product later. Only the strict (catalog-pick) path
  // treats an unresolved product as an error.
  const product = input.product_id ? await Product.findById(input.product_id) : null;
  if (!product && input.strict) throw new ProductNotFoundError();
  const product_status: 'validated' | 'pending_validation' = product ? 'validated' : 'pending_validation';

  // Workflow is optional — it supplies fee/duration defaults only (transitions
  // use ALLOWED_TRANSITIONS). Falls back to defaults when none is seeded.
  const workflow = (await Workflow.findOne({ cert_type: input.cert_type, active: true }).sort({ version: -1 })) as any;

  // Application number sequence (platform-wide in single-tenant).
  const count = await Application.countDocuments({});
  const appNumber = `APP-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  const durationDays = workflow?.estimated_duration_days ?? 45;

  // Dual-write (Sprint 3): resolve the new customer ownership axis alongside the
  // legacy created_by. Best-effort — resolveCustomerIdForCreate never throws and
  // returns undefined on failure, so creation proceeds on legacy ownership.
  const customerId = await resolveCustomerIdForCreate(input.user);

  const app = await Application.create({
    application_number: appNumber,
    org_id: input.user.org_id,
    customer_id: customerId,          // new axis (dual-write); created_by stays authoritative
    product_id: product?._id,
    product_status,
    workflow_id: workflow?._id,
    cert_type: input.cert_type,
    status: 'draft',
    current_stage: 'draft',
    created_by: input.user._id,
    assignees: [],
    documents: [],
    fee: { base_inr: workflow?.fee_structure?.application_fee_inr ?? 0, expedited: false, paid: false },
    priority: input.priority ?? 'medium',
    tags: input.tags ?? [],
    manual_review: input.manualReview,
    estimated_completion_at: new Date(Date.now() + durationDays * 24 * 3600 * 1000),
  });

  await audit({
    actor: input.user._id as any,
    org_id: input.user.org_id,
    resource_type: 'application',
    resource_id: app._id as any,
    action: 'created',
    after: { cert_type: input.cert_type, product_id: product ? String(product._id) : null, product_status, application_number: appNumber },
    ip: input.ip,
  });

  return app;
}
