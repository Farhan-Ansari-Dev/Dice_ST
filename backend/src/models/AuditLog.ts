import { Schema, model, Document as MongooseDoc, Types, Connection } from 'mongoose';
import mongoose from 'mongoose';

export type AuditAction =
  | 'created' | 'updated' | 'deleted' | 'viewed' | 'downloaded'
  | 'logged_in' | 'logged_out' | 'failed_login'
  | 'status_changed' | 'status_overridden' | 'assigned' | 'unassigned'
  | 'document_uploaded' | 'document_replaced' | 'document_archived'
  | 'payment_received' | 'cert_issued' | 'cert_revoked'
  | 'onboarding_completed' | 'testing_started' | 'inspection_scheduled' | 'renewal_created'
  | 'consent_given' | 'consent_revoked'
  | 'data_exported' | 'data_deletion_requested';

export interface IAuditLog extends MongooseDoc {
  ts: Date;
  meta: {
    actor: Types.ObjectId | null;        // null = system
    actor_type: 'user' | 'system' | 'cron';
    org_id?: Types.ObjectId;
    resource_type: string;               // "application", "document", "user", etc.
    resource_id?: Types.ObjectId;
    action: AuditAction;
    ip?: string;
    request_id?: string;
  };
  before?: any;                          // snapshot before change
  after?: any;                           // snapshot after change
  user_agent?: string;
  notes?: string;
}

/**
 * MongoDB Time-Series collection.
 *
 * Why: time-series collections compress timestamped data 4–10× better
 * than regular collections, optimise time-range queries, and support TTL.
 *
 * Requires MongoDB 5.0+. Atlas M10+ supports this.
 *
 * TTL: 5 years (Indian compliance + GDPR safe upper bound).
 * For a longer legal hold, set `meta.legal_hold=true` and exclude from TTL via filter.
 */
const AuditLogSchema = new Schema<IAuditLog>(
  {
    ts: { type: Date, required: true, default: Date.now },
    meta: {
      actor:         { type: Schema.Types.ObjectId, ref: 'User' },
      actor_type:    { type: String, enum: ['user', 'system', 'cron'], default: 'user' },
      org_id:        { type: Schema.Types.ObjectId, ref: 'Organization' },
      resource_type: { type: String, required: true },
      resource_id:   { type: Schema.Types.ObjectId },
      action:        { type: String, required: true },
      ip:            String,
      request_id:    String,
    },
    before: Schema.Types.Mixed,
    after:  Schema.Types.Mixed,
    user_agent: String,
    notes: String,
  },
  {
    timestamps: false,
    // Time-series options
    timeseries: {
      timeField:   'ts',
      metaField:   'meta',
      granularity: 'minutes',
    },
    expireAfterSeconds: 5 * 365 * 24 * 3600,  // 5 years
  } as any
);

// Indexes on metadata fields (time field is auto-indexed)
AuditLogSchema.index({ 'meta.actor': 1, ts: -1 });
AuditLogSchema.index({ 'meta.org_id': 1, ts: -1 });
AuditLogSchema.index({ 'meta.resource_type': 1, 'meta.resource_id': 1, ts: -1 });
AuditLogSchema.index({ 'meta.action': 1, ts: -1 });

// IMMUTABILITY: time-series collections in MongoDB don't allow updates by default,
// but we add an extra guard at the Mongoose layer.
(AuditLogSchema as any).pre("save", function (this: any, next: any) {
  if (!this.isNew) return next(new Error('AuditLog is immutable'));
  });

export const AuditLog = model<IAuditLog>('AuditLog', AuditLogSchema);

/**
 * Helper to record audit events. Always async, never blocking.
 *
 *   await audit({
 *     actor: req.user._id,
 *     org_id: req.user.org_id,
 *     resource_type: 'application',
 *     resource_id: app._id,
 *     action: 'status_changed',
 *     before: { status: 'docs_review' },
 *     after:  { status: 'tech_review' },
 *     ip: req.ip,
 *     request_id: req.id,
 *   });
 */
export async function audit(input: {
  actor?: Types.ObjectId | null;
  actor_type?: 'user' | 'system' | 'cron';
  org_id?: Types.ObjectId;
  resource_type: string;
  resource_id?: Types.ObjectId;
  action: AuditAction;
  before?: any;
  after?: any;
  ip?: string;
  user_agent?: string;
  request_id?: string;
  notes?: string;
}) {
  try {
    await AuditLog.create({
      ts: new Date(),
      meta: {
        actor:         input.actor ?? null,
        actor_type:    input.actor_type ?? (input.actor ? 'user' : 'system'),
        org_id:        input.org_id,
        resource_type: input.resource_type,
        resource_id:   input.resource_id,
        action:        input.action,
        ip:            input.ip,
        request_id:    input.request_id,
      },
      before: input.before,
      after:  input.after,
      user_agent: input.user_agent,
      notes:      input.notes,
    });
  } catch (err) {
    // NEVER throw — audit failures shouldn't block business logic.
    // Log to monitoring (Sentry) instead.
    // eslint-disable-next-line no-console
    console.error('[audit] write failed', err);
  }
}
