/**
 * Admin AI Assistant routes — internal, staff-only, tool-grounded.
 *
 *   POST   /admin-ai/chat            ask a question (runs the read-only tool loop)
 *   GET    /admin-ai/disclosure      staff-AI disclosure status
 *   POST   /admin-ai/disclosure      acknowledge the disclosure
 *   GET    /admin-ai/conversations   list the caller's admin conversations
 *   DELETE /admin-ai/conversations/:id  delete one of the caller's conversations
 *
 * Guards: authenticate + requireRole(STAFF_ROLES) — cb/lab/consultant/ib/client
 * are refused (403 forbidden). /chat additionally requires the staff disclosure.
 * Rate limiting (aiLimiter) is applied where this router is mounted. This router
 * NEVER touches the consumer /ai/chat, mobile, or the consumer consent gate.
 */
import { Router, Request, Response, NextFunction } from 'express'
import { authenticate, AuthRequest, requireRole, STAFF_ROLES } from '../../middleware/authMongo'
import { sendSuccess } from '../../utils/response'
import { audit } from '../../models/AuditLog'
import { AIConversation } from '../../models/AIConversation'
import { runAdminAssistant } from '../../services/ai/adminAssistantService'
import {
  getStaffAiDisclosure,
  recordStaffAiDisclosure,
  requireStaffAiDisclosure,
} from '../../services/ai/aiConsent'

const router = Router()
const wrap = (fn: any) => (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next)

router.use(authenticate)
router.use(requireRole(...STAFF_ROLES)) // admin, super_admin, employee only

// ── Disclosure ───────────────────────────────────────────────────────────
router.get('/disclosure', wrap(async (req: AuthRequest, res: Response) => {
  sendSuccess(res, await getStaffAiDisclosure(req.user!._id.toString()))
}))

router.post('/disclosure', wrap(async (req: AuthRequest, res: Response) => {
  const status = await recordStaffAiDisclosure(req.user!._id.toString())
  await audit({
    actor: req.user!._id as any,
    resource_type: 'admin_ai',
    resource_id: req.user!._id as any,
    action: 'updated',
    notes: `staff_ai_disclosure_acknowledged v${status.version}`,
    ip: req.ip,
  }).catch(() => {})
  sendSuccess(res, status)
}))

// ── Chat (tool-grounded) ─────────────────────────────────────────────────
router.post('/chat', requireStaffAiDisclosure, wrap(async (req: AuthRequest, res: Response) => {
  const message = String(req.body?.message ?? '').trim()
  const conversationId = req.body?.conversationId
  if (!message) {
    res.status(400).json({ success: false, error: 'missing_message', message: 'A message is required.' })
    return
  }

  const result = await runAdminAssistant(req.user!, message, conversationId)

  // Audit the request WITHOUT storing the prompt/response or any PII — only which
  // tools ran and how many, for operational oversight.
  await audit({
    actor: req.user!._id as any,
    resource_type: 'admin_ai',
    resource_id: req.user!._id as any,
    action: 'viewed',
    notes: `admin_ai_query tools=[${result.toolsUsed.join(',')}] tool_calls=${result.toolsUsed.length}`,
    ip: req.ip,
  }).catch(() => {})

  sendSuccess(res, { response: result.response, conversationId: result.conversationId })
}))

// ── Conversations (admin-scoped, isolated from customer history) ──────────
router.get('/conversations', wrap(async (req: AuthRequest, res: Response) => {
  const rows = await AIConversation.find({ user_id: req.user!._id, scope: 'admin' })
    .sort({ updated_at: -1 })
    .limit(20)
    .select('updated_at created_at')
    .lean()
  sendSuccess(res, rows)
}))

router.delete('/conversations/:id', wrap(async (req: AuthRequest, res: Response) => {
  const r = await AIConversation.deleteOne({ _id: req.params.id, user_id: req.user!._id, scope: 'admin' })
  sendSuccess(res, { deleted: r.deletedCount ?? 0 })
}))

export default router
