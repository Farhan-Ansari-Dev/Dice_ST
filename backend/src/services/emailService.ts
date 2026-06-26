import nodemailer from 'nodemailer'
import { logger } from '../utils/logger'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT ?? '587'),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
})

export const emailService = {
  async sendOTP(email: string, otp: string): Promise<void> {
    const html = `
      <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; background: #0A0B0F; color: #fff; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #6C63FF, #9B59B6); padding: 32px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 800;">Sanyog Conformity</h1>
          <p style="margin: 8px 0 0; opacity: 0.8; font-size: 14px;">Your sign-in verification code</p>
        </div>
        <div style="padding: 40px; text-align: center;">
          <p style="color: #8B92A5; font-size: 14px; margin: 0 0 24px;">Use this OTP to sign in to your account. Valid for 10 minutes.</p>
          <div style="background: #1A1D2E; border: 1px solid #2A2D3E; border-radius: 12px; padding: 24px; margin: 0 auto; display: inline-block;">
            <span style="font-size: 36px; font-weight: 800; letter-spacing: 12px; color: #6C63FF;">${otp}</span>
          </div>
          <p style="color: #5A6075; font-size: 12px; margin: 24px 0 0;">If you didn't request this, please ignore this email.</p>
        </div>
        <div style="background: #12141A; padding: 16px; text-align: center;">
          <p style="color: #5A6075; font-size: 11px; margin: 0;">© 2025 Sanyog Conformity Solutions. All rights reserved.</p>
        </div>
      </div>
    `
    try {
      await transporter.sendMail({
        from: `"Sanyog Conformity" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `${otp} — Your Sanyog sign-in code`,
        html,
      })
      logger.info(`OTP email sent to ${email}`)
    } catch (err) {
      logger.error(`Failed to send OTP email to ${email}:`, err)
      // In development, log the OTP to console
      if (process.env.NODE_ENV === 'development') logger.info(`[DEV] OTP for ${email}: ${otp}`)
    }
  },

  async sendCertificationExpiry(email: string, certNumber: string, expiryDate: string, daysLeft: number): Promise<void> {
    await transporter.sendMail({
      from: `"Sanyog Conformity" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `⚠️ Certificate ${certNumber} expires in ${daysLeft} days`,
      html: `<p>Your certificate <strong>${certNumber}</strong> expires on ${expiryDate}. Please initiate renewal.</p>`,
    })
  },
}
