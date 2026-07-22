/**
 * Report stage — renders a ProductAnalysis to PDF, stores it in S3, and returns
 * a time-limited signed URL.
 *
 * Follows the same pdfkit + S3 approach as invoiceService, extended with a
 * presigned GET so the mobile client can download without AWS credentials.
 */
import PDFDocument from 'pdfkit';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { ComplianceFinding, ProductAnalysis } from './types';

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET = process.env.AWS_S3_BUCKET || 'sanyog-conformity-docs';
const SIGNED_URL_TTL_SECONDS = 15 * 60;

const INK = {
  heading: '#0F172A',
  body: '#334155',
  muted: '#64748B',
  rule: '#E2E8F0',
  brand: '#6C63FF',
};

const SEVERITY_INK: Record<ComplianceFinding['severity'], string> = {
  critical: '#DC2626',
  important: '#EA580C',
  advisory: '#CA8A04',
  info: '#0284C7',
};

const SEVERITY_LABEL: Record<ComplianceFinding['severity'], string> = {
  critical: 'CRITICAL', important: 'IMPORTANT', advisory: 'ADVISORY', info: 'INFO',
};

function riskBand(score: number): { label: string; ink: string } {
  if (score >= 70) return { label: 'HIGH', ink: '#DC2626' };
  if (score >= 40) return { label: 'MODERATE', ink: '#EA580C' };
  if (score >= 15) return { label: 'LOW', ink: '#CA8A04' };
  return { label: 'MINIMAL', ink: '#16A34A' };
}

/** Starts a new page when less than `needed` vertical space remains. */
function ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
  if (doc.y + needed > doc.page.height - doc.page.margins.bottom) doc.addPage();
}

function sectionHeading(doc: PDFKit.PDFDocument, title: string) {
  ensureSpace(doc, 60);
  doc.moveDown(0.8);
  doc.fillColor(INK.heading).fontSize(13).font('Helvetica-Bold').text(title);
  doc.moveDown(0.25);
  const y = doc.y;
  doc.strokeColor(INK.rule).lineWidth(1)
    .moveTo(doc.page.margins.left, y).lineTo(doc.page.width - doc.page.margins.right, y).stroke();
  doc.moveDown(0.5);
}

function renderFindings(doc: PDFKit.PDFDocument, findings: ComplianceFinding[], emptyNote: string) {
  if (!findings.length) {
    doc.fillColor(INK.muted).fontSize(9).font('Helvetica-Oblique').text(emptyNote);
    doc.moveDown(0.4);
    return;
  }

  for (const f of findings) {
    ensureSpace(doc, 90);

    doc.fillColor(SEVERITY_INK[f.severity]).fontSize(7.5).font('Helvetica-Bold')
      .text(`${SEVERITY_LABEL[f.severity]}  ·  confidence ${(f.confidence * 100).toFixed(0)}%`);

    doc.fillColor(INK.heading).fontSize(10.5).font('Helvetica-Bold').text(f.title);

    doc.fillColor(INK.body).fontSize(9).font('Helvetica').text(f.detail, { align: 'left' });

    if (f.reference) {
      doc.fillColor(INK.brand).fontSize(8).font('Helvetica-Bold').text(`Reference: ${f.reference}`);
    }

    doc.fillColor(INK.muted).fontSize(8).font('Helvetica')
      .text(`Evidence: ${f.evidence}`)
      .text(`Reasoning: ${f.reasoning}`);

    doc.moveDown(0.6);
  }
}

function renderHeader(doc: PDFKit.PDFDocument, a: ProductAnalysis) {
  doc.rect(0, 0, doc.page.width, 96).fill(INK.heading);

  doc.fillColor('#FFFFFF').fontSize(20).font('Helvetica-Bold')
    .text('DICE', doc.page.margins.left, 26, { continued: true })
    .fontSize(10).font('Helvetica').text('   Digital Identity & Compliance Ecosystem');

  doc.fillColor('#CBD5E1').fontSize(9).font('Helvetica')
    .text('Product Compliance Assessment  ·  Sanyog Conformity Solutions', doc.page.margins.left, 56);

  doc.fillColor('#94A3B8').fontSize(8)
    .text(`Report ${a.analysisId}   ·   Generated ${new Date(a.analysedAt).toUTCString()}`, doc.page.margins.left, 72);

  doc.fillColor(INK.body).y = 120;
}

