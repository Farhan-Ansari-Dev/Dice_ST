/**
 * POST /leads — enquiry intake auto-creates a linked Draft Application.
 *
 * The Lead is the internal CRM record; when the intake carries enough to start
 * one (a catalog product + a cert type) the customer immediately gets a Draft
 * Application, linked back via lead.converted_application_id. Reuses the single
 * createDraftApplication path shared with POST /applications.
 */
import express from 'express';
import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'test-jwt-secret-for-unit-tests';
let mongoServer: MongoMemoryServer;
let app: express.Application;
let clientToken: string;
let clientId: Types.ObjectId;
let productId: Types.ObjectId;

beforeAll(async () => {
  process.env.JWT_SECRET = JWT_SECRET;
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-unit-tests';
  process.env.NODE_ENV = 'test';
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  const { User, Product } = await import('../models');
  const client = await User.create({ email: 'c@sanyog.test', name: 'Client', role: 'client', otp_attempts: 0 });
  clientId = client._id as Types.ObjectId;
  clientToken = jwt.sign({ sub: String(client._id), role: 'client', jti: 'c-' + Date.now() }, JWT_SECRET, { expiresIn: '15m' });
  const product = await Product.create({ name: 'Air Fryer', category: 'Electronics' });
  productId = product._id as Types.ObjectId;

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

const enquiry = (extra: Record<string, unknown>) => ({
  serviceId: 'bis',
  serviceName: 'BIS Certification',
  contactName: 'Farhan',
  contactEmail: 'c@sanyog.test',
  productDescription: 'LED bulb',
  targetMarkets: ['IN'],
  ...extra,
});

describe('POST /leads — draft application auto-creation', () => {
  it('creates a Lead AND a linked Draft Application when product_id + cert_type are supplied', async () => {
    const res = await request(app)
      .post('/api/v2/leads')
      .set('Authorization', `Bearer ${clientToken}`)
      .send(enquiry({ product_id: String(productId), cert_type: 'BIS' }));

    expect(res.status).toBe(201);
    expect(res.body.data._id).toBeTruthy();                       // the Lead
    expect(res.body.application).toBeTruthy();                    // the Draft Application
    expect(res.body.application.status).toBe('draft');
    expect(res.body.application.product_status).toBe('validated');
    expect(res.body.application.cert_type).toBe('BIS');
    expect(String(res.body.application.created_by)).toBe(String(clientId));
    // Lead is linked to the application (internal CRM ↔ customer-facing app)
    expect(String(res.body.data.converted_application_id)).toBe(String(res.body.application._id));
  });

  it('the draft appears in the customer\'s own applications list', async () => {
    const res = await request(app).get('/api/v2/applications').set('Authorization', `Bearer ${clientToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.some((a: any) => a.status === 'draft' && a.cert_type === 'BIS')).toBe(true);
  });

  it('captures a Lead only (no application, no throw) when there is not enough to start one', async () => {
    const res = await request(app)
      .post('/api/v2/leads')
      .set('Authorization', `Bearer ${clientToken}`)
      .send(enquiry({})); // no product_id / cert_type

    expect(res.status).toBe(201);
    expect(res.body.data._id).toBeTruthy();
    expect(res.body.application ?? null).toBeNull();
  });

  it('still creates a Draft Application (pending_validation) when the product cannot be resolved', async () => {
    const res = await request(app)
      .post('/api/v2/leads')
      .set('Authorization', `Bearer ${clientToken}`)
      .send(enquiry({ product_id: '000000000000000000000000', cert_type: 'BIS' }));

    expect(res.status).toBe(201);
    expect(res.body.data._id).toBeTruthy();                              // Lead
    expect(res.body.application).toBeTruthy();                           // draft still created — lifecycle never diverges
    expect(res.body.application.product_status).toBe('pending_validation');
    expect(res.body.application.product_id ?? null).toBeNull();          // manager validates later
    expect(res.body.application.status).toBe('draft');
  });

  it('a Draft Application is also created when a cert_type is given without any product_id', async () => {
    const res = await request(app)
      .post('/api/v2/leads')
      .set('Authorization', `Bearer ${clientToken}`)
      .send(enquiry({ cert_type: 'EPR' })); // no product_id at all

    expect(res.status).toBe(201);
    expect(res.body.application).toBeTruthy();
    expect(res.body.application.product_status).toBe('pending_validation');
    expect(res.body.application.cert_type).toBe('EPR');
  });
});
