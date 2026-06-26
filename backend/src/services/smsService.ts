import { logger } from '../utils/logger'

export const smsService = {
  async sendOTP(phone: string, otp: string): Promise<void> {
    const authKey = process.env.MSG91_AUTH_KEY
    if (!authKey) {
      // Development fallback — log OTP
      logger.info(`[DEV] OTP for ${phone}: ${otp}`)
      return
    }

    const url = 'https://api.msg91.com/api/v5/otp'
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authkey: authKey,
      },
      body: JSON.stringify({
        template_id: process.env.MSG91_TEMPLATE_ID,
        mobile: `91${phone}`,
        otp,
      }),
    })

    const data = await response.json() as unknown
    logger.info('MSG91 response:', data)
  },
}
