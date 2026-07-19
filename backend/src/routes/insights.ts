import { Router, Request, Response, NextFunction } from 'express'
// authMongo resolves req.user to the full User document (correct _id + role);
// the lightweight auth.ts middleware reads a non-existent `userId` claim and
// leaves req.user.id undefined, which we need for createdBy.
import { authenticate, requireRole, ADMIN_ROLES, AuthRequest } from '../middleware/authMongo'
import { Insight } from '../models'
import redis from '../config/redis'
import { aiService } from '../services/aiService'
import { sendSuccess, sendError } from '../utils/response'
import { runAxiosCreeper } from '../jobs/axiosCreeper'

const router = Router()
const wrap = (fn: any) => (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next)

// Cache version — bumped on every mutation so stale list caches are bypassed
// (in-memory Redis fallback has no KEYS command, so pattern-delete isn't portable).
const CACHE_VER_KEY = 'insights:ver'
const bumpCacheVersion = () => redis.setex(CACHE_VER_KEY, 86400, String(Date.now())).catch(() => {})

router.use(authenticate)

router.get('/', wrap(async (req: AuthRequest, res: Response) => {
  const { page = 1, limit = 20, category, country, includeUnpublished } = req.query
  const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin'
  const showDrafts = isAdmin && includeUnpublished === 'true'

  const ver = (await redis.get(CACHE_VER_KEY)) ?? '0'
  const cacheKey = `insights:mongo:${ver}:${showDrafts ? 'drafts' : 'pub'}:${category ?? 'all'}:${country ?? 'all'}:${page}:${limit}`

  const cached = await redis.get(cacheKey)
  if (cached) { res.json(JSON.parse(cached)); return }

  const query: any = {}
  if (category) query.category = category
  if (country) query.country = country
  // Mobile app and non-admin callers only see published insights.
  // Docs created before the `published` field existed have no value → treated as published.
  if (!showDrafts) query.published = { $ne: false }

  const total = await Insight.countDocuments(query)
  const offset = (Number(page) - 1) * Number(limit)

  const insights = await Insight.find(query)
    .sort({ featured: -1, publishedAt: -1 })   // pinned first, then newest
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

// ── Admin CRUD (super_admin inherits admin) ─────────────────────
router.post('/', requireRole(...ADMIN_ROLES), wrap(async (req: AuthRequest, res: Response) => {
  const { title, summary, content, category, country, source, link, tags, published, featured, publishedAt } = req.body
  // Text-based insights: Title, Short Summary, Source Name and Source URL are required.
  if (!title || !summary || !category || !source || !link) {
    return sendError(res, 'title, summary, category, source (name) and link (source URL) are required', 400)
  }
  const insight = await Insight.create({
    title,
    summary,
    content: content || '',
    category,
    country: country || undefined,          // optional
    source,                                  // Source Name
    link,                                    // Source URL
    tags: Array.isArray(tags) ? tags : [],
    published: published !== false,
    featured: featured === true,
    createdBy: req.user!._id,
    publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
  })
  await bumpCacheVersion()
  return sendSuccess(res, insight, 'Created successfully', 201)
}))

router.put('/:id', requireRole(...ADMIN_ROLES), wrap(async (req: AuthRequest, res: Response) => {
  const allowed = ['title', 'summary', 'content', 'category', 'country', 'source', 'link', 'tags', 'published', 'featured', 'publishedAt']
  const update: any = {}
  for (const k of allowed) {
    if (req.body[k] !== undefined) update[k] = req.body[k]
  }
  const insight = await Insight.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true })
  if (!insight) return sendError(res, 'Not found', 404)
  await bumpCacheVersion()
  return sendSuccess(res, insight, 'Updated successfully')
}))

router.delete('/:id', requireRole(...ADMIN_ROLES), wrap(async (req: AuthRequest, res: Response) => {
  const insight = await Insight.findByIdAndDelete(req.params.id)
  if (!insight) return sendError(res, 'Not found', 404)
  await bumpCacheVersion()
  return sendSuccess(res, { id: insight._id }, 'Deleted successfully')
}))

router.post('/ai-summary', requireRole(...ADMIN_ROLES), wrap(async (req: Request, res: Response) => {
  const { content } = req.body
  const summary = await aiService.generateInsightSummary(content)
  sendSuccess(res, { summary })
}))

router.post('/trigger-scraper', requireRole(...ADMIN_ROLES), wrap(async (req: Request, res: Response) => {
  const result = await runAxiosCreeper()
  sendSuccess(res, result)
}))

export default router
