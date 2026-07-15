import { Router, Request, Response, NextFunction } from 'express'
import { authenticate, AuthRequest } from '../../middleware/authMongo'
import { authorize } from '../../middleware/authorize'
import { Payment } from '../../models/Payment'
import { User } from '../../models/User'
import { razorpayService } from '../../services/razorpayService'
import { sendSuccess } from '../../utils/response'
import { calculateQuotation } from '../../services/paymentService'

const router = Router()
const wrap = (fn: any) => (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next)

router.get('/', authenticate, authorize(['admin','super_admin','employee','consultant','cb','lab','ib','viewer']), wrap(async (req: AuthRequest, res: Response) => {
  const query: any = {}
  if (req.user!.role !== 'admin' && req.user!.role !== 'super_admin') {
    query.org_id = req.user!.org_id
  }
  const payments = await Payment.find(query).populate('user_id', 'name email').populate('org_id', 'name').sort({ created_at: -1 }).lean()
  sendSuccess(res, payments)
}))

router.get('/:id', authenticate, authorize(['admin','super_admin','employee','consultant','cb','lab','ib','viewer']), wrap(async (req: AuthRequest, res: Response) => {
  const payment = await Payment.findOne({ _id: req.params.id, org_id: req.user!.org_id }).lean()
  sendSuccess(res, payment)
}))



// Create a Razorpay order / Quotation
router.post('/quotations', authenticate, authorize(['admin','super_admin','employee']), wrap(async (req: AuthRequest, res: Response) => {
  const { application_id, gov_fee, lab_fee } = req.body;

  // Use the new service for consistent fee logic and consultancy fee handling
  const { totalPaise, breakdown, currency } = await calculateQuotation(req.user!, {
    application_id,
    gov_fee,
    lab_fee,
  });

  const result = await razorpayService.createOrder(
    req.user!._id.toString(),
    application_id,
    totalPaise,
    'Certification Fees & Sanyog Consultancy',
    currency as 'INR' | 'USD',
    breakdown
  );

  sendSuccess(res, result.payment, 'Quotation generated successfully', 201);
  return;
}));

router.post('/create-order', authenticate, wrap(async (req: AuthRequest, res: Response) => {
  const { amount, currency, receipt } = req.body
  
  if (!amount || amount < 100) {
    return res.status(400).json({ success: false, message: 'Minimum amount is 100 paise' })
  }

  try {
    const result = await razorpayService.createOrder(
      req.user!._id.toString(),
      null, // applicationId not strictly needed for generic checkout
      amount, // amount is already in paise
      receipt || 'Standard Checkout'
    )
    
    // The user's prompt expects { order_id, amount, currency }
    return res.json({
      success: true,
      order_id: result.order.id,
      amount: result.order.amount,
      currency: result.order.currency
    })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to create order' })
  }
}))

router.post('/verify-payment', authenticate, authorize(['admin','super_admin','employee']), wrap(async (req: AuthRequest, res: Response) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ success: false, message: 'Missing payment signature fields' })
  }

  const isValid = await razorpayService.verifyPayment(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    req.user!._id.toString()
  )

  if (!isValid) {
    return res.status(400).json({ success: false, message: 'Payment verification failed' })
  }

  return res.json({ success: true, message: 'Payment verified successfully' })
}))

router.post('/verify', authenticate, wrap(async (req: AuthRequest, res: Response) => {
  const { order_id, payment_id, signature } = req.body

  if (!order_id || !payment_id || !signature) {
    return res.status(400).json({ success: false, message: 'Missing payment signature fields' })
  }

  const isValid = await razorpayService.verifyPayment(
    order_id,
    payment_id,
    signature,
    req.user!._id.toString()
  )

  if (!isValid) {
    return res.status(400).json({ success: false, message: 'Payment verification failed' })
  }

  const payment = await Payment.findOne({ razorpay_order_id: order_id })
  return res.json({ success: true, data: payment, message: 'Payment verified successfully' })
}))

router.post('/webhook', wrap(async (req: Request, res: Response) => {
  const signature = req.headers['x-razorpay-signature'] as string
  // Validate over the RAW bytes Razorpay signed, not a re-serialized JSON.
  const payload = (req as any).rawBody
    ? (req as any).rawBody.toString('utf8')
    : JSON.stringify(req.body)

  const isValid = await razorpayService.handleWebhook(payload, signature)
  if (!isValid) {
    return res.status(400).json({ success: false, message: 'Invalid signature' })
  }

  const event = req.body.event
  if (event === 'payment.captured' || event === 'payment.authorized') {
    const entity = req.body?.payload?.payment?.entity
    const paymentId = entity?.id
    const orderId = entity?.order_id
    const userId = entity?.notes?.userId
    // The webhook signature already authenticated this event, so capture directly
    // and idempotently — no checkout-signature re-verification (which would fail).
    if (orderId && paymentId) {
      await razorpayService.markCaptured(orderId, paymentId, userId)
    }
  }

  return res.json({ success: true })
}))

// New endpoint to fetch/generate invoice URL
router.get('/:id/invoice', authenticate, authorize(['admin','super_admin','employee']), wrap(async (req: AuthRequest, res: Response) => {
  const payment = await Payment.findById(req.params.id).populate('user_id')
  if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' })
  if (!payment.invoice_url) {
    const { generateInvoicePDF } = await import('../../services/invoiceService')
    const user = await User.findById(payment.user_id)
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })
    const url = await generateInvoicePDF(payment, user)
    payment.invoice_url = url
    await payment.save()
  }
  return res.json({ success: true, invoice_url: payment.invoice_url })
}))

export default router
