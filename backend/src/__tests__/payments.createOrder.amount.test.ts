/**
 * M5 — /payments/create-order must NOT trust a client-supplied amount.
 * The Razorpay order amount is derived from the server-priced quotation Payment
 * owned by the caller. Client `amount` is ignored; foreign/absent quotation rejected.
 */
import express from 'express';
import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';

const created: any[] = [];
jest.mock('razorpay', () => jest.fn().mockImplementation(() => ({
  orders: { create: jest.fn(async (opts: any) => { created.push(opts); return { id: 'order_' + created.length, amount: opts.amount, currency: opts.currency }; }) },
})));

const JWT_SECRET = 'test-jwt-secret-for-unit-tests';
let mongoServer: MongoMemoryServer;
let app: express.Application;
let userId: string, otherId: string;

beforeAll(async () => {
  process.env.JWT_SECRET = JWT_SECRET;
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-unit-tests';
  process.env.RAZORPAY_KEY_ID = 'rzp_test_x';
  process.env.RAZORPAY_KEY_SECRET = 'secret';
  process.env.NODE_ENV = 'test';
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  const { User } = await import('../models/User');
  userId = String((await User.create({ email: 'payer@t.com', name: 'P', role: 'client', otp_attempts: 0 }))._id);
  otherId = String((await User.create({ email: 'other@t.com', name: 'O', role: 'client', otp_attempts: 0 }))._id);
  app = express();
  app.use(express.json());
  const routes = (await import('../routes/index')).default;
  app.use('/api/v2', routes);
});
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mongoServer.stop();
});

const tok = (id: string) => jwt.sign({ sub: id, role: 'client', jti: 'j' + Math.random() }, JWT_SECRET, { expiresIn: '15m' });
async function makeQuotation(ownerId: string, totalPaise: number, applicationId?: Types.ObjectId) {
  const { Payment } = await import('../models/Payment');
  return Payment.create({
    user_id: new Types.ObjectId(ownerId), application_id: applicationId ?? new Types.ObjectId(),
    total_paise: totalPaise, amount_paise: totalPaise, currency: 'INR', purpose: 'application_fee',
    description: 'Quotation', status: 'pending', invoice_number: 'INV-T-' + Math.random().toString(36).slice(2),
  });
}
const createOrder = (id: string, body: any) =>
  request(app).post('/api/v2/payments/create-order').set('Authorization', `Bearer ${tok(id)}`).send(body);

describe('M5 — create-order derives amount server-side', () => {
  it('ignores the client amount and uses the quotation total', async () => {
    const q = await makeQuotation(userId, 500000);
    const res = await createOrder(userId, { payment_id: String(q._id), amount: 100 }); // client tries ₹1
    expect(res.status).toBe(200);
    expect(res.body.amount).toBe(500000);
    expect(created[created.length - 1].amount).toBe(500000);
  });

  it('resolves by application_id and uses the server amount', async () => {
    const appId = new Types.ObjectId();
    await makeQuotation(userId, 250000, appId);
    const res = await createOrder(userId, { application_id: String(appId), amount: 1 });
    expect(res.status).toBe(200);
    expect(res.body.amount).toBe(250000);
  });

  it('rejects when there is no payable quotation (no self-pricing)', async () => {
    const res = await createOrder(userId, { amount: 999999 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('no_payable_quotation');
  });

  it("cannot pay another user's quotation", async () => {
    const foreign = await makeQuotation(otherId, 700000);
    const res = await createOrder(userId, { payment_id: String(foreign._id) });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('no_payable_quotation');
  });
});