function renderSummary(doc: PDFKit.PDFDocument, a: ProductAnalysis) {
  const band = riskBand(a.riskScore);
  const left = doc.page.margins.left;
  const width = doc.page.width - left - doc.page.margins.right;

  const boxTop = doc.y;
  doc.roundedRect(left, boxTop, width, 92, 6).fillAndStroke('#F8FAFC', INK.rule);

  doc.fillColor(INK.muted).fontSize(8).font('Helvetica-Bold').text('PRODUCT', left + 14, boxTop + 12);
  doc.fillColor(INK.heading).fontSize(13).font('Helvetica-Bold')
    .text(a.productType, left + 14, boxTop + 24, { width: width * 0.6 });

  doc.fillColor(INK.body).fontSize(9).font('Helvetica')
    .text(`Category: ${a.productCategory}${a.brand ? `   ·   Brand: ${a.brand}` : ''}`, left + 14, boxTop + 46, { width: width * 0.6 });

  doc.fillColor(INK.muted).fontSize(8).font('Helvetica')
    .text(`Category confidence: ${(a.confidence * 100).toFixed(0)}%`, left + 14, boxTop + 62, { width: width * 0.6 });

  // Risk block, right aligned
  const rx = left + width * 0.68;
  doc.fillColor(INK.muted).fontSize(8).font('Helvetica-Bold').text('COMPLIANCE RISK', rx, boxTop + 12, { width: width * 0.3, align: 'right' });
  doc.fillColor(band.ink).fontSize(30).font('Helvetica-Bold').text(String(a.riskScore), rx, boxTop + 26, { width: width * 0.3, align: 'right' });
  doc.fillColor(band.ink).fontSize(9).font('Helvetica-Bold').text(`${band.label} · ${a.riskScore}/100`, rx, boxTop + 62, { width: width * 0.3, align: 'right' });

  doc.y = boxTop + 104;
  doc.x = left;
}

function renderObservations(doc: PDFKit.PDFDocument, a: ProductAnalysis) {
  const o = a.observations;
  sectionHeading(doc, 'What the image shows');

  const line = (label: string, value: string) => {
    ensureSpace(doc, 24);
    doc.fillColor(INK.muted).fontSize(8.5).font('Helvetica-Bold').text(label, { continued: false });
    doc.fillColor(INK.body).fontSize(9).font('Helvetica').text(value);
    doc.moveDown(0.35);
  };

  line('Detected text', o.detectedText.length
    ? o.detectedText.map((t) => `"${t.text}"`).join('  ·  ')
    : 'No legible text was detected in this image.');

  line('Marks present on artwork', o.visibleCertifications.length
    ? o.visibleCertifications.map((c) => `${c.mark} (${(c.confidence * 100).toFixed(0)}% — ${c.observation})`).join('\n')
    : 'No certification marks were identified on the visible surfaces.');

  line('Codes', o.codes.length
    ? o.codes.map((c) => `${c.type.toUpperCase()}${c.symbology ? ` (${c.symbology})` : ''}${c.value ? `: ${c.value}` : ''}`).join('  ·  ')
    : 'No barcode or QR code was readable.');

  line('Packaging languages', o.packagingLanguages.length ? o.packagingLanguages.join(', ') : 'Not determined.');

  line('Warning labels', o.warningLabels.length
    ? o.warningLabels.map((w) => `"${w.text}"`).join('  ·  ')
    : 'No warning or hazard text was identified.');

  line('Country of origin', o.countryOfOrigin
    ? `${o.countryOfOrigin.text} (${(o.countryOfOrigin.confidence * 100).toFixed(0)}% confidence)`
    : 'Not visible in this image.');

  if (o.imageQualityNotes) {
    ensureSpace(doc, 40);
    doc.fillColor('#B45309').fontSize(8.5).font('Helvetica-Oblique')
      .text(`Image quality: ${o.imageQualityNotes}`);
    doc.moveDown(0.4);
  }
}

