/**
 * Admin AI Assistant — read-only tool registry.
 *
 * The LLM may only PLAN which of these whitelisted tools to call; it never
 * decides authorization. Every handler independently enforces the caller's role
 * and scope against `user` (NOT anything the model said), validates its args,
 * and returns a MINIMIZED projection (ids/labels/statuses/counts) — never full
 * records, never raw emails/phones/document contents — so only the least data
 * needed to answer reaches the AI provider. All tools are read-only; there are
 * no mutation tools.
 *
 * Authorization matrix (route already restricts to STAFF_ROLES = admin,
 * super_admin, employee; cb/lab/consultant/ib/client never reach here):
 *   getOperationalSummary  admin/super_admin = platform · employee = assigned
 *   searchApplications     admin/super_admin = all      · employee = assigned
 *   getApplication         admin/super_admin = any       · employee = own/assigned only
 *   searchUsers            admin/super_admin ONLY
 *   searchCBRequests       admin/super_admin ONLY
 *   getAnalyticsSummary    admin/super_admin ONLY
 * A tool a role may not use returns { error: 'forbidden' } (data the model
 * relays as "you don't have access") — it never throws and never leaks.
 */
import { z } from 'zod'
import { Types } from 'mongoose'
import { IUser } from '../../models'
import { Application } from '../../models/Application'
import { Certification } from '../../models/Certification'
import { Payment } from '../../models/Payment'
import { CBRequest } from '../../models/CBRequest'
import { User } from '../../models/User'

const isAdmin = (u: IUser) => u.role === 'admin' || u.role === 'super_admin'
const isEmployee = (u: IUser) => u.role === 'employee'
const FORBIDDEN = { error: 'forbidden', message: 'You are not authorized to access this data.' }

const OPEN_APP_STATUSES = ['draft', 'submitted', 'docs_review', 'docs_required', 'tech_review', 'testing', 'approval_pending', 'on_hold']
const clampLimit = (n: unknown, def = 10, max = 25) => Math.min(Math.max(parseInt(String(n ?? def), 10) || def, 1), max)

/** Applications the caller is allowed to see, as a Mongo filter. Employee = assigned/created. */
function appScopeFor(u: IUser): Record<string, any> | null {
  if (isAdmin(u)) return {}
  if (isEmployee(u)) return { $or: [{ primary_assignee: u._id }, { created_by: u._id }] }
  return null // any other role has no application scope here
}

// ── Tool handlers ──────────────────────────────────────────────────────────

async function getOperationalSummary(user: IUser): Promise<any> {
  const scope = appScopeFor(user)
  if (scope === null) return FORBIDDEN
  const base: any = { ...scope, deleted_at: { $exists: false } }
  const [pending, awaitingDocs, unassigned] = await Promise.all([
    Application.countDocuments({ ...base, status: { $in: OPEN_APP_STATUSES } } as any),
    Application.countDocuments({ ...base, 'required_documents.status': 'submitted' } as any),
    Application.countDocuments({ ...base, status: { $in: OPEN_APP_STATUSES }, primary_assignee: { $exists: false } } as any),
  ])
  // Platform-wide extras only for admins.
  let unresolvedCbRequests: number | undefined
  if (isAdmin(user)) {
    unresolvedCbRequests = await CBRequest.countDocuments({ status: { $nin: ['completed', 'cancelled', 'declined', 'closed'] } } as any)
  }
  return {
    scope: isAdmin(user) ? 'platform' : 'assigned_to_you',
    pending_applications: pending,
    applications_awaiting_document_review: awaitingDocs,
    unassigned_open_applications: unassigned,
    ...(unresolvedCbRequests !== undefined ? { unresolved_cb_requests: unresolvedCbRequests } : {}),
  }
}

