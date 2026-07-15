import { Router, Request, Response, NextFunction } from 'express'
import { RemoteConfig } from '../../models/RemoteConfig'
import { authenticate, requireRole, ADMIN_ROLES, AuthRequest } from '../../middleware/authMongo'
import { sendSuccess } from '../../utils/response'
import redis from '../../config/redis'
import { audit } from '../../models/AuditLog'
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
    consultant_verification_enabled: z.boolean().optional(),
  }).optional(),
  dynamicConfig: z.object({
    banner_text: z.string().optional(),
    banner_color: z.string().optional(),
    referral_reward_value: z.number().optional(),
    announcement_title: z.string().optional(),
    announcement_body: z.string().optional(),
  }).optional(),
  aiSettings: z.object({
    provider: z.string().optional(),
    model: z.string().optional(),
    apiKey: z.string().optional(),
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
  
  // Clone config and strip apiKey for security before sending to public clients
  const safeConfig = config.toObject()
  if (safeConfig.aiSettings?.apiKey) {
    safeConfig.aiSettings.apiKey = '' // Never expose the API key
  }
  
  // 3. Update Cache (we cache the safe version for public clients)
  await redis.setex(CACHE_KEY, 3600, JSON.stringify(safeConfig)) // 1 hour TTL

  sendSuccess(res, safeConfig, 'Config fetched from database')
}))

// Admin endpoint to get config details
router.get('/admin', authenticate, requireRole('admin', 'super_admin'), wrap(async (req: AuthRequest, res: Response) => {
  const config = await RemoteConfig.getGlobalConfig()
  sendSuccess(res, config, 'Admin config fetched')
}))

// Admin endpoint to update config and bust cache
router.put('/admin', authenticate, requireRole('admin', 'super_admin'), wrap(async (req: AuthRequest, res: Response) => {
  const updates = configUpdateSchema.parse(req.body)
  
  let config = await RemoteConfig.getGlobalConfig()
  
  if (updates.featureFlags) {
    config.featureFlags = { ...config.featureFlags, ...updates.featureFlags }
  }
  if (updates.dynamicConfig) {
    config.dynamicConfig = { ...config.dynamicConfig, ...updates.dynamicConfig }
  }
  if (updates.aiSettings) {
    config.aiSettings = { ...config.aiSettings, ...updates.aiSettings }
  }
  
  await config.save()

  // Immediately bust the public cache (we want public clients to fetch and cache the stripped version)
  await redis.del(CACHE_KEY)

  // Audit which sections changed (Remote Config alters the mobile app for all
  // users and holds the AI key — never record the key value itself).
  const changed = Object.keys(updates).filter((k) => (updates as any)[k] !== undefined)
  await audit({
    actor: req.user!._id as any,
    resource_type: 'remote_config',
    resource_id: config._id as any,
    action: 'updated',
    notes: `sections=${changed.join(',') || 'none'}${updates.aiSettings?.apiKey ? ' (ai apiKey rotated)' : ''}`,
  })

  logger.info(`Remote Config updated by admin ${req.user!._id}`)
  sendSuccess(res, config, 'Configuration updated successfully')
}))

export default router
