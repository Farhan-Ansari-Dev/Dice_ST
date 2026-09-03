import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'

export class AppError extends Error {
  statusCode: number
  isOperational: boolean
  constructor(message: string, statusCode = 400) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = true
    Error.captureStackTrace(this, this.constructor)
  }
}

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(`${err.message} — ${req.method} ${req.path}`, { stack: err.stack })

  if (err.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: err.errors })
  }
  if (err.name === 'CastError') {
    // Malformed ObjectId or similar — client error, not a server fault
    return res.status(400).json({ success: false, message: 'Invalid identifier' })
  }
  if (err.code === 11000) {
    // Mongo duplicate key
    return res.status(409).json({ success: false, message: 'Resource already exists' })
  }
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token' })
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired' })
  }
  if (err.code === '23505') {
    return res.status(409).json({ success: false, message: 'Resource already exists' })
  }
  if (err.code === '23503') {
    return res.status(404).json({ success: false, message: 'Referenced resource not found' })
  }

  // AI features fail loudly rather than returning fabricated compliance data.
  // Handled here so every route that touches AI (ai.ts, insights.ts) reports
  // the same recognisable shape without duplicating the check.
  if (err?.name === 'AIUnavailableError') {
    return res.status(503).json({ success: false, error: 'ai_unavailable', message: err.message })
  }

  // User has not given (current) consent to third-party AI processing. Machine-
  // readable so the client can present the consent prompt (App Store 5.1.1(i)).
  if (err?.name === 'AiConsentRequiredError') {
    return res.status(403).json({ success: false, error: 'ai_consent_required', message: err.message })
  }

  // Provider reachable but the payload was unreadable — retryable, and a
  // different operator action from "no key configured".
  if (err?.name === 'AIResponseError') {
    return res.status(502).json({ success: false, error: 'ai_response_invalid', message: err.message })
  }

  const statusCode = err.statusCode ?? err.status ?? 500
  // Operational (4xx) errors carry their message; unexpected 5xx errors must not
  // leak internals in production (stack details are in the server log above).
  const message =
    statusCode < 500 || process.env.NODE_ENV !== 'production'
      ? err.message || 'Internal server error'
      : 'Internal server error'
  return res.status(statusCode).json({ success: false, message, timestamp: new Date().toISOString() })
}
