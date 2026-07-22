import { Router, Request, Response, NextFunction } from 'express'
import { RemoteConfig } from '../../models/RemoteConfig'
import { authenticate, requireRole, ADMIN_ROLES, AuthRequest } from '../../middleware/authMongo'
import { sendSuccess } from '../../utils/response'
import redis from '../../config/redis'
import { audit } from '../../models/AuditLog'
import { z } from 'zod'
import { logger } from '../../utils/logger'
import { redactSecrets } from '../../utils/redactSecrets'
import { isEncryptionConfigured } from '../../utils/crypto/secretBox'
import { PROVIDER_NAMES, ProviderName } from '../../models/AIProviderCredential'
import {
  getAllCredentialStatuses, setProviderKey, deleteProviderKey,
} from '../../services/ai/credentialService'

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
    visionModel: z.string().optional(),
    baseUrl: z.string().optional(),
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

// Admin endpoint to get config details.
//
// Previously returned the raw document including aiSettings.apiKey in
// plaintext. Key material now has no read path at all: credential presence is
// reported separately via /admin/ai/credentials, value never included.
router.get('/admin', authenticate, requireRole('admin', 'super_admin'), wrap(async (req: AuthRequest, res: Response) => {
  const config = await RemoteConfig.getGlobalConfig()
  sendSuccess(res, redactSecrets(config.toObject()), 'Admin config fetched')
}))

// Credential status for the admin UI — presence, last-4 and rotation time only.
router.get('/admin/ai/credentials', authenticate, requireRole('admin', 'super_admin'), wrap(async (_req: AuthRequest, res: Response) => {
  const statuses = await getAllCredentialStatuses(PROVIDER_NAMES)
  sendSuccess(res, { providers: statuses, encryptionConfigured: isEncryptionConfigured() })
}))

// Set or rotate a provider key. Set-only: there is no corresponding read.
router.put('/admin/ai/credentials/:provider', authenticate, requireRole('super_admin'), wrap(async (req: AuthRequest, res: Response) => {
  const provider = req.params.provider as ProviderName
  if (!PROVIDER_NAMES.includes(provider)) {
    return res.status(400).json({ success: false, error: 'unknown_provider', message: `Unknown provider "${provider}"` })
  }

  const parsed = z.object({ apiKey: z.string().min(8) }).safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'invalid_key', message: 'apiKey must be at least 8 characters' })
  }

  try {
    const status = await setProviderKey(provider, parsed.data.apiKey, req.user!._id as any)

    // Audit the rotation — actor and provider, never the value.
    await audit({
      actor: req.user!._id as any,
      resource_type: 'remote_config',
      resource_id: req.user!._id as any,
      action: 'updated',
      notes: `ai_credential_rotated:${provider}`,
      ip: req.ip,
    })

    return sendSuccess(res, status, 'Provider key stored')
  } catch (e) {
    logger.error('[config] failed to store provider key', { provider, error: String(e) })
    return res.status(503).json({
      success: false,
      error: 'encryption_unavailable',
      message: e instanceof Error ? e.message : 'Could not store the key',
    })
  }
}))

router.delete('/admin/ai/credentials/:provider', authenticate, requireRole('super_admin'), wrap(async (req: AuthRequest, res: Response) => {
  const provider = req.params.provider as ProviderName
  if (!PROVIDER_NAMES.includes(provider)) {
    return res.status(400).json({ success: false, error: 'unknown_provider' })
  }
  const removed = await deleteProviderKey(provider)
  await audit({
    actor: req.user!._id as any,
    resource_type: 'remote_config',
    resource_id: req.user!._id as any,
    action: 'updated',
    notes: `ai_credential_deleted:${provider}`,
    ip: req.ip,
  })
  return sendSuccess(res, { provider, removed })
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
    // An apiKey arriving here (the existing admin UI still sends one) is
    // diverted into the encrypted credential store instead of being written
    // to RemoteConfig in plaintext. Provider/model behaviour is unchanged.
    const { apiKey, ...safeAiSettings } = updates.aiSettings
    config.aiSettings = { ...config.aiSettings, ...safeAiSettings, apiKey: '' }

    if (apiKey && apiKey.trim()) {
      const targetProvider = (safeAiSettings.provider ?? config.aiSettings.provider) as ProviderName
      if (!PROVIDER_NAMES.includes(targetProvider)) {
        return res.status(400).json({
          success: false, error: 'unknown_provider',
          message: `Cannot store a key for unknown provider "${targetProvider}"`,
        })
      }
      try {
        await setProviderKey(targetProvider, apiKey, req.user!._id as any)
      } catch (e) {
        logger.error('[config] could not store provider key from aiSettings', { error: String(e) })
        return res.status(503).json({
          success: false, error: 'encryption_unavailable',
          message: e instanceof Error ? e.message : 'Could not store the key',
        })
      }
    }
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
  return sendSuccess(res, redactSecrets(config.toObject()), 'Configuration updated successfully')
}))

export default router
