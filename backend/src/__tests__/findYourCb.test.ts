/**
 * Find Your CB — matching engine + CB request lifecycle.
 * Verifies: hard eligibility filters EXCLUDE (not down-rank), deterministic
 * scoring + reasons, verified/accreditation effects, ownership scoping,
 * duplicate protection, and that internal notes never reach the customer.
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
let alphaId: string, gammaId: string;

const tokenFor = (userId: string, role: string) =>
  jwt.sign({ sub: userId, role, jti: `t-${role}-${Date.now()}-${Math.random()}` }, JWT_SECRET, { expiresIn: '15m' });

beforeAll(async () => {
  process.env.JWT_SECRET = JWT_SECRET;
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  const { User, Organization, Accreditation, CertificationBodyScope } = await import('../models');

  const admin = await User.create({ email: 'admin@fcb.test', name: 'Admin', role: 'admin', otp_attempts: 0 });
  const client = await User.create({ email: 'client@fcb.test', name: 'Client', role: 'client', otp_attempts: 0 });
  const other = await User.create({ email: 'other@fcb.test', name: 'Other', role: 'client', otp_attempts: 0 });
  adminToken = tokenFor(String(admin._id), 'admin');
  clientToken = tokenFor(String(client._id), 'client');
  otherToken = tokenFor(String(other._id), 'client');

  const owner = await User.create({ email: 'cbowner@fcb.test', name: 'Owner', role: 'cb', otp_attempts: 0 });
  const acc = await Accreditation.create({ name: 'National Accreditation Board', code: 'NABCB', status: 'active' });

  // Alpha — verified, SA+AE, Electronics, accredited → best match.
  const alpha = await Organization.create({
    name: 'Alpha Certifiers', type: 'cb', owner_user_id: owner._id,
    settings: { allowed_cert_types: ['BIS_CRS'] },
    cb_verification: { status: 'verified', checks: { organization: true, accreditation: true, scope: true, contact: true }, verified_at: new Date() },
  });
  alphaId = String(alpha._id);
  await CertificationBodyScope.create({
    certification_body_id: alpha._id, cert_type: 'BIS_CRS', status: 'active',
    markets: ['SA', 'AE'], product_categories: ['Electronics'], accreditation_id: acc._id,
  });

  // Beta — BIS but only AE market (explicitly NOT SA) → excluded when market=SA.
  const beta = await Organization.create({
    name: 'Beta Testing House', type: 'cb', owner_user_id: owner._id,
    settings: { allowed_cert_types: ['BIS_CRS'] },
  });
  await CertificationBodyScope.create({
    certification_body_id: beta._id, cert_type: 'BIS_CRS', status: 'active',
    markets: ['AE'], product_categories: ['Electronics'],
  });

  // Gamma — SA but no accreditation → included normally, excluded when accreditation required.
  const gamma = await Organization.create({
    name: 'Gamma CB', type: 'cb', owner_user_id: owner._id,
    settings: { allowed_cert_types: ['BIS_CRS'] },
  });
  gammaId = String(gamma._id);
  await CertificationBodyScope.create({
    certification_body_id: gamma._id, cert_type: 'BIS_CRS', status: 'active',
    markets: ['SA'], product_categories: ['Electronics'],
  });

  // Delta — different certification entirely → excluded by the hard cert filter.
  await Organization.create({
    name: 'Delta CE Body', type: 'cb', owner_user_id: owner._id,
    settings: { allowed_cert_types: ['CE_MARK'] },
  });

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

describe('Matching engine — hard filters exclude ineligible CBs', () => {
  it('scores eligible CBs, excludes wrong-cert and market-unsupported bodies', async () => {
    const res = await request(app)
      .get('/api/v2/certification-bodies/match?cert_type=BIS_CRS&market=SA&product_category=Electronics')
      .set('Authorization', `Bearer ${clientToken}`);
    expect(res.status).toBe(200);
    const names = res.body.data.certificationBodies.map((c: any) => c.name);
    expect(names).toContain('Alpha Certifiers');
    expect(names).toContain('Gamma CB');
    expect(names).not.toContain('Beta Testing House');   // SA not in its scope
    expect(names).not.toContain('Delta CE Body');        // wrong certification
    // Alpha (verified + accredited) ranks above Gamma, and is first (score desc).
    expect(res.body.data.certificationBodies[0].name).toBe('Alpha Certifiers');
    const alpha = res.body.data.certificationBodies.find((c: any) => c.name === 'Alpha Certifiers');
    expect(alpha.match_score).toBeGreaterThan(0);
    expect(alpha.verified).toBe(true);
    expect(alpha.match_reasons.some((r: any) => r.key === 'market' && r.satisfied)).toBe(true);
    expect(alpha.match_reasons.some((r: any) => r.key === 'accreditation' && r.satisfied)).toBe(true);
    // Deterministic: Alpha outranks Gamma.
    const gamma = res.body.data.certificationBodies.find((c: any) => c.name === 'Gamma CB');
    expect(alpha.match_score).toBeGreaterThan(gamma.match_score);
  });

  it('mandatory accreditation excludes a CB with none (not merely lower)', async () => {
    const res = await request(app)
      .get('/api/v2/certification-bodies/match?cert_type=BIS_CRS&market=SA&require_accreditation=true')
      .set('Authorization', `Bearer ${clientToken}`);
    const names = res.body.data.certificationBodies.map((c: any) => c.name);
    expect(names).toContain('Alpha Certifiers');
    expect(names).not.toContain('Gamma CB');
  });

  it('no matches → honest empty result, never a fabricated CB', async () => {
    // No CB is scoped for UL_LISTING → hard cert filter leaves zero candidates.
    const res = await request(app)
      .get('/api/v2/certification-bodies/match?cert_type=UL_LISTING&market=SA')
      .set('Authorization', `Bearer ${clientToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.available).toBe(false);
    expect(res.body.data.certificationBodies).toHaveLength(0);
    expect(res.body.data.message).toMatch(/No certification bodies/i);
  });

  it('requires cert_type (or application_id)', async () => {
    const res = await request(app).get('/api/v2/certification-bodies/match').set('Authorization', `Bearer ${clientToken}`);
    expect(res.status).toBe(400);
  });
});

describe('CB requests — ownership, duplicate protection, internal notes', () => {
  let requestId: string;

  it('a customer creates a request', async () => {
    const res = await request(app)
      .post('/api/v2/cb-requests')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ certification_body_id: alphaId, cert_type: 'BIS_CRS', market: 'SA', message: 'Please quote.' });
    expect(res.status).toBe(201);
    expect(res.body.data.request_number).toMatch(/^CBR-\d{4}-\d{5}$/);
    expect(res.body.data.status).toBe('submitted');
    expect(res.body.data.internal_notes).toBeUndefined();
    requestId = res.body.data._id;
  });

  it('blocks a duplicate active request for the same CB/cert/market', async () => {
    const res = await request(app)
      .post('/api/v2/cb-requests')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ certification_body_id: alphaId, cert_type: 'BIS_CRS', market: 'SA' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('duplicate_request');
    expect(res.body.data.request_number).toMatch(/^CBR-/);
  });

  it('another customer cannot read the request', async () => {
    const res = await request(app).get(`/api/v2/cb-requests/${requestId}`).set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(404);
  });

  it('admin sets status + internal notes; the customer never sees internal notes', async () => {
    const upd = await request(app)
      .patch(`/api/v2/cb-requests/${requestId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'sent_to_cb', internal_notes: 'emailed the CB desk' });
    expect(upd.status).toBe(200);
    expect(upd.body.data.status).toBe('sent_to_cb');

    const asCustomer = await request(app).get(`/api/v2/cb-requests/${requestId}`).set('Authorization', `Bearer ${clientToken}`);
    expect(asCustomer.status).toBe(200);
    expect(asCustomer.body.data.internal_notes).toBeUndefined();
    expect(asCustomer.body.data.status).toBe('sent_to_cb');
  });

  it('a non-staff user cannot use the staff update route', async () => {
    const res = await request(app)
      .patch(`/api/v2/cb-requests/${requestId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ status: 'closed' });
    expect(res.status).toBe(403);
  });

  it('the owner can cancel the request', async () => {
    const res = await request(app)
      .patch(`/api/v2/cb-requests/${requestId}/cancel`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ reason: 'changed my mind' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('cancelled');
  });
});

describe('Matching engine — multi-market coverage', () => {
  let appOwnerTok: string, appId: string;
  let cbA: string, cbB: string;

  beforeAll(async () => {
    const { User, Organization, CertificationBodyScope, Product, Application } = await import('../models');
    const owner = await User.create({ email: 'mmowner@fcb.test', name: 'MMOwner', role: 'cb', otp_attempts: 0 });
    const appOwner = await User.create({ email: 'mmapp@fcb.test', name: 'AppOwner', role: 'client', otp_attempts: 0 });
    appOwnerTok = tokenFor(String(appOwner._id), 'client');

    const mkCb = async (name: string, markets: string[]) => {
      const cb = await Organization.create({ name, type: 'cb', owner_user_id: owner._id, settings: { allowed_cert_types: ['ISO_17065'] } });
      await CertificationBodyScope.create({ certification_body_id: cb._id, cert_type: 'ISO_17065', status: 'active', markets, product_categories: ['Electronics'] });
      return String(cb._id);
    };
    cbA = await mkCb('MM Full', ['IN', 'US', 'DE']);   // 100%
    cbB = await mkCb('MM Two', ['IN', 'US']);          // 67%
    await mkCb('MM One', ['IN']);                      // 33%
    await mkCb('MM None', ['FR']);                     // zero overlap → excluded
    await mkCb('MM AllMarkets', []);                   // empty = serves all → 100%

    const prod = await Product.create({ name: 'Camera', category: 'Electronics' });
    const appDoc = await Application.create({
      application_number: `APP-MM-${Date.now()}`, cert_type: 'ISO_17065', created_by: appOwner._id,
      product_id: prod._id, manual_review: { requested_markets: ['IN', 'US', 'DE'] },
    });
    appId = String(appDoc._id);
  });

  const matchMulti = (qs: string, tok: string) =>
    request(app).get(`/api/v2/certification-bodies/match?cert_type=ISO_17065&${qs}`).set('Authorization', `Bearer ${tok}`);

  it('full / partial / zero coverage + all-markets CB, ranked by coverage', async () => {
    const res = await matchMulti('markets=IN,US,DE&product_category=Electronics', clientToken);
    expect(res.status).toBe(200);
    const byName: Record<string, any> = Object.fromEntries(res.body.data.certificationBodies.map((c: any) => [c.name, c]));
    expect(byName['MM Full'].market_coverage).toEqual({ requested: ['IN', 'US', 'DE'], covered: ['IN', 'US', 'DE'], missing: [], percent: 100 });
    expect(byName['MM Full'].match_reasons.find((r: any) => r.key === 'market').satisfied).toBe(true);
    expect(byName['MM Two'].market_coverage.percent).toBe(67);
    expect(byName['MM Two'].market_coverage.missing).toEqual(['DE']);
    expect(byName['MM Two'].match_reasons.find((r: any) => r.key === 'market').satisfied).toBe(false);
    expect(byName['MM One'].market_coverage.percent).toBe(33);
    expect(byName['MM One'].market_coverage.covered).toEqual(['IN']);
    expect(byName['MM None']).toBeUndefined();                        // excluded (zero overlap)
    expect(byName['MM AllMarkets'].market_coverage.percent).toBe(100); // serves all
    expect(byName['MM Full'].match_score).toBeGreaterThan(byName['MM Two'].match_score);
    expect(byName['MM Two'].match_score).toBeGreaterThan(byName['MM One'].match_score);
  });

  it('single-market back-compat (?market=IN) still works', async () => {
    const res = await matchMulti('market=IN', clientToken);
    const full = res.body.data.certificationBodies.find((c: any) => c.name === 'MM Full');
    expect(full.market_coverage).toEqual({ requested: ['IN'], covered: ['IN'], missing: [], percent: 100 });
  });

  it('deduplicates + normalizes requested markets', async () => {
    const res = await matchMulti('markets=in,IN,us', clientToken);
    expect(res.body.data.requirement.markets).toEqual(['IN', 'US']);
    const two = res.body.data.certificationBodies.find((c: any) => c.name === 'MM Two');
    expect(two.market_coverage.percent).toBe(100);
  });

  it('application context uses ALL requested markets (never truncates to [0])', async () => {
    const res = await request(app).get(`/api/v2/certification-bodies/match?application_id=${appId}`).set('Authorization', `Bearer ${appOwnerTok}`);
    expect(res.status).toBe(200);
    expect(res.body.data.requirement.markets).toEqual(['IN', 'US', 'DE']);
    expect(res.body.data.certificationBodies.find((c: any) => c.name === 'MM Full').market_coverage.percent).toBe(100);
  });

  it('POST stores all markets (+ deprecated mirror)', async () => {
    const res = await request(app).post('/api/v2/cb-requests').set('Authorization', `Bearer ${clientToken}`)
      .send({ certification_body_id: cbA, cert_type: 'ISO_17065', markets: ['IN', 'US', 'DE'] });
    expect(res.status).toBe(201);
    expect(res.body.data.markets).toEqual(['IN', 'US', 'DE']);
    expect(res.body.data.market).toBe('IN');
  });

  it('duplicate protection ignores the market set (same user/CB/cert)', async () => {
    const res = await request(app).post('/api/v2/cb-requests').set('Authorization', `Bearer ${clientToken}`)
      .send({ certification_body_id: cbA, cert_type: 'ISO_17065', markets: ['DE'] });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('duplicate_request');
  });

  it('legacy market-only POST still works', async () => {
    const res = await request(app).post('/api/v2/cb-requests').set('Authorization', `Bearer ${clientToken}`)
      .send({ certification_body_id: cbB, cert_type: 'ISO_17065', market: 'IN' });
    expect(res.status).toBe(201);
    expect(res.body.data.markets).toEqual(['IN']);
  });

  it('POST from an application uses the application markets', async () => {
    const res = await request(app).post('/api/v2/cb-requests').set('Authorization', `Bearer ${appOwnerTok}`)
      .send({ certification_body_id: cbA, application_id: appId });
    expect(res.status).toBe(201);
    expect(res.body.data.markets).toEqual(['IN', 'US', 'DE']);
  });
});
