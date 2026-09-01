import { Ionicons } from '@expo/vector-icons';
import type { Application } from '../services/applicationsService';

/** Valid Ionicons glyph name — cards render these via <Ionicons name={…} />. */
type IoniconName = keyof typeof Ionicons.glyphMap;

/**
 * Single source of truth for how an application status is presented (label,
 * colour, progress%, icon, next-action) and which "bucket" screen it belongs
 * to. Keeps the Active/Pending/Completed/Rejected/Renewal screens consistent
 * instead of each inventing its own mapping.
 */
export interface StatusMeta {
  label: string;
  color: string;    // hex — cards render item.color directly
  progress: number; // 0-100
  icon: IoniconName; // Ionicons name
  action: string;   // the customer's next action for this status
}

const STATUS_META: Record<string, StatusMeta> = {
  draft:            { label: 'Draft',            color: '#94A3B8', progress: 5,   icon: 'create-outline',        action: 'Complete and submit your application' },
  submitted:        { label: 'Submitted',        color: '#3B82F6', progress: 15,  icon: 'paper-plane-outline',   action: 'Awaiting document review' },
  docs_review:      { label: 'Docs Review',      color: '#3B82F6', progress: 30,  icon: 'search-outline',        action: 'Documents are being reviewed' },
  docs_required:    { label: 'Docs Required',    color: '#F59E0B', progress: 25,  icon: 'cloud-upload-outline',  action: 'Upload the requested documents' },
  tech_review:      { label: 'Technical Review', color: '#6366F1', progress: 50,  icon: 'construct-outline',     action: 'Technical review in progress' },
  testing:          { label: 'Testing',          color: '#14B8A6', progress: 65,  icon: 'flask-outline',         action: 'Samples are under testing' },
  approval_pending: { label: 'Approval Pending', color: '#8B5CF6', progress: 80,  icon: 'hourglass-outline',     action: 'Awaiting final approval' },
  approved:         { label: 'Approved',         color: '#22C55E', progress: 95,  icon: 'checkmark-circle-outline', action: 'Approved — certificate being issued' },
  cert_issued:      { label: 'Certified',        color: '#22C55E', progress: 100, icon: 'ribbon-outline',        action: 'Certificate issued' },
  on_hold:          { label: 'On Hold',          color: '#F59E0B', progress: 40,  icon: 'pause-circle-outline',  action: 'On hold — see notes' },
  rejected:         { label: 'Rejected',         color: '#EF4444', progress: 100, icon: 'close-circle-outline',  action: 'Application rejected' },
  cancelled:        { label: 'Cancelled',        color: '#94A3B8', progress: 100, icon: 'ban-outline',           action: 'Application cancelled' },
};

export const statusMeta = (status: string): StatusMeta =>
  STATUS_META[status] ?? { label: status, color: '#94A3B8', progress: 0, icon: 'document-outline', action: 'View details' };

/** Status buckets that back each list screen. */
export const STATUS_BUCKETS = {
  active:    ['draft', 'submitted', 'docs_review', 'docs_required', 'tech_review', 'testing', 'approval_pending', 'on_hold', 'approved'],
  pending:   ['submitted', 'docs_review', 'docs_required', 'tech_review', 'testing', 'approval_pending', 'on_hold'],
  completed: ['approved', 'cert_issued'],
  rejected:  ['rejected', 'cancelled'],
  renewal:   ['cert_issued'], // issued certificates are the ones eligible for renewal
} as const;

export type StatusBucket = keyof typeof STATUS_BUCKETS;

/** Card display shape used by the application list screens. */
export interface ApplicationCard {
  id: string;
  name: string;
  type: string;
  appId: string;
  stage: string;
  color: string;
  progress: number;
  icon: IoniconName;
  action: string;
  dueDate: string;
  updated: string;
  reason?: string;
}

const fmtDate = (iso?: string): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

/** Most recent status_history reason (used by the Rejected screen). */
const latestReason = (a: Application): string | undefined => {
  const hist = a.status_history ?? [];
  for (let i = hist.length - 1; i >= 0; i--) {
    if (hist[i]?.reason) return hist[i].reason;
  }
  return undefined;
};

export const toApplicationCard = (a: Application): ApplicationCard => {
  const meta = statusMeta(a.status);
  return {
    id: a._id,
    name: a.product_id?.name ?? a.cert_type ?? 'Application',
    type: a.cert_type ?? '—',
    appId: a.application_number ?? a._id.slice(-6).toUpperCase(),
    stage: meta.label,
    color: meta.color,
    progress: meta.progress,
    icon: meta.icon,
    action: meta.action,
    dueDate: fmtDate(a.estimated_completion_at),
    updated: fmtDate(a.updated_at),
    reason: latestReason(a),
  };
};
