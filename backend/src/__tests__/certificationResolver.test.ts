/**
 * Phase 1 verification — the single Certification Resolver against curated,
 * real compliance data (no mock, no random). Confirms Power Bank, Bluetooth
 * Speaker and Action Camera → India each resolve to the correct certifications,
 * workflow, authority, cost, timeline, renewal and required documents.
 */
import { setupTestDB, teardownTestDB } from './setup';
import { seedMarketAccessData } from '../db/seed-market-access';
import { seedWorkflows } from '../db/seed-workflows';
import { MarketAccessService } from '../services/marketAccessService';

beforeAll(async () => {
  await setupTestDB();
  await seedWorkflows();
  await seedMarketAccessData();
});

afterAll(async () => {
  await teardownTestDB();
});

function marketIN(intel: any) {
  return intel.markets.find((m: any) => m.marketCode === 'IN');
}

describe('Certification Resolver — India', () => {
  it('Power Bank → India → BIS CRS with full intelligence', async () => {
    const intel = await MarketAccessService.resolveCertifications('Power Bank', ['IN']);
    expect(intel.productCategory?.name).toBe('Power Bank');
    expect(intel.productValidationRequired).toBe(false);

    const india = marketIN(intel);
    expect(india.verified).toBe(true);

    const codes = india.requiredCertifications.map((c: any) => c.code);
    expect(codes).toContain('BIS_CRS');

    const bis = india.requiredCertifications.find((c: any) => c.code === 'BIS_CRS');
    expect(bis.authority).toMatch(/Bureau of Indian Standards/);
    expect(bis.estimatedCost).toBeTruthy();
    expect(bis.estimatedTimeline).toBeTruthy();
    expect(bis.renewalCycle).toBeTruthy();
    expect(bis.workflow).not.toBeNull();
    expect(bis.workflow.issuing_body).toBeTruthy();
    expect(bis.requiredDocuments.length).toBeGreaterThan(0);
    // Every required document carries a reason ("why").
    for (const d of bis.requiredDocuments) expect(d.reason).toBeTruthy();
    expect(bis.requiredBusinessInfo).toContain('gst_number');
    expect(bis.governmentReferences.length).toBeGreaterThan(0);
  });

  it('Bluetooth Speaker → India → BIS CRS + WPC ETA, both with documents', async () => {
    const intel = await MarketAccessService.resolveCertifications('Bluetooth Speaker', ['IN']);
    const india = marketIN(intel);
    expect(india.verified).toBe(true);

    const codes = india.requiredCertifications.map((c: any) => c.code).sort();
    expect(codes).toEqual(['BIS_CRS', 'WPC_ETA']);

    const wpc = india.requiredCertifications.find((c: any) => c.code === 'WPC_ETA');
    expect(wpc.authority).toMatch(/Wireless Planning/);
    expect(wpc.workflow).not.toBeNull();
    const wpcDocTypes = wpc.requiredDocuments.map((d: any) => d.doc_type);
    expect(wpcDocTypes).toContain('rf_test_report');
  });

  it('Action Camera → India → BIS CRS + WPC ETA', async () => {
    const intel = await MarketAccessService.resolveCertifications('Action Camera', ['IN']);
    const india = marketIN(intel);
    expect(india.verified).toBe(true);
    const codes = india.requiredCertifications.map((c: any) => c.code).sort();
    expect(codes).toEqual(['BIS_CRS', 'WPC_ETA']);
  });
});

describe('Certification Resolver — honesty (never fabricate)', () => {
  it('unknown product → productValidationRequired, no fabricated certs', async () => {
    const intel = await MarketAccessService.resolveCertifications('Time Machine', ['IN']);
    expect(intel.productValidationRequired).toBe(true);
    const india = marketIN(intel);
    expect(india.verified).toBe(false);
    expect(india.requiredCertifications).toHaveLength(0);
    expect(india.message).toMatch(/verified compliance mapping/i);
  });

  it('un-catalogued market → honest empty result', async () => {
    const intel = await MarketAccessService.resolveCertifications('Power Bank', ['QA']);
    const qa: any = intel.markets.find((m: any) => m.marketCode === 'QA');
    expect(qa.market).toBeNull();
    expect(qa.verified).toBe(false);
    expect(qa.requiredCertifications).toHaveLength(0);
  });

  it('case-insensitive product match works', async () => {
    const intel = await MarketAccessService.resolveCertifications('power bank', ['IN']);
    expect(marketIN(intel).verified).toBe(true);
  });
});
