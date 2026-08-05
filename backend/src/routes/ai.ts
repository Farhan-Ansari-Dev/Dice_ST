import { Router, Request, Response, NextFunction } from 'express'
import multer from 'multer'
import { randomUUID } from 'crypto'
import { authenticate, AuthRequest } from '../middleware/authMongo'
import { aiService, buildCustomerContext } from '../services/aiService'
import { sendSuccess } from '../utils/response'
import { AIConversation } from '../models/AIConversation'
import { analyseProductImage, VisionUnavailableError } from '../services/vision/productVisionService'
import { buildAnalysis } from '../services/vision/complianceEngine'
import { generateAndStoreReport } from '../services/vision/productReportPdf'
import { logger } from '../utils/logger'

const router = Router()

// AIUnavailableError is mapped to a 503 centrally in middleware/errorHandler,
// so every AI-touching route reports the same shape.
const wrap = (fn: any) => (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next)

// In-memory: the image is forwarded to the vision model and never persisted.
// Keeping product photographs off disk avoids retaining customer data we have
// no reason to hold.
const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ACCEPTED_IMAGE_TYPES.has(file.mimetype)) {
      cb(new Error(`Unsupported image type ${file.mimetype}. Use JPEG, PNG, or WebP.`))
      return
    }
    cb(null, true)
  },
})

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
  const analysis = await aiService.analyzeDocument(text, req.user!._id.toString())
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
  const result = await aiService.analyzeHsCode(hsCode || hs_code, req.user!._id.toString())
  sendSuccess(res, result)
}))

router.post('/analyze-risks', wrap(async (req: AuthRequest, res: Response) => {
  const { context, product, market } = req.body
  const result = await aiService.analyzeRisks(context || `${product} in ${market}`, req.user!._id.toString())
  sendSuccess(res, result)
}))

router.post('/analyze-certifications', wrap(async (req: AuthRequest, res: Response) => {
  const { productName, product_name, markets } = req.body
  const result = await aiService.analyzeCertifications(productName || product_name, markets || [], req.user!._id.toString())
  sendSuccess(res, result)
}))

// ═══════════════════════════════════════════════════════════════
// POST /ai/analyze-product-image  — the AI Quality Analyzer pipeline
//
//   multipart image → vision observations → compliance engine
//   → structured JSON (+ optional PDF → S3 → signed URL)
//
// `includeReport=false` skips PDF generation for a faster first response;
// the client can then call /report to produce the document on demand.
// ═══════════════════════════════════════════════════════════════
router.post(
  '/analyze-product-image',
  imageUpload.single('image'),
  wrap(async (req: AuthRequest, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'missing_image', message: 'Attach a product image as the "image" field.' })
    }

    const userId = req.user!._id.toString()
    const analysisId = randomUUID()
    const includeReport = String(req.body?.includeReport ?? 'true') !== 'false'

    try {
      const customerContext = await buildCustomerContext(userId)
      const observations = await analyseProductImage(req.file.buffer, req.file.mimetype, req.body?.notes, customerContext)
      const analysis = buildAnalysis(observations, analysisId)

      let report = null
      if (includeReport) {
        try {
          report = await generateAndStoreReport(analysis, userId)
        } catch (e) {
          // A storage failure must not discard a completed analysis — return the
          // JSON and let the client retry the document separately.
          logger.error(`[ai/analyze-product-image] report generation failed analysisId=${analysisId}: ${String(e)}`)
        }
      }

      return sendSuccess(res, { ...analysis, report })
    } catch (e) {
      if (e instanceof VisionUnavailableError) {
        return res.status(503).json({ success: false, error: 'ai_unavailable', message: e.message })
      }
      logger.error(`[ai/analyze-product-image] analysis failed analysisId=${analysisId}: ${String(e)}`)
      return res.status(502).json({
        success: false,
        error: 'analysis_failed',
        message: e instanceof Error ? e.message : 'Image analysis failed. Please retry.',
      })
    }
  }),
)

// Regenerates the PDF for an analysis the client already holds. The analysis
// payload is posted back so no server-side session state is required.
router.post(
  '/product-report',
  wrap(async (req: AuthRequest, res: Response) => {
    const analysis = req.body?.analysis
    if (!analysis?.analysisId || !analysis?.assessment) {
      return res.status(400).json({ success: false, error: 'invalid_analysis', message: 'A complete analysis object is required.' })
    }

    try {
      const report = await generateAndStoreReport(analysis, req.user!._id.toString())
      return sendSuccess(res, report)
    } catch (e) {
      logger.error(`[ai/product-report] failed: ${String(e)}`)
      return res.status(502).json({ success: false, error: 'report_failed', message: 'Could not generate the report. Please retry.' })
    }
  }),
)

export default router
