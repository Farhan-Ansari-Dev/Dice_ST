/**
 * Legacy notification adapter.
 *
 * Historically this held its own Expo `fetch`-based push sender. It now delegates
 * to the unified notify() so there is a SINGLE push transport (AWS SNS). The
 * public shape (sendPush / saveToDatabase / notify) is preserved so existing call
 * sites compile and behave the same — plus they now also record an in-app inbox
 * entry (accepted behavior change). Errors are swallowed, matching prior behavior.
 *
 * Delegations are constrained to ['in_app', 'push'] to avoid introducing new
 * email/SMS sends at legacy call sites.
 */
import { logger } from '../utils/logger'
import { notify as notifyUnified } from './notifications'

export const notificationService = {
  async sendPush(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    try {
      await notifyUnified({
        user_id: userId,
        type: (data?.type as string) ?? 'system',
        title,
        body,
        data: data as Record<string, any> | undefined,
        channels: ['in_app', 'push'],
      })
    } catch (err) {
      logger.error(`Failed to send push notification to user ${userId}`, err)
    }
  },

  async saveToDatabase(
    userId: string,
    title: string,
    body: string,
    type: string = 'system',
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      await notifyUnified({
        user_id: userId,
        type,
        title,
        body,
        data: metadata as Record<string, any> | undefined,
        channels: ['in_app'],
      })
    } catch (err) {
      logger.error(`Failed to save notification for user ${userId}`, err)
    }
  },

  async notify(
    userId: string,
    title: string,
    body: string,
    type: string = 'system',
    data?: Record<string, unknown>
  ): Promise<void> {
    try {
      await notifyUnified({
        user_id: userId,
        type,
        title,
        body,
        data: data as Record<string, any> | undefined,
        channels: ['in_app', 'push'],
      })
    } catch (err) {
      logger.error(`Failed to notify user ${userId}`, err)
    }
  },
}
