/**
 * AI consent — the single, server-enforced gate for third-party AI usage.
 *
 * DICE forwards user/business context (and, for the analyzer, uploaded product
 * images / document text) to a third-party AI provider. Apple 5.1.1(i)/5.1.2(i)
 * require explicit, informed consent before that sharing. This module is the ONE
 * place that decides whether a user may use AI features:
 *   • persistence lives on the existing User.consents sub-document (no new store)
 *   • `requireAiConsent` gates AI HTTP routes (fast, machine-readable 403)
 *   • `assertAiConsent` gates the service layer (defense-in-depth, non-bypassable)
 *   • `hasCurrentAiConsent` lets indirect/optional AI paths skip AI without error
 * No AI payloads, images, or secrets are ever stored in the consent record.
 */
import { Response, NextFunction } from 'express'
import { AuthRequest } from '../../middleware/authMongo'
import { User } from '../../models/User'
import { audit } from '../../models/AuditLog'

/**
 * The current AI-consent version — the SINGLE source of truth. This is the
 * version of the AI DISCLOSURE/CONSENT TERMS, not an implementation date. Bump
 * it whenever the AI disclosure/terms materially change (e.g. new provider, new
 * data shared): a minor bump (1.1) for clarifications, a major bump (2.0) for
 * substantive changes. Consents recorded at an older version are then treated as
 * not current and the user is re-prompted.
 */
export const AI_CONSENT_VERSION = '1.0'

export interface AiConsentStatus {
  consented: boolean
  version: string | null
  consented_at: Date | null
  declined_at: Date | null
  current_version: string
  /** true only when consented === true AND version === AI_CONSENT_VERSION */
  is_current: boolean
}

/** Thrown by the service layer when a user lacks current AI consent → 403 in errorHandler. */
export class AiConsentRequiredError extends Error {
  readonly statusCode = 403
  readonly code = 'ai_consent_required'
  constructor(message = 'AI consent is required before using AI features.') {
    super(message)
    this.name = 'AiConsentRequiredError'
  }
}

/** Read a user's AI-consent status. Absent record ⇒ not consented (never throws). */
export async function getAiConsentStatus(userId: string): Promise<AiConsentStatus> {
  const u: any = await User.findById(userId).select('consents.ai').lean()
  const ai = u?.consents?.ai
  const consented = ai?.consented === true
  const version: string | null = ai?.version ?? null
  return {
    consented,
    version,
    consented_at: ai?.consented_at ?? null,
    declined_at: ai?.declined_at ?? null,
    current_version: AI_CONSENT_VERSION,
    is_current: consented && version === AI_CONSENT_VERSION,
  }
}

/** True only when the user has an active, current-version AI consent. */
export async function hasCurrentAiConsent(userId?: string | null): Promise<boolean> {
  if (!userId) return false
  return (await getAiConsentStatus(String(userId))).is_current
}

/**
 * Persist an accept/decline decision and write an immutable audit event.
 * Stores only the decision, version, and timestamps — never AI content.
 */
export async function recordAiConsent(
  userId: string,
  accepted: boolean,
  meta: { ip?: string; user_agent?: string } = {},
): Promise<AiConsentStatus> {
  const now = new Date()
  const set: Record<string, unknown> = {
    'consents.ai.consented': accepted,
    'consents.ai.version': AI_CONSENT_VERSION,
  }
  if (accepted) set['consents.ai.consented_at'] = now
  else set['consents.ai.declined_at'] = now

  await User.updateOne({ _id: userId }, { $set: set })
  await audit({
    actor: userId as any,
    resource_type: 'user' as any,
    resource_id: userId as any,
    action: 'updated',
    notes: `ai_consent ${accepted ? 'accepted' : 'declined'} v${AI_CONSENT_VERSION}${meta.ip ? ` ip=${meta.ip}` : ''}`,
  }).catch(() => { /* audit failure must not fail the consent write */ })

  return getAiConsentStatus(userId)
}

/** Service-layer guard — throws AiConsentRequiredError unless consent is current. */
export async function assertAiConsent(userId?: string | null): Promise<void> {
  if (!(await hasCurrentAiConsent(userId))) throw new AiConsentRequiredError()
}

/** 403 body shared by the middlewares below. */
function sendConsentRequired(res: Response): void {
  res.status(403).json({
    success: false,
    error: 'ai_consent_required',
    message: 'AI consent is required before using AI features.',
    current_version: AI_CONSENT_VERSION,
  })
}

/** Express middleware — 403 { error: 'ai_consent_required' } unless consent is current. */
export async function requireAiConsent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (await hasCurrentAiConsent(req.user?._id?.toString())) return next()
    sendConsentRequired(res)
  } catch (e) {
    next(e)
  }
}

/**
 * Conditional gate for routes where AI runs only for SOME requests — e.g. HS
 * validation and trade-traffic accept a code-only request (pure dataset/provider
 * lookup, nothing forwarded to AI) as well as a product-text request (which is
 * classified via AI). Consent is required only when `willUseAi(req)` is true, so
 * non-AI lookups keep working for users who have not consented.
 */
export function requireAiConsentIf(
  willUseAi: (req: AuthRequest) => boolean,
): (req: AuthRequest, res: Response, next: NextFunction) => Promise<void> {
  return async (req, res, next) => {
    try {
      if (!willUseAi(req)) return next()
      if (await hasCurrentAiConsent(req.user?._id?.toString())) return next()
      sendConsentRequired(res)
    } catch (e) {
      next(e)
    }
  }
}

/** True when the request body carries any non-empty product-text field (drives AI classification). */
export function bodyHasProductText(req: AuthRequest): boolean {
  const b: any = req.body || {}
  return [b.productName, b.productDescription, b.category, b.brand, b.model].some(
    (v) => typeof v === 'string' && v.trim() !== '',
  )
}
