/**
 * Certification Body selection — verifies the four journeys:
 *   1. Sanyog Managed (default)
 *   2. I already have a Certification Body (customer_selected)
 *   3. Help me choose / Recommend (recommended, from real approved CBs only)
 *   4. Empty catalogue fallback (honest "no accredited CB")
 * Plus: approving a CB PartnerApplication materialises a live CB in the catalogue.
 */
import express, { Express } from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'test-jwt-secret-for-unit-tests';
let mongod: MongoMemoryServer;
let app: Express;
let adminToken: string, clientToken: string, otherToken: string;
let applicationId: string;
let cbApplicantId: string;

function tokenFor(userId: string, role: string) {
  return jwt.sign({ sub: userId, role, jti: `t-${role}-${Date.now()}-${Math.random()}` }, JWT_SECRET, { expiresIn: '15m' });
}

beforeAll(async () => {
  process.env.JWT_SECRET = JWT_SECRET;
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  const { User, Application, Organization } = await import('../models');

  const admin = await User.create({ email: 'admin@cb.test', name: 'Admin', role: 'admin', otp_attempts: 0 });
  const client = await User.create({ email: 'client@cb.test', name: 'Client', role: 'client', otp_attempts: 0 });
  const other = await User.create({ email: 'other@cb.test', name: 'Other', role: 'client', otp_attempts: 0 });
  const cbApplicant = await User.create({ email: 'cbapplicant@cb.test', name: 'CB Applicant', role: 'client', otp_attempts: 0 });
  cbApplicantId = String(cbApplicant._id);

  adminToken = tokenFor(String(admin._id), 'admin');
  clientToken = tokenFor(String(client._id), 'client');
  otherToken = tokenFor(String(other._id), 'client');

  // A real approved CB already in the catalogue (scoped to BIS_CRS).
  const cbOwner = await User.create({ email: 'cbowner@cb.test', name: 'CB Owner', role: 'cb', otp_attempts: 0 });
  await Organization.create({
    name: 'BIS Certified Labs Pvt Ltd', type: 'cb', owner_user_id: cbOwner._id,
    settings: { allowed_cert_types: ['BIS_CRS'] },
  });

  // The customer's draft application (BIS_CRS).
  const appDoc = await Application.create({
    application_number: 'APP-TEST-CB-1', cert_type: 'BIS_CRS', created_by: client._id,
    status: 'draft', current_stage: 'draft',
  });
  applicationId = String(appDoc._id);

  app = express();
  app.use(express.json());
  const routes = (await import('../routes/index')).default;
  app.use('/api/v2', routes);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mongod.stop();
});

describe('CB recommendation (Help me choose)', () => {
  it('explains first, then lists real CBs for the cert', async () => {
    const res = await request(app)
      .get('/api/v2/certification-bodies?cert_type=BIS_CRS')
      .set('Authorization', `Bearer ${clientToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.whyRequired).toBeTruthy();
    expect(res.body.data.factors.length).toBeGreaterThan(0);
    expect(res.body.data.available).toBe(true);
    const names = res.body.data.certificationBodies.map((c: any) => c.name);
    expect(names).toContain('BIS Certified Labs Pvt Ltd');
  });

  it('empty catalogue → honest fallback, no fabricated CBs', async () => {
    const res = await request(app)
      .get('/api/v2/certification-bodies?cert_type=CE_MARK')
      .set('Authorization', `Bearer ${clientToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.available).toBe(false);
    expect(res.body.data.certificationBodies).toHaveLength(0);
    expect(res.body.data.message).toMatch(/No accredited Certification Body/i);
  });
});

describe('CB selection on an application', () => {
  it('Sanyog Managed (default)', async () => {
    const res = await request(app)
      .put(`/api/v2/certification-bodies/application/${applicationId}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ mode: 'sanyog_managed' });
    expect(res.status).toBe(200);
    expect(res.body.data.mode).toBe('sanyog_managed');
  });

  it('I already have a CB — off-platform by name', async () => {
    const res = await request(app)
      .put(`/api/v2/certification-bodies/application/${applicationId}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ mode: 'customer_selected', name: 'My Existing CB Ltd' });
    expect(res.status).toBe(200);
    expect(res.body.data.mode).toBe('customer_selected');
    expect(res.body.data.name).toBe('My Existing CB Ltd');
  });

  it('Find a CB — choose an eligible approved CB org', async () => {
    const { Organization } = await import('../models');
    const cb: any = await Organization.findOne({ type: 'cb', 'settings.allowed_cert_types': 'BIS_CRS' });
    const res = await request(app)
      .put(`/api/v2/certification-bodies/application/${applicationId}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ mode: 'customer_selected', org_id: String(cb._id) });
    expect(res.status).toBe(200);
    expect(res.body.data.mode).toBe('customer_selected');
    expect(res.body.data.status).toBe('pending');
    expect(res.body.data.source).toBe('customer');
    expect(String(res.body.data.org_id)).toBe(String(cb._id));
  });

  it('rejects an org_id that is not a CB', async () => {
    const res = await request(app)
      .put(`/api/v2/certification-bodies/application/${applicationId}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ mode: 'customer_selected', org_id: new mongoose.Types.ObjectId().toString() });
    expect(res.status).toBe(400);
  });

  it('rejects a CB that is not eligible for this certification', async () => {
    const { User, Organization } = await import('../models');
    const owner = await User.create({ email: 'ce-cb@cb.test', name: 'CE CB', role: 'cb', otp_attempts: 0 });
    const ceCb = await Organization.create({
      name: 'CE-only Body', type: 'cb', owner_user_id: owner._id,
      settings: { allowed_cert_types: ['CE_MARK'] },
    });
    const res = await request(app)
      .put(`/api/v2/certification-bodies/application/${applicationId}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ mode: 'customer_selected', org_id: String(ceCb._id) });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/not eligible/i);
  });

  it('another user cannot set a CB on someone else’s application', async () => {
    const res = await request(app)
      .put(`/api/v2/certification-bodies/application/${applicationId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ mode: 'sanyog_managed' });
    expect(res.status).toBe(404);
  });
});

