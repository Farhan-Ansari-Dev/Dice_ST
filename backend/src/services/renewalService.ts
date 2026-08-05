/**
 * RenewalService — turns an expiring Certification into a fresh Draft
 * Application that reuses the entire workflow pipeline. When that renewal
 * application reaches `cert_issued`, issueCertification() links the new cert to
 * this predecessor and marks the old one `renewed` (see transitionService).
 *
 * Reuses createDraftApplication so there is exactly one application-creation
 * path. Idempotent: a certificate that already has an open (or issued) renewal
 * is never renewed twice.
 */
import { Types } from 'mongoose';
import { Application, Certification, User, audit, type ICertification } from '../models';
import { createDraftApplication } from './applicationService';
import { notify } from './notifications';
import { logger } from '../utils/logger';

export class RenewalNotEligibleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RenewalNotEligibleError';
  }
}

/** True when a renewal application already exists for this cert (idempotency). */
export async function hasOpenRenewal(certId: Types.ObjectId | string): Promise<boolean> {
  const existing = await Application.findOne({ renewal_of_cert_id: certId }).select('_id').lean();
  return Boolean(existing);
}

/**
 * Create a renewal Draft Application for `cert`. Returns the new application.
 * Throws {@link RenewalNotEligibleError} when the cert cannot be renewed
 * (missing source application/owner, or a renewal already exists).
 */
export async function createRenewal(cmd: { cert: ICertification; actor?: Types.ObjectId }) {
  const cert = cmd.cert;

  if (cert.successor_cert_id) throw new RenewalNotEligibleError('certificate already renewed');
  if (await hasOpenRenewal(cert._id as any)) throw new RenewalNotEligibleError('a renewal application already exists');

  // The owner is the creator of the certificate's source application.
  const sourceApp = await Application.findById(cert.application_id).setOptions({ includeDeleted: true } as any);
  if (!sourceApp) throw new RenewalNotEligibleError('source application not found');
  const owner = await User.findById(sourceApp.created_by);
  if (!owner) throw new RenewalNotEligibleError('certificate owner not found');

  const app = await createDraftApplication({
    user: owner,
    product_id: cert.product_id as any,
    cert_type: cert.cert_type,
    priority: 'high',
  });

  app.renewal_of_cert_id = cert._id as any;
  await app.save();

  await audit({
    actor: (cmd.actor ?? owner._id) as any,
    actor_type: cmd.actor ? 'user' : 'system',
    org_id: sourceApp.org_id as any,
    resource_type: 'application',
    resource_id: app._id as any,
    action: 'renewal_created',
    after: { renewal_of_cert_id: String(cert._id), cert_number: cert.cert_number },
  });

  await notify({
    user_id: String(owner._id),
    type: 'app_docs_required',
    title: `🔁 Renewal started: ${cert.cert_type}`,
    body: `We've started a renewal for certificate ${cert.cert_number}. Complete the required steps to keep it active.`,
    data: { application_id: app._id, deep_link: `dice://applications/${app._id}` },
    resource_type: 'application',
    resource_id: app._id as any,
  });

  return app;
}

/**
 * Auto-generate renewals for certificates entering their renewal window.
 * Called by the daily job ONLY when `renewal_auto_generation` is enabled.
 * Idempotent + best-effort per certificate.
 */
export async function runRenewalAutoGeneration(now = new Date()): Promise<{ created: number; skipped: number }> {
  const due = await Certification.find({
    status: { $in: ['active', 'expiring_soon'] },
    renewal_due_at: { $lte: now },
    successor_cert_id: { $exists: false },
  });

  let created = 0;
  let skipped = 0;
  for (const cert of due) {
    try {
      if (await hasOpenRenewal(cert._id as any)) { skipped++; continue; }
      await createRenewal({ cert });
      created++;
    } catch (err) {
      skipped++;
      logger.warn('[renewal] auto-generation skipped a cert', { cert: String(cert._id), err: (err as Error)?.message });
    }
  }
  return { created, skipped };
}
