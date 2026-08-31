import { apiClient } from './apiClient'

// Thin typed wrappers over the Find-Your-CB backend. Response envelope is
// { success, data, pagination? }; helpers unwrap to the useful payload.
const data = (p: Promise<any>) => p.then((r) => r.data?.data)
const envelope = (p: Promise<any>) => p.then((r) => r.data) // keeps { data, pagination }

export const cbService = {
  // ── Certification bodies ──────────────────────────────────────
  listCBs: (params: Record<string, any>) => envelope(apiClient.get('/certification-bodies/admin', { params })),
  getCB: (id: string, params?: Record<string, any>) => data(apiClient.get(`/certification-bodies/${id}`, { params })),
  createCB: (body: any) => data(apiClient.post('/certification-bodies', body)),
  updateCB: (id: string, body: any) => data(apiClient.patch(`/certification-bodies/${id}`, body)),
  verifyCB: (id: string, body: any) => data(apiClient.post(`/certification-bodies/${id}/verify`, body)),
  publishCB: (id: string) => data(apiClient.post(`/certification-bodies/${id}/publish`)),
  suspendCB: (id: string, reason?: string) => data(apiClient.post(`/certification-bodies/${id}/suspend`, { reason })),
  cbAudit: (id: string) => data(apiClient.get(`/certification-bodies/${id}/audit`)),

  // ── Scopes ────────────────────────────────────────────────────
  listScopes: (id: string) => data(apiClient.get(`/certification-bodies/${id}/scopes`)),
  addScope: (id: string, body: any) => data(apiClient.post(`/certification-bodies/${id}/scopes`, body)),
  updateScope: (scopeId: string, body: any) => data(apiClient.patch(`/certification-bodies/scopes/${scopeId}`, body)),
  deleteScope: (scopeId: string) => apiClient.delete(`/certification-bodies/scopes/${scopeId}`),

  // ── Accreditations (shared catalog) ───────────────────────────
  listAccreditations: (params?: Record<string, any>) => data(apiClient.get('/accreditations', { params })),
  createAccreditation: (body: any) => data(apiClient.post('/accreditations', body)),
  updateAccreditation: (id: string, body: any) => data(apiClient.patch(`/accreditations/${id}`, body)),
  deleteAccreditation: (id: string) => apiClient.delete(`/accreditations/${id}`),

  // ── CB requests ───────────────────────────────────────────────
  listRequests: (params: Record<string, any>) => envelope(apiClient.get('/cb-requests', { params })),
  getRequest: (id: string) => data(apiClient.get(`/cb-requests/${id}`)),
  updateRequest: (id: string, body: any) => data(apiClient.patch(`/cb-requests/${id}`, body)),
  requestAudit: (id: string) => data(apiClient.get(`/cb-requests/${id}/audit`)),

  // ── Supporting catalog data (reused, not duplicated) ──────────
  listStaff: () => apiClient.get('/users').then((r) => (r.data?.data || []).filter((u: any) => ['admin', 'super_admin', 'consultant', 'employee'].includes(u.role))),
}

// Lifecycle vocabularies (must mirror the backend — never invent client-only states).
export const CB_VERIFICATION_STATUSES = ['draft', 'pending_review', 'verified', 'suspended', 'archived'] as const
export const CB_REQUEST_STATUSES = ['draft', 'submitted', 'sent_to_cb', 'acknowledged', 'quote_received', 'accepted', 'rejected', 'cancelled', 'closed'] as const
export const CB_SCOPE_STATUSES = ['draft', 'active', 'expired', 'suspended', 'archived'] as const

export const prettyStatus = (s?: string) => (s || '').replace(/_/g, ' ')
