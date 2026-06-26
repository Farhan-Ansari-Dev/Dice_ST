export const CERT_TYPES = ['BIS', 'FSSAI', 'CE', 'ISO 9001', 'ISO 14001', 'REACH', 'RoHS', 'NABL', 'CDSCO', 'EPR']

export const APP_STATUSES = ['submitted', 'under_review', 'lab_testing', 'approved', 'rejected', 'on_hold'] as const
export type AppStatus = typeof APP_STATUSES[number]

export const STATUS_COLORS: Record<string, string> = {
  active: '#00C896',
  approved: '#00C896',
  submitted: '#00D4FF',
  under_review: '#FFB347',
  lab_testing: '#9B59B6',
  rejected: '#FF6B6B',
  on_hold: '#8B92A5',
  expired: '#FF6B6B',
  pending: '#FFB347',
  paid: '#00C896',
  failed: '#FF6B6B',
}

export const STATUS_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  lab_testing: 'Lab Testing',
  approved: 'Approved',
  rejected: 'Rejected',
  on_hold: 'On Hold',
  active: 'Active',
  expired: 'Expired',
  pending: 'Pending',
  paid: 'Paid',
  failed: 'Failed',
}

export const INSIGHT_CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'bis_update', label: 'BIS Updates' },
  { key: 'customs', label: 'Customs' },
  { key: 'export_import', label: 'Export/Import' },
  { key: 'certification', label: 'Certification' },
  { key: 'government', label: 'Government' },
]
