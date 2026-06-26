import { Router, Request, Response, NextFunction } from 'express'
import { RemoteConfig } from '../../models/RemoteConfig'
import { authenticate, requireRole, AuthRequest } from '../../middleware/authMongo'
import { sendSuccess } from '../../utils/response'
import redis from '../../config/redis'
import { z } from 'zod'
import { logger } from '../../utils/logger'

const router = Router()

const CACHE_KEY = 'global_remote_config'

const wrap = (fn: any) => (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next)

const configUpdateSchema = z.object({
  featureFlags: z.object({
    maintenance_mode: z.boolean().optional(),
    enable_ai_assistant: z.boolean().optional(),
    enable_ocr_scanning: z.boolean().optional(),
    enable_referral_rewards: z.boolean().optional(),
    enable_promotional_banners: z.boolean().optional(),
    enable_notifications: z.boolean().optional(),
  }).optional(),
  dynamicConfig: z.object({
    banner_text: z.string().optional(),
    banner_color: z.string().optional(),
    referral_reward_value: z.number().optional(),
    announcement_title: z.string().optional(),
    announcement_body: z.string().optional(),
  }).optional(),
})

// Public endpoint for mobile app to fetch config
router.get('/', wrap(async (req: Request, res: Response) => {
  // 1. Try Cache
  const cached = await redis.get(CACHE_KEY)
  if (cached) {
    sendSuccess(res, JSON.parse(cached), 'Config fetched from cache')
    return
  }

  // 2. Fetch from DB
  const config = await RemoteConfig.getGlobalConfig()
  
  // 3. Update Cache
  await redis.setex(CACHE_KEY, 3600, JSON.stringify(config)) // 1 hour TTL

  sendSuccess(res, config, 'Config fetched from database')
}))

// Admin endpoint to get config details
router.get('/admin', authenticate, requireRole('admin'), wrap(async (req: AuthRequest, res: Response) => {
  const config = await RemoteConfig.getGlobalConfig()
  sendSuccess(res, config, 'Admin config fetched')
}))

// Admin endpoint to update config and bust cache
router.put('/admin', authenticate, requireRole('admin'), wrap(async (req: AuthRequest, res: Response) => {
  const updates = configUpdateSchema.parse(req.body)
  
  let config = await RemoteConfig.getGlobalConfig()
  
  if (updates.featureFlags) {
    config.featureFlags = { ...config.featureFlags, ...updates.featureFlags }
  }
  if (updates.dynamicConfig) {
    config.dynamicConfig = { ...config.dynamicConfig, ...updates.dynamicConfig }
  }
  
  await config.save()
  
  // Immediately bust and update the cache for instant rollout
  await redis.setex(CACHE_KEY, 3600, JSON.stringify(config))
  
  logger.info(`Remote Config updated by admin ${req.user!._id}`)
  sendSuccess(res, config, 'Configuration updated successfully')
}))

export default router
