import { notificationService } from '../services/notificationService'
import { logger } from '../utils/logger'
import { Certification } from '../models/Certification'
import { Application } from '../models/Application'
import { User } from '../models/User'

/**
 * Checks for certificates expiring in 30, 7, and 1 day(s)
 * and sends push + in-app notifications to the certificate owner.
 */
export async function runExpiryReminders(): Promise<void> {
  const thresholds = [
    { days: 30, urgency: 'warning', emoji: '⚠️' },
    { days: 7,  urgency: 'urgent',  emoji: '🔴' },
    { days: 1,  urgency: 'critical', emoji: '🚨' },
  ]

  for (const { days, urgency, emoji } of thresholds) {
    try {
      const targetDate = new Date()
      targetDate.setDate(targetDate.getDate() + days)
      
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0))
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999))

      const certs = await Certification.find({
        status: 'active',
        expiry_date: { $gte: startOfDay, $lte: endOfDay }
      }).populate('product_id', 'name').populate('org_id')

      for (const cert of certs) {
        const product: any = cert.product_id
        const productName = product ? product.name : 'Unknown Product'

        const admins = await User.find({ org_id: cert.org_id, role: 'admin', is_active: true })
        if (!admins.length) continue

        const title = `${emoji} Certificate Expiring in ${days} Day${days > 1 ? 's' : ''}`
        const body = `${cert.cert_type} for "${productName}" (${cert.cert_number ?? 'pending'}) expires on ${new Date(cert.expiry_date!).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}. Initiate renewal now to avoid disruption.`

        for (const admin of admins) {
          await notificationService.notify(
            admin._id.toString(),
            title,
            body,
            'expiry_reminder',
            { certId: cert._id.toString(), urgency, daysLeft: days }
          )
          logger.info(`Expiry reminder sent: ${cert.cert_type} → ${admin.email} (${days}d)`)
        }
      }

      if (certs.length > 0) {
        logger.info(`Expiry reminders: ${certs.length} certs expiring in ${days} days`)
      }
    } catch (err) {
      logger.error(`Expiry reminder error (${days}d):`, err)
    }
  }
}

/**
 * Also checks for applications that have been stale for >14 days
 */
export async function runStaleApplicationCheck(): Promise<void> {
  try {
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

    const apps = await Application.find({
      status: { $in: ['submitted', 'docs_review', 'docs_required'] },
      updated_at: { $lt: fourteenDaysAgo }
    })

    for (const app of apps) {
      const admins = await User.find({ org_id: app.org_id, role: 'admin', is_active: true })
      
      for (const admin of admins) {
        await notificationService.notify(
          admin._id.toString(),
          '📋 Application Needs Attention',
          `Your ${app.cert_type} application (${app.application_number}) hasn't been updated in over 2 weeks. Check the status or contact your assigned manager.`,
          'application_stale',
          { applicationId: app._id.toString() }
        )
      }
    }

    if (apps.length > 0) {
      logger.info(`Stale application reminders: ${apps.length} apps`)
    }
  } catch (err) {
    logger.error('Stale application check error:', err)
  }
}
