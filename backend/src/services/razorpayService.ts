import Razorpay from 'razorpay'
import crypto from 'crypto'
import { Payment } from '../models/Payment'
import { Application } from '../models/Application'
import { User } from '../models/User'
import { notificationService } from './notificationService'
import { audit } from '../models/AuditLog'
import { logger } from '../utils/logger'

// Lazily construct the client so importing this module never silently falls back
// to a placeholder key. Missing keys are caught at boot by validateEnv(); if a
// call still slips through without keys, it throws a clear error instead.
let _razorpay: Razorpay | null = null
function razorpayClient(): Razorpay {
  if (!_razorpay) {
    const key_id = process.env.RAZORPAY_KEY_ID
    const key_secret = process.env.RAZORPAY_KEY_SECRET
    if (!key_id || !key_secret) {
      throw new Error('Razorpay is not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing)')
    }
    _razorpay = new Razorpay({ key_id, key_secret })
  }
  return _razorpay
}

export const razorpayService = {
  async createOrder(
    userId: string,
    applicationId: string | null,
    totalPaise: number,
    description: string,
    currency: 'INR' | 'USD' | 'AED' | 'EUR' = 'INR',
    breakdown?: {
      gov_fee_paise: number,
      lab_fee_paise: number,
      consultancy_fee_paise: number,
      tax_amount_paise: number,
      tax_rate: number,
      subtotal_paise: number
    },
    purpose: 'application_fee' | 'expedited_fee' | 'renewal_fee' | 'subscription' | 'other' = 'other'
  ) {
    const order = await razorpayClient().orders.create({
      amount: totalPaise,
      currency: currency,
      notes: {
        userId,
        applicationId: applicationId ?? '',
        description,
      },
    })

    const user = await User.findById(userId)
    const orgId = user?.org_id || undefined

    const invNum = `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`
    
    const payment = await Payment.create({
      org_id: orgId,
      user_id: userId,
      application_id: applicationId || undefined,
      amount_paise: breakdown ? breakdown.subtotal_paise : totalPaise,
      total_paise: totalPaise,
      tax_amount_paise: breakdown ? breakdown.tax_amount_paise : 0,
      tax_rate: breakdown ? breakdown.tax_rate : 0,
      gov_fee_paise: breakdown ? breakdown.gov_fee_paise : 0,
      lab_fee_paise: breakdown ? breakdown.lab_fee_paise : 0,
      consultancy_fee_paise: breakdown ? breakdown.consultancy_fee_paise : 0,
      currency: currency,
      description,
      purpose,
      invoice_number: invNum,
      razorpay_order_id: order.id,
      status: 'pending',
    })

    return { order, payment }
  },

  /**
   * Checkout-flow verification: the client returns the order/payment/signature
   * from Razorpay Checkout. We recompute the HMAC(order|payment) and, if valid,
   * capture idempotently.
   */
  async verifyPayment(orderId: string, paymentId: string, signature: string, userId: string): Promise<boolean> {
    const body = `${orderId}|${paymentId}`
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET ?? '')
      .update(body)
      .digest('hex')

    if (expected !== signature) {
      logger.warn(`Razorpay signature mismatch for order ${orderId}`)
      return false
    }

    return this.markCaptured(orderId, paymentId, userId, signature)
  },

  /**
   * Idempotent capture. Only the atomic pending→captured transition runs the
   * side effects (invoice + notification), so the checkout verify call and the
   * webhook can both fire without double-notifying or re-capturing a refund.
   */
  async markCaptured(orderId: string, paymentId: string, userId?: string, signature?: string): Promise<boolean> {
    const set: Record<string, unknown> = {
      status: 'captured',
      razorpay_payment_id: paymentId,
      captured_at: new Date(),
    }
    if (signature) set.razorpay_signature = signature

    // Atomic guard: matches only while still pending. Under a race, exactly one
    // caller gets modifiedCount === 1; everyone else is a no-op.
    const result = await Payment.updateOne(
      { razorpay_order_id: orderId, status: 'pending' },
      { $set: set }
    )

    const payment = await Payment.findOne({ razorpay_order_id: orderId })
    if (!payment) {
      logger.warn(`markCaptured: no payment for order ${orderId}`)
      return false
    }
    // Already captured earlier → idempotent no-op (no duplicate side effects).
    if (result.modifiedCount === 0) return true

    // Mark the linked application's fee as paid so the issuance payment-gate
    // (fee.base_inr > 0 && !fee.paid) is satisfied. Idempotent; only touches the
    // application this payment was raised against.
    if (payment.application_id) {
      await Application.updateOne(
        { _id: payment.application_id },
        { $set: { 'fee.paid': true, 'fee.payment_id': payment._id, updated_at: new Date() } }
      )
    }

    const resolvedUserId = userId || payment.user_id?.toString()

    // Generate the invoice once.
    try {
      if (!payment.invoice_url && resolvedUserId) {
        const user = await User.findById(resolvedUserId)
        if (user) {
          const { generateInvoicePDF } = require('./invoiceService')
          const url = await generateInvoicePDF(payment, user)
          await Payment.updateOne({ _id: payment._id }, { $set: { invoice_url: url } })
        }
      }
    } catch (err) {
      logger.error('Failed to generate PDF invoice:', err)
    }

    // Notify once.
    if (resolvedUserId) {
      await notificationService.notify(
        resolvedUserId,
        'Payment Successful',
        'Your payment has been processed successfully.',
        'payment'
      )
    }

    // Audit the money-movement event (financial governance).
    await audit({
      actor: resolvedUserId ? (payment.user_id as any) : null,
      org_id: payment.org_id as any,
      resource_type: 'payment',
      resource_id: payment._id as any,
      action: 'payment_received',
      notes: `order=${orderId} payment=${paymentId} total_paise=${payment.total_paise} ${payment.currency}`,
    })

    return true
  },

  async handleWebhook(payload: string, signature: string): Promise<boolean> {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET ?? ''
    if (!webhookSecret || !signature) return false
    return Razorpay.validateWebhookSignature(payload, signature, webhookSecret) === true
  },
}
