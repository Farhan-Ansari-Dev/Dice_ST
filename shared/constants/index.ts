/**
 * Shared constants used across backend, mobile-app, and admin-dashboard.
 */

// ── Application Status Labels ────────────────────────────────────────────────

export const APPLICATION_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  docs_review: 'Document Review',
  docs_required: 'Documents Required',
  tech_review: 'Technical Review',
  testing: 'Testing',
  approval_pending: 'Approval Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  on_hold: 'On Hold',
  cert_issued: 'Certificate Issued',
  cancelled: 'Cancelled',
};

export const APPLICATION_STATUS_COLORS: Record<string, string> = {
  draft: '#8B92A5',
  submitted: '#6C63FF',
  docs_review: '#00D4FF',
  docs_required: '#FFB347',
  tech_review: '#9B59B6',
  testing: '#00D4FF',
  approval_pending: '#FFB347',
  approved: '#00C896',
  rejected: '#FF6B6B',
  on_hold: '#8B92A5',
  cert_issued: '#00C896',
  cancelled: '#FF6B6B',
};

// ── Certification Types ──────────────────────────────────────────────────────

export const CERT_TYPE_LABELS: Record<string, string> = {
  BIS_CRS: 'BIS CRS',
  BIS_ISI: 'BIS ISI',
  BIS_HALLMARK: 'BIS Hallmark',
  FSSAI: 'FSSAI License',
  CE: 'CE Marking',
  ISO_9001: 'ISO 9001',
  ISO_14001: 'ISO 14001',
  ISO_45001: 'ISO 45001',
  WPC: 'WPC Approval',
  TEC_ETA: 'TEC ETA',
  EPR: 'EPR Registration',
  NABL: 'NABL Accreditation',
};

// ── Pagination ───────────────────────────────────────────────────────────────

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// ── Query Cache ──────────────────────────────────────────────────────────────

export const QUERY_STALE_TIME = 5 * 60 * 1000;   // 5 minutes
export const QUERY_CACHE_TIME = 30 * 60 * 1000;  // 30 minutes
