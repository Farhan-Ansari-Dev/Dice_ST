/**
 * Compliance engine regression.
 *
 * Replaces the defect this feature was built to fix: the old analyser picked a
 * random category and returned a hardcoded report, so output was uncorrelated
 * with input. These tests assert the opposite property — output is a function
 * of the observations — and enforce the safety rules that make the feature
 * fit to show a customer.
 *
 * Pure functions, no network: the engine is deterministic by design.
 */
import { buildAnalysis, assessCompliance, computeRiskScore, DISCLAIMER } from '../services/vision/complianceEngine';
import type { VisionObservations } from '../services/vision/types';

const obs = (over: Partial<VisionObservations>): VisionObservations => ({
  productCategory: 'other',
  productType: 'unidentified product',
  detectedText: [],
  visibleCertifications: [],
  codes: [],
  packagingLanguages: [],
  warningLabels: [],
  ...over,
});

const text = (t: string) => ({ text: t, confidence: 0.9, evidence: 'printed on label', reasoning: 'legible' });

const FIXTURES: Record<string, VisionObservations> = {
  wirelessMouse: obs({
    productCategory: 'electronics', productType: 'wireless optical mouse', brand: 'Logitech',
    detectedText: [text('Logitech'), text('M240 Silent'), text('2.4GHz Wireless')],
  }),
  bluetoothSpeaker: obs({
    productCategory: 'electronics', productType: 'portable bluetooth speaker',
    detectedText: [text('SoundCore'), text('Bluetooth 5.3'), text('Li-ion 3.7V')],
  }),
  toy: obs({
    productCategory: 'toys', productType: 'plastic building block set',
    detectedText: [text('Ages 3+'), text('WARNING: CHOKING HAZARD - Small parts')],
    warningLabels: [text('Not suitable for children under 3 years')],
  }),
  foodPackage: obs({
    productCategory: 'food', productType: 'packaged biscuits',
    detectedText: [text('Best Before 12/2026'), text('Net Wt. 200g'), text('MRP Rs. 45'), text('FSSAI 10012345678901')],
  }),
  cosmetic: obs({
    productCategory: 'cosmetics', productType: 'facial moisturising cream',
    detectedText: [text('Ingredients: Aqua, Glycerin'), text('Batch No. A231'), text('Use before 06/2027')],
  }),
  medicalDevice: obs({
    productCategory: 'medical', productType: 'digital blood pressure monitor',
    detectedText: [text('Model BP-200'), text('LOT 44821')],
  }),
};

describe('compliance engine — output follows input', () => {
  it('produces a distinct category for each of the six test products', () => {
    const categories = Object.values(FIXTURES).map((o) => assessCompliance(o).category);
    expect(categories).toEqual(['electronics', 'electronics', 'toys', 'food', 'cosmetics', 'medical']);
  });

  it('produces different certification sets across categories', () => {
    const signatures = Object.entries(FIXTURES).map(([name, o]) => {
      const a = buildAnalysis(o, `id-${name}`);
      return a.recommendedCertifications.join('|');
    });

    // Mouse and speaker are both electronics so legitimately share a scheme set;
    // every distinct category must differ from every other.
    const distinct = new Set(signatures);
    expect(distinct.size).toBeGreaterThanOrEqual(5);
    expect(signatures[0]).toBe(signatures[1]);          // both electronics
    expect(signatures[2]).not.toBe(signatures[3]);      // toys ≠ food
    expect(signatures[4]).not.toBe(signatures[5]);      // cosmetics ≠ medical
  });

  it('is deterministic — the same observations always give the same result', () => {
    const a = buildAnalysis(FIXTURES.toy, 'fixed-id');
    const b = buildAnalysis(FIXTURES.toy, 'fixed-id');
    expect(a.riskScore).toBe(b.riskScore);
    expect(a.recommendedCertifications).toEqual(b.recommendedCertifications);
    expect(a.missingRequirements).toEqual(b.missingRequirements);
  });

  it('routes each category to its own regulator', () => {
    const refs = (o: VisionObservations) =>
      buildAnalysis(o, 'x').assessment.applicableCertifications.map((c) => c.title).join(' ');

    expect(refs(FIXTURES.foodPackage)).toMatch(/FSSAI/i);
    expect(refs(FIXTURES.cosmetic)).toMatch(/CDSCO/i);
    expect(refs(FIXTURES.medicalDevice)).toMatch(/CDSCO|Medical Device/i);
    expect(refs(FIXTURES.toy)).toMatch(/BIS|Toys/i);
    expect(refs(FIXTURES.wirelessMouse)).toMatch(/BIS|WPC/i);
  });
});