const searchApplicationsArgs = z.object({
  status: z.enum(['open', 'draft', 'submitted', 'docs_review', 'docs_required', 'tech_review', 'testing', 'approval_pending', 'on_hold', 'approved', 'rejected']).optional(),
  awaitingDocuments: z.boolean().optional(),
  unassigned: z.boolean().optional(),
  customerId: z.string().optional(),
  query: z.string().max(120).optional(),
  limit: z.number().optional(),
})
async function searchApplications(user: IUser, raw: unknown): Promise<any> {
  const scope = appScopeFor(user)
  if (scope === null) return FORBIDDEN
  const args = searchApplicationsArgs.parse(raw ?? {})
  const q: Record<string, any> = { ...scope, deleted_at: { $exists: false } }
  if (args.status === 'open') q.status = { $in: OPEN_APP_STATUSES }
  else if (args.status) q.status = args.status
  if (args.awaitingDocuments) q['required_documents.status'] = 'submitted'
  if (args.unassigned) q.primary_assignee = { $exists: false }
  if (args.customerId && Types.ObjectId.isValid(args.customerId)) q.created_by = new Types.ObjectId(args.customerId)
  if (args.query) q.application_number = { $regex: escapeRegex(args.query), $options: 'i' }

  const rows = await Application.find(q as any)
    .select('application_number status product_status cert_type primary_assignee updated_at')
    .sort({ updated_at: -1 })
    .limit(clampLimit(args.limit))
    .lean()
  return {
    count: rows.length,
    applications: rows.map((a: any) => ({
      id: String(a._id),
      application_number: a.application_number,
      status: a.status,
      product_status: a.product_status,
      cert_type: a.cert_type,
      assigned: !!a.primary_assignee,
      updated_at: a.updated_at,
    })),
  }
}

const getApplicationArgs = z.object({ id: z.string() })
async function getApplication(user: IUser, raw: unknown): Promise<any> {
  const { id } = getApplicationArgs.parse(raw ?? {})
  if (!Types.ObjectId.isValid(id)) return { error: 'not_found', message: 'No such application.' }
  const a: any = await Application.findById(id)
    .select('application_number status current_stage product_status cert_type created_by primary_assignee required_documents updated_at')
    .lean()
  if (!a) return { error: 'not_found', message: 'No such application.' }
  // Employee may only view applications assigned to or created by them.
  if (!isAdmin(user)) {
    if (!isEmployee(user)) return FORBIDDEN
    const owns = String(a.created_by) === String(user._id) || String(a.primary_assignee ?? '') === String(user._id)
    if (!owns) return FORBIDDEN
  }
  const docs = Array.isArray(a.required_documents) ? a.required_documents : []
  return {
    id: String(a._id),
    application_number: a.application_number,
    status: a.status,
    current_stage: a.current_stage ?? null,
    product_status: a.product_status,
    cert_type: a.cert_type,
    assigned: !!a.primary_assignee,
    documents: {
      total: docs.length,
      awaiting_review: docs.filter((d: any) => d.status === 'submitted').length,
      pending_from_customer: docs.filter((d: any) => d.status === 'pending').length,
    },
    updated_at: a.updated_at,
  }
}

const searchUsersArgs = z.object({ query: z.string().max(120).optional(), role: z.string().max(30).optional(), limit: z.number().optional() })
async function searchUsers(user: IUser, raw: unknown): Promise<any> {
  if (!isAdmin(user)) return FORBIDDEN // employees do not get free-text user search
  const args = searchUsersArgs.parse(raw ?? {})
  const q: Record<string, any> = { deleted_at: { $exists: false } }
  if (args.role) q.role = args.role
  if (args.query) {
    const rx = { $regex: escapeRegex(args.query), $options: 'i' }
    q.$or = [{ name: rx }, { company_name: rx }]
  }
  const rows = await User.find(q as any).select('name role company_name').limit(clampLimit(args.limit)).lean()
  // Minimized: no email/phone/address.
  return {
    count: rows.length,
    users: rows.map((u: any) => ({ id: String(u._id), name: u.name, role: u.role, company_name: u.company_name ?? null })),
  }
}

const searchCBRequestsArgs = z.object({ status: z.string().max(30).optional(), limit: z.number().optional() })
async function searchCBRequests(user: IUser, raw: unknown): Promise<any> {
  if (!isAdmin(user)) return FORBIDDEN
  const args = searchCBRequestsArgs.parse(raw ?? {})
  const q: Record<string, any> = {}
  if (args.status) q.status = args.status
  const rows = await CBRequest.find(q as any).select('request_number status cert_type certification_body_id updated_at').sort({ updated_at: -1 }).limit(clampLimit(args.limit)).lean()
  return {
    count: rows.length,
    cb_requests: rows.map((r: any) => ({ id: String(r._id), request_number: r.request_number, status: r.status, cert_type: r.cert_type ?? null, updated_at: r.updated_at })),
  }
}

