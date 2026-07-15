/**
 * LB-3 regression — payment capture must be idempotent.
 * The checkout verify call and the webhook can both fire for one payment;
 * only the first pending→captured transition may run side effects.
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Payment } from '../models/Payment';
import { Notification } from '../models/Notification';
import { User } from '../models/User';
import { razorpayService } from '../services/razorpayService';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('LB-3 — idempotent payment capture', () => {
  it('captures once and notifies once even when called twice', async () => {
    const user = await User.create({ email: 'payer@t.com', name: 'Payer', role: 'client', otp_attempts: 0 });
    await Payment.create({
      user_id: user._id,
      description: 'Test payment',
      purpose: 'other',
      amount_paise: 100000,
      total_paise: 100000,
      currency: 'INR',
      status: 'pending',
      razorpay_order_id: 'order_idem_1',
      invoice_number: 'INV-TEST-1',
      invoice_url: 'https://example.com/inv.pdf', // pre-set so capture skips S3 invoice gen
    });

    // First capture — performs the transition + side effects.
    const first = await razorpayService.markCaptured('order_idem_1', 'pay_1', user._id.toString());
    expect(first).toBe(true);

    const afterFirst = await Payment.findOne({ razorpay_order_id: 'order_idem_1' });
    expect(afterFirst!.status).toBe('captured');
    const capturedAt = afterFirst!.captured_at?.getTime();

    let notifs = await Notification.countDocuments({ user_id: user._id, type: 'payment' });
    expect(notifs).toBe(1);

    // Second capture — must be a no-op (no duplicate notification, no re-capture).
    const second = await razorpayService.markCaptured('order_idem_1', 'pay_1', user._id.toString());
    expect(second).toBe(true);

    const afterSecond = await Payment.findOne({ razorpay_order_id: 'order_idem_1' });
    expect(afterSecond!.captured_at?.getTime()).toBe(capturedAt); // unchanged

    notifs = await Notification.countDocuments({ user_id: user._id, type: 'payment' });
    expect(notifs).toBe(1); // still exactly one
  });

  it('checkout verifyPayment rejects a bad signature', async () => {
    const ok = await razorpayService.verifyPayment('order_x', 'pay_x', 'not-a-valid-hmac', 'someuser');
    expect(ok).toBe(false);
  });
});
