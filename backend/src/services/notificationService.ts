import { User } from '../models/User'
import { Notification } from '../models/Notification'
import { logger } from '../utils/logger'

interface ExpoMessage {
  to: string
  sound: string
  title: string
  body: string
  data: Record<string, unknown>
  priority: string
}

export const notificationService = {
  async sendPush(userId: string, title: string, body: string, data?: Record<string, unknown>): Promise<void> {
    try {
      const user = await User.findById(userId).select('expo_push_tokens')
      if (!user || !user.expo_push_tokens || user.expo_push_tokens.length === 0) return

      const messages: ExpoMessage[] = user.expo_push_tokens.map(token => ({
        to: token,
        sound: 'default',
        title,
        body,
        data: data ?? {},
        priority: 'high',
      }))

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      })

      const responseData = await response.json() as unknown
      logger.info(`Push sent to user ${userId}: ${title}`, responseData)
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
      await Notification.create({
        user_id: userId,
        title,
        body,
        type,
        data: metadata ?? {},
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
    await Promise.all([
      this.sendPush(userId, title, body, data),
      this.saveToDatabase(userId, title, body, type, data),
    ])
  },
}
