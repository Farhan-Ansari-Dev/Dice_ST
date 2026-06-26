import Razorpay from 'razorpay'
import crypto from 'crypto'
import { Payment } from '../models/Payment'
import { User } from '../models/User'
import { notificationService } from './notificationService'
import { logger } from '../utils/logger'

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID ?? 'rzp_test_placeholder',
  key_secret: process.env.RAZORPAY_KEY_SECRET ?? 'placeholder',
})

export const razorpayService = {
  async createOrder(
    userId: string, 
    applicationId: string | null, 
    totalPaise: number, 
    description: string,
    currency: 'INR' | 'USD' = 'INR',
    breakdown?: {
      gov_fee_paise: number,
      lab_fee_paise: number,
      consultancy_fee_paise: number,
      tax_amount_paise: number,
      tax_rate: number,
      subtotal_paise: number
    }
  ) {
    const order = await razorpay.orders.create({
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
      purpose: 'other',
      invoice_number: invNum,
      razorpay_order_id: order.id,
      status: 'pending',
    })

    return { order, payment }
  },

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

    const payment = await Payment.findOne({ razorpay_order_id: orderId });
    if (!payment) return false;

    let invoice_url = payment.invoice_url;
    try {
      const user = await User.findById(userId);
      if (user && !invoice_url) {
        const { generateInvoicePDF } = require('./invoiceService');
        invoice_url = await generateInvoicePDF(payment, user);
      }
    } catch (err) {
      logger.error('Failed to generate PDF invoice:', err);
    }

    await Payment.updateOne(
      { razorpay_order_id: orderId },
      { 
        $set: { 
          status: 'captured', 
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
          invoice_url: invoice_url,
          captured_at: new Date() 
        } 
      }
    )

    await notificationService.notify(
      userId,
      'Payment Successful',
      'Your payment has been processed successfully.',
      'payment'
    )

    return true
  },

  async handleWebhook(payload: string, signature: string): Promise<boolean> {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET ?? ''
    try {
      Razorpay.validateWebhookSignature(payload, signature, webhookSecret)
      return true
    } catch {
      return false
    }
  },
}