function renderDisclaimer(doc: PDFKit.PDFDocument, a: ProductAnalysis) {
  ensureSpace(doc, 130);
  doc.moveDown(0.6);
  const left = doc.page.margins.left;
  const width = doc.page.width - left - doc.page.margins.right;
  const top = doc.y;

  doc.roundedRect(left, top, width, 108, 6).fillAndStroke('#FEF2F2', '#FECACA');
  doc.fillColor('#991B1B').fontSize(9).font('Helvetica-Bold')
    .text('SCOPE AND LIMITATIONS', left + 12, top + 10, { width: width - 24 });
  doc.fillColor('#7F1D1D').fontSize(8).font('Helvetica')
    .text(a.disclaimer, left + 12, top + 26, { width: width - 24, align: 'left' });

  doc.y = top + 118;
  doc.x = left;
}

/** Renders the analysis to a PDF buffer. */
export function renderReportPdf(a: ProductAnalysis): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 46, size: 'A4', bufferPages: true });
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c as Buffer));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      renderHeader(doc, a);
      renderSummary(doc, a);
      renderObservations(doc, a);

      sectionHeading(doc, 'Applicable certifications');
      renderFindings(doc, a.assessment.applicableCertifications, 'No certification scheme was identified for this category.');

      sectionHeading(doc, 'Applicable regulations');
      renderFindings(doc, a.assessment.applicableRegulations, 'No specific regulation was identified.');

      sectionHeading(doc, 'Applicable standards');
      renderFindings(doc, a.assessment.applicableStandards, 'No specific standard was identified.');

      sectionHeading(doc, 'Markings not visible on the artwork');
      renderFindings(doc, a.assessment.missingVisibleMarkings, 'All expected certification markings for this category were identified.');

      sectionHeading(doc, 'Declarations not visible on the artwork');
      renderFindings(doc, a.assessment.missingDeclarations, 'All expected statutory declarations were identified.');

      sectionHeading(doc, 'Documentation required');
      renderFindings(doc, a.assessment.requiredDocumentation, 'No documentation requirements identified.');

      sectionHeading(doc, 'Recommended next steps');
      renderFindings(doc, a.assessment.recommendedNextSteps, 'No further action identified.');

      renderDisclaimer(doc, a);

      // Page numbers across the whole document.
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.fillColor(INK.muted).fontSize(7.5).font('Helvetica')
          .text(
            `DICE Product Compliance Assessment  ·  ${a.analysisId}  ·  Page ${i - range.start + 1} of ${range.count}`,
            doc.page.margins.left,
            doc.page.height - 32,
            { width: doc.page.width - doc.page.margins.left - doc.page.margins.right, align: 'center' },
          );
      }

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

export interface StoredReport {
  s3Key: string;
  downloadUrl: string;
  expiresInSeconds: number;
  byteLength: number;
}

/** Renders, uploads, and returns a signed download URL. */
export async function generateAndStoreReport(a: ProductAnalysis, userId: string): Promise<StoredReport> {
  const pdf = await renderReportPdf(a);
  const s3Key = `compliance-reports/${userId}/${a.analysisId}.pdf`;

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: s3Key,
    Body: pdf,
    ContentType: 'application/pdf',
    ServerSideEncryption: 'AES256',
    ContentDisposition: `attachment; filename="dice-compliance-${a.analysisId}.pdf"`,
  }));

  const downloadUrl = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: BUCKET, Key: s3Key }),
    { expiresIn: SIGNED_URL_TTL_SECONDS },
  );

  return { s3Key, downloadUrl, expiresInSeconds: SIGNED_URL_TTL_SECONDS, byteLength: pdf.byteLength };
}
