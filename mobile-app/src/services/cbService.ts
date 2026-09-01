/**
 * Find Your CB — customer client for the matching + request APIs.
 *
 * This is NOT a duplicate of partnersService (partner onboarding) or the legacy
 * ChoosePartner selection flow (Application.certification_body). It wraps the new
 * backend endpoints: server-side matching (/certification-bodies/match), public CB
 * profiles, and the CB-request lifecycle (/cb-requests). Matching/scoring happen
 * only on the backend — never here.
 */
import { api } from './api'

export interface CBMatchReason { key: string; label: string; satisfied: boolean }

export interface MarketCoverage {
  requested: string[]
  covered: string[]
  missing: string[]
  percent: number
}

export interface CBMatch {
  id: string
  name: string
  legal_name?: string
  logo_url?: string
  website?: string
  location?: { city?: string; country_code?: string }
  verified: boolean
  verified_at?: string
  match_score: number
  match_reasons: CBMatchReason[]
  cert_types: string[]
  markets: string[]
  product_categories: string[]
  service_types: string[]
  accreditations: string[]
  scope_backed: boolean
  market_coverage?: MarketCoverage   // present when markets were requested (backend-computed)
}

export interface CBRequirement {
  cert_type: string
  product_category?: string
  market?: string                    // deprecated single market
  markets?: string[]                 // ISO alpha-2 destination markets (authoritative)
  industries?: string[]
  service_type?: string
  require_accreditation?: boolean
}

export interface CBMatchResponse {
  requirement: CBRequirement
  count: number
  available: boolean
  certificationBodies: CBMatch[]
  message?: string
}

export interface CBRequest {
  _id: string
  request_number: string
  status: string
  cert_type?: string
  markets?: string[]
  market?: string                    // deprecated mirror
  product_category?: string
  message?: string
  created_at: string
  updated_at: string
  certification_body_id?: any
  product_id?: any
  application_id?: any
  document_ids?: any[]
  status_history?: Array<{ from: string; to: string; at: string; note?: string; by?: any }>
  cb_response?: { summary?: string; quote_amount?: number; quote_currency?: string; valid_until?: string }
  // internal_notes is intentionally absent — the backend never returns it to customers.
}

/** Human wording for a numeric match score (only interpretation, never a fake rating). */
export function matchTier(score: number): string {
  if (score >= 90) return 'Best Match'
  if (score >= 75) return 'Strong Match'
  if (score >= 55) return 'Good Match'
  return 'Possible Match'
}

const cbService = {
  match: (params: Record<string, any>) =>
    api.get<{ data: CBMatchResponse }>('/certification-bodies/match', { params }).then(r => r.data),

  getCB: (id: string, params?: Record<string, any>) =>
    api.get<{ data: any }>(`/certification-bodies/${id}`, { params }).then(r => r.data),

  getScopes: (id: string) =>
    api.get<{ data: any[] }>(`/certification-bodies/${id}/scopes`).then(r => r.data),

  listRequests: (params?: Record<string, any>) =>
    api.get<{ data: CBRequest[]; pagination: any }>('/cb-requests', { params }).then(r => ({ items: r.data || [], pagination: (r as any).pagination })),

  getRequest: (id: string) =>
    api.get<{ data: CBRequest }>(`/cb-requests/${id}`).then(r => r.data),

  createRequest: (body: Record<string, any>) =>
    api.post<{ data: CBRequest }>('/cb-requests', body).then(r => r.data),

  cancelRequest: (id: string, reason?: string) =>
    api.patch<{ data: CBRequest }>(`/cb-requests/${id}/cancel`, { reason }).then(r => r.data),
}

export default cbService
