import { Router, Request, Response, NextFunction } from 'express'
import { authenticate } from '../middleware/auth'
import { Insight } from '../models'
import redis from '../config/redis'
import { aiService } from '../services/aiService'
import { sendSuccess, sendPaginated } from '../utils/response'
import { runAxiosCreeper } from '../jobs/axiosCreeper'

const router = Router()
const wrap = (fn: any) => (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next)

router.use(authenticate)

router.get('/', wrap(async (req: Request, res: Response) => {
  const { page = 1, limit = 20, category, country } = req.query
  const cacheKey = `insights:mongo:${category ?? 'all'}:${country ?? 'all'}:${page}:${limit}`

  const cached = await redis.get(cacheKey)
  if (cached) { res.json(JSON.parse(cached)); return }

  const query: any = {}
  if (category) query.category = category
  if (country) query.country = country

  const total = await Insight.countDocuments(query)
  const offset = (Number(page) - 1) * Number(limit)
  
  const insights = await Insight.find(query)
    .sort({ publishedAt: -1 })
    .skip(offset)
    .limit(Number(limit))

  const response = { success: true, data: insights, pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) } }
  await redis.setex(cacheKey, 300, JSON.stringify(response)) // 5 min cache
  res.json(response)
}))

router.get('/:id', wrap(async (req: Request, res: Response) => {
  const insight = await Insight.findById(req.params.id)
  sendSuccess(res, insight)
}))

router.post('/ai-summary', wrap(async (req: Request, res: Response) => {
  const { content } = req.body
  const summary = await aiService.generateInsightSummary(content)
  sendSuccess(res, { summary })
}))

// TRIGGER SCRAPER MANUALLY (For testing pipeline)
router.post('/trigger-scraper', wrap(async (req: Request, res: Response) => {
  const result = await runAxiosCreeper()
  sendSuccess(res, result)
}))

export default router