describe('Find a CB — filtering & eligibility', () => {
  it('never returns a CB that cannot issue the certification', async () => {
    // Only the BIS-scoped CB exists for BIS_CRS; a CE-only body must not appear.
    const res = await request(app)
      .get('/api/v2/certification-bodies?cert_type=BIS_CRS')
      .set('Authorization', `Bearer ${clientToken}`);
    const names = res.body.data.certificationBodies.map((c: any) => c.name);
    expect(names).toContain('BIS Certified Labs Pvt Ltd');
    expect(names).not.toContain('CE-only Body');
  });

  it('text search narrows the results', async () => {
    const hit = await request(app)
      .get('/api/v2/certification-bodies?cert_type=BIS_CRS&q=BIS%20Certified')
      .set('Authorization', `Bearer ${clientToken}`);
    expect(hit.body.data.certificationBodies.length).toBeGreaterThan(0);

    const miss = await request(app)
      .get('/api/v2/certification-bodies?cert_type=BIS_CRS&q=ZZZ-no-such-cb')
      .set('Authorization', `Bearer ${clientToken}`);
    expect(miss.body.data.certificationBodies).toHaveLength(0);
  });
});

describe('Manager review (accept / override / assign)', () => {
  it('a customer cannot review', async () => {
    const res = await request(app)
      .put(`/api/v2/certification-bodies/application/${applicationId}/review`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ action: 'accept' });
    expect(res.status).toBe(403);
  });

  it('manager accepts the customer choice', async () => {
    const res = await request(app)
      .put(`/api/v2/certification-bodies/application/${applicationId}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'accept' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('accepted');
  });

  it('override requires a reason', async () => {
    const res = await request(app)
      .put(`/api/v2/certification-bodies/application/${applicationId}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'override', name: 'Different CB' });
    expect(res.status).toBe(400);
  });

  it('manager overrides with a reason', async () => {
    const res = await request(app)
      .put(`/api/v2/certification-bodies/application/${applicationId}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'override', name: 'Preferred Partner CB', reason: 'Faster turnaround for this product.' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('overridden');
    expect(res.body.data.source).toBe('staff');
    expect(res.body.data.review_reason).toMatch(/turnaround/i);
    expect(res.body.data.name).toBe('Preferred Partner CB');
  });

  it('staff assign a CB for a Sanyog-managed application', async () => {
    const { Application, Organization } = await import('../models');
    const appDoc = await Application.create({
      application_number: 'APP-TEST-CB-2', cert_type: 'BIS_CRS',
      created_by: new mongoose.Types.ObjectId(), status: 'draft', current_stage: 'draft',
      certification_body: { mode: 'sanyog_managed', status: 'pending' },
    });
    const cb: any = await Organization.findOne({ type: 'cb', 'settings.allowed_cert_types': 'BIS_CRS' });
    const res = await request(app)
      .put(`/api/v2/certification-bodies/application/${appDoc._id}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'assign', org_id: String(cb._id) });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('accepted');
    expect(res.body.data.source).toBe('staff');
    expect(String(res.body.data.org_id)).toBe(String(cb._id));
  });
});

describe('Partner approval materialises a live CB', () => {
  it('approving a Certification Body application creates Organization(cb) + User(cb)', async () => {
    const { Organization, User } = await import('../models');
    const { PartnerApplication } = await import('../models/PartnerApplication');
    const pa = await PartnerApplication.create({
      user_id: cbApplicantId, partner_type: 'Certification Body',
      company_name: 'NewCert Assessors', contact_name: 'CB Applicant',
      email: 'cbapplicant@cb.test', phone: '+910000000000', status: 'pending',
    });

    const res = await request(app)
      .put(`/api/v2/partners/applications/${pa._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'approved' });
    expect(res.status).toBe(200);

    const org = await Organization.findOne({ type: 'cb', owner_user_id: cbApplicantId });
    expect(org).not.toBeNull();
    expect(org!.name).toBe('NewCert Assessors');

    const promoted = await User.findById(cbApplicantId);
    expect(promoted!.role).toBe('cb');
  });
});
