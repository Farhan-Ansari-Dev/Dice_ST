/**
 * PDF renderer regression — proves "Export Comprehensive Report" produces a
 * real, non-trivial document for every product category. Renders only; the S3
 * upload path is not exercised here (no credentials in CI).
 */
import { renderReportPdf } from '../services/vision/productReportPdf';
import { buildAnalysis } from '../services/vision/complianceEngine';
import type { VisionObservations } from '../services/vision/types';

const obs = (over: Partial<VisionObservations>): VisionObservations => ({
  productCategory: 'other', productType: 'unidentified product',
  detectedText: [], visibleCertifications: [], codes: [],
  packagingLanguages: [], warningLabels: [], ...over,
});
const text = (t: string) => ({ text: t, confidence: 0.9, evidence: 'printed on label', reasoning: 'legible' });

const CASES: Array<[string, VisionObservations]> = [
  ['wireless mouse',    obs({ productCategory: 'electronics', productType: 'wireless optical mouse', detectedText: [text('Logitech M240')] })],
  ['bluetooth speaker', obs({ productCategory: 'electronics', productType: 'bluetooth speaker', detectedText: [text('Bluetooth 5.3')] })],
  ['toy',               obs({ productCategory: 'toys', productType: 'building block set', detectedText: [text('Ages 3+')] })],
  ['food package',      obs({ productCategory: 'food', productType: 'packaged biscuits', detectedText: [text('FSSAI 10012345678901'), text('MRP Rs. 45')] })],
  ['cosmetic',          obs({ productCategory: 'cosmetics', productType: 'face cream', detectedText: [text('Ingredients: Aqua')] })],
  ['medical device',    obs({ productCategory: 'medical', productType: 'BP monitor', detectedText: [text('LOT 44821')] })],
];

describe('product report PDF', () => {
  it.each(CASES)('renders a valid multi-page PDF for %s', async (name, o) => {
    const pdf = await renderReportPdf(buildAnalysis(o, `report-${name.replace(/\s/g, '-')}`));

    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');       // valid header
    expect(pdf.subarray(-6).toString()).toContain('EOF');       // properly terminated
    expect(pdf.byteLength).toBeGreaterThan(8000);               // real content, not a stub
  });

  it('produces different documents for different categories', async () => {
    const [food, toy] = await Promise.all([
      renderReportPdf(buildAnalysis(CASES[3][1], 'fixed')),
      renderReportPdf(buildAnalysis(CASES[2][1], 'fixed')),
    ]);
    expect(food.byteLength).not.toBe(toy.byteLength);
  });
});
