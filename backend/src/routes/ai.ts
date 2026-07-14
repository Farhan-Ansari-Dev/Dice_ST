import { Router, Request, Response, NextFunction } from 'express'
import { authenticate, AuthRequest } from '../middleware/authMongo'
import { aiService } from '../services/aiService'
import { sendSuccess } from '../utils/response'
import { AIConversation } from '../models/AIConversation'

const router = Router()
const wrap = (fn: any) => (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next)

router.use(authenticate)

router.post('/chat', wrap(async (req: AuthRequest, res: Response) => {
  const { message, conversationId } = req.body
  const result = await aiService.chat(req.user!._id.toString(), message, conversationId)
  sendSuccess(res, result)
}))

router.get('/conversations', wrap(async (req: AuthRequest, res: Response) => {
  const result = await AIConversation.find({ user_id: req.user!._id }).sort({ updated_at: -1 }).limit(20).lean()
  sendSuccess(res, result)
}))

router.get('/conversations/:id', wrap(async (req: AuthRequest, res: Response) => {
  const result = await AIConversation.findOne({ _id: req.params.id, user_id: req.user!._id }).lean()
  sendSuccess(res, result ?? null)
}))

router.post('/analyze-document', wrap(async (req: AuthRequest, res: Response) => {
  const { text } = req.body
  const analysis = await aiService.analyzeDocument(text)
  sendSuccess(res, analysis)
}))

router.get('/recommendations', wrap(async (req: AuthRequest, res: Response) => {
  const recs = await aiService.getComplianceRecommendations(req.user!._id.toString())
  sendSuccess(res, recs)
}))

router.post('/ask', wrap(async (req: AuthRequest, res: Response) => {
  const { message, question, conversationId } = req.body
  const result = await aiService.chat(req.user!._id.toString(), message || question, conversationId)
  sendSuccess(res, result)
}))

router.post('/analyze-hs-code', wrap(async (req: AuthRequest, res: Response) => {
  const { hsCode, hs_code } = req.body
  const result = await aiService.analyzeHsCode(hsCode || hs_code)
  sendSuccess(res, result)
}))

router.post('/analyze-risks', wrap(async (req: AuthRequest, res: Response) => {
  const { context, product, market } = req.body
  const result = await aiService.analyzeRisks(context || `${product} in ${market}`)
  sendSuccess(res, result)
}))

router.post('/analyze-certifications', wrap(async (req: AuthRequest, res: Response) => {
  const { productName, product_name, markets } = req.body
  const result = await aiService.analyzeCertifications(productName || product_name, markets || [])
  sendSuccess(res, result)
}))

export default router