async function getAnalyticsSummary(user: IUser): Promise<any> {
  if (!isAdmin(user)) return FORBIDDEN // platform metrics are admin-only
  const [openApps, activeCerts, pendingPayments, unresolvedCb] = await Promise.all([
    Application.countDocuments({ status: { $in: OPEN_APP_STATUSES }, deleted_at: { $exists: false } } as any),
    Certification.countDocuments({ status: 'active', deleted_at: { $exists: false } } as any),
    Payment.countDocuments({ status: 'pending' } as any),
    CBRequest.countDocuments({ status: { $nin: ['completed', 'cancelled', 'declined', 'closed'] } } as any),
  ])
  return { scope: 'platform', open_applications: openApps, active_certifications: activeCerts, pending_payments: pendingPayments, unresolved_cb_requests: unresolvedCb }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ── OpenAI tool schemas (function-calling) ───────────────────────────────────
export const ADMIN_AI_TOOLS = [
  { type: 'function' as const, function: { name: 'getOperationalSummary', description: 'Counts of pending applications, applications awaiting document review, and unassigned open applications (plus unresolved CB requests for admins).', parameters: { type: 'object', properties: {}, additionalProperties: false } } },
  { type: 'function' as const, function: { name: 'searchApplications', description: 'List applications, optionally filtered by status ("open" = any in-progress), awaitingDocuments, unassigned, customerId (a user id), or an application-number query.', parameters: { type: 'object', properties: { status: { type: 'string' }, awaitingDocuments: { type: 'boolean' }, unassigned: { type: 'boolean' }, customerId: { type: 'string' }, query: { type: 'string' }, limit: { type: 'number' } }, additionalProperties: false } } },
  { type: 'function' as const, function: { name: 'getApplication', description: 'Get the status, stage, and document-checklist summary for one application by id.', parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'], additionalProperties: false } } },
  { type: 'function' as const, function: { name: 'searchUsers', description: 'Search users/customers by name or company (admins only). Returns id, name, role, company only.', parameters: { type: 'object', properties: { query: { type: 'string' }, role: { type: 'string' }, limit: { type: 'number' } }, additionalProperties: false } } },
  { type: 'function' as const, function: { name: 'searchCBRequests', description: 'List certification-body requests, optionally by status (admins only).', parameters: { type: 'object', properties: { status: { type: 'string' }, limit: { type: 'number' } }, additionalProperties: false } } },
  { type: 'function' as const, function: { name: 'getAnalyticsSummary', description: 'Platform operational counts (admins only).', parameters: { type: 'object', properties: {}, additionalProperties: false } } },
]

export const ADMIN_AI_TOOL_NAMES = ADMIN_AI_TOOLS.map((t) => t.function.name)

/**
 * Execute one tool with server-side authorization. Never trusts the model for
 * authz. Returns minimized data or a { error } object; throws only on a truly
 * unexpected fault (caught by the assistant service).
 */
export async function executeAdminTool(user: IUser, name: string, args: unknown): Promise<any> {
  try {
    switch (name) {
      case 'getOperationalSummary': return await getOperationalSummary(user)
      case 'searchApplications':    return await searchApplications(user, args)
      case 'getApplication':        return await getApplication(user, args)
      case 'searchUsers':           return await searchUsers(user, args)
      case 'searchCBRequests':      return await searchCBRequests(user, args)
      case 'getAnalyticsSummary':   return await getAnalyticsSummary(user)
      default:                      return { error: 'unknown_tool', message: `No such tool: ${name}` }
    }
  } catch (e: any) {
    if (e instanceof z.ZodError) return { error: 'invalid_arguments', message: 'The tool arguments were invalid.' }
    return { error: 'lookup_failed', message: 'The data lookup failed. Please retry.' }
  }
}