describe('compliance engine — detection of present vs missing markings', () => {
  it('does not flag a declaration that IS present in the detected text', () => {
    const a = buildAnalysis(FIXTURES.foodPackage, 'x');
    // MRP, net quantity, best-before and FSSAI number are all on this label.
    expect(a.missingRequirements.join(' ')).not.toMatch(/Maximum Retail Price/i);
    expect(a.missingRequirements.join(' ')).not.toMatch(/Net quantity/i);
    expect(a.missingRequirements.join(' ')).not.toMatch(/Best-before/i);
    expect(a.missingRequirements.join(' ')).not.toMatch(/FSSAI logo/i);
  });

  it('flags declarations that are genuinely absent', () => {
    const a = buildAnalysis(FIXTURES.medicalDevice, 'x');
    // This label shows only a model and lot number.
    expect(a.missingRequirements.join(' ')).toMatch(/Maximum Retail Price/i);
    expect(a.missingRequirements.length).toBeGreaterThan(0);
  });

  it('scores a bare label as higher risk than a fully declared one', () => {
    const complete = buildAnalysis(FIXTURES.foodPackage, 'x').riskScore;
    const bare = buildAnalysis(FIXTURES.medicalDevice, 'x').riskScore;
    expect(bare).toBeGreaterThan(complete);
  });

  it('keeps the risk score within bounds even with no observations at all', () => {
    const score = buildAnalysis(obs({}), 'x').riskScore;
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('lowers confidence in absence-findings when image quality was poor', () => {
    const clear = buildAnalysis(FIXTURES.medicalDevice, 'x');
    const blurred = buildAnalysis(
      { ...FIXTURES.medicalDevice, imageQualityNotes: 'heavy glare across the rear label' },
      'x',
    );
    const conf = (a: typeof clear) => a.assessment.missingDeclarations[0]?.confidence ?? 0;
    expect(conf(blurred)).toBeLessThan(conf(clear));
  });
});

describe('compliance engine — safety rules', () => {
  const ALL = Object.values(FIXTURES).map((o) => buildAnalysis(o, 'x'));

  /**
   * Everything the engine *generates*. The disclaimer is excluded deliberately:
   * it is fixed, reviewed prose whose job is to NEGATE these very claims
   * ("does not establish that a product is certified"), so scanning it for the
   * phrases it exists to rebut would be a false positive.
   */
  const generatedText = (a: (typeof ALL)[number]) =>
    JSON.stringify({ assessment: a.assessment, observations: a.observations, summary: {
      productType: a.productType, recommendedCertifications: a.recommendedCertifications,
      missingRequirements: a.missingRequirements,
    } });

  it('never claims a product is certified, compliant, or approved', () => {
    const FORBIDDEN = [
      /\bis (certified|compliant|approved|conformant)\b/i,
      /\bRoHS (compliant|pass)/i,
      /\bCE (certified|pass|approved)\b/i,
      /\bBIS certified\b/i,
      /\bFCC approved\b/i,
      /\bmeets all\b/i,
      /\blaboratory (verified|confirmed)\b/i,
      /\bfully compliant\b/i,
    ];

    for (const analysis of ALL) {
      const corpus = generatedText(analysis);
      for (const pattern of FORBIDDEN) {
        expect(corpus).not.toMatch(pattern);
      }
    }
  });

  it('never asserts material composition from an image', () => {
    for (const analysis of ALL) {
      const corpus = generatedText(analysis);
      expect(corpus).not.toMatch(/absence of (hazardous )?(heavy metals|lead|cadmium|mercury)/i);
      expect(corpus).not.toMatch(/spectral analysis/i);
      expect(corpus).not.toMatch(/material composition (is|was) (verified|confirmed|detected)/i);
    }
  });

  it('attaches confidence, evidence and reasoning to every single finding', () => {
    for (const analysis of ALL) {
      const findings = Object.values(analysis.assessment).flat();
      expect(findings.length).toBeGreaterThan(0);
      for (const f of findings) {
        expect(typeof f.confidence).toBe('number');
        expect(f.confidence).toBeGreaterThanOrEqual(0);
        expect(f.confidence).toBeLessThanOrEqual(1);
        expect(f.evidence.length).toBeGreaterThan(0);
        expect(f.reasoning.length).toBeGreaterThan(0);
      }
    }
  });

  it('always carries the scope disclaimer', () => {
    for (const analysis of ALL) {
      expect(analysis.disclaimer).toBe(DISCLAIMER);
      expect(analysis.disclaimer).toMatch(/not a certificate/i);
    }
  });

  it('phrases a visible mark as an observation about artwork, not a status', () => {
    const withMark = buildAnalysis(
      obs({
        productCategory: 'electronics', productType: 'usb charger',
        visibleCertifications: [{ mark: 'CE', observation: 'A CE mark is printed on the rear label', confidence: 0.8, evidence: 'CE logo lower-right', reasoning: 'logo shape matches' }],
      }),
      'x',
    );
    const o = withMark.observations.visibleCertifications[0];
    expect(o.observation).toMatch(/printed|appears|shown/i);
    expect(o.observation).not.toMatch(/\bis certified\b/i);
  });
});

describe('compliance engine — JSON contract', () => {
  it('exposes every field the mobile client and DICE consumers rely on', () => {
    const a = buildAnalysis(FIXTURES.bluetoothSpeaker, 'contract-id');

    expect(a).toMatchObject({
      analysisId: 'contract-id',
      productCategory: expect.any(String),
      productType: expect.any(String),
      detectedText: expect.any(Array),
      visibleCertifications: expect.any(Array),
      recommendedCertifications: expect.any(Array),
      missingRequirements: expect.any(Array),
      riskScore: expect.any(Number),
      confidence: expect.any(Number),
    });
    expect(a.confidence).toBeGreaterThan(0);
    expect(a.confidence).toBeLessThanOrEqual(1);
    expect(typeof a.analysedAt).toBe('string');
  });

  it('computeRiskScore stays bounded across every fixture', () => {
    for (const o of Object.values(FIXTURES)) {
      const { assessment } = assessCompliance(o);
      const score = computeRiskScore(assessment, o);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });
});
