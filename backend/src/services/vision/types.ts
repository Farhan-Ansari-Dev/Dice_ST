/**
 * Contract for product-image compliance analysis.
 *
 * Design rule that drives this whole shape: a photograph can only ever prove
 * what is *visible*. Every assertion therefore carries its own evidence and
 * confidence, and the vocabulary deliberately separates
 *   "this marking is present on the packaging"   (observable)
 * from
 *   "this product is certified"                  (NOT observable)
 *
 * Nothing in this pipeline may output the latter.
 */

/** How strongly the model believes a single observation. */
export interface Confidence {
  /** 0..1 */
  confidence: number;
  /** What in the image supports this — quoted text, a logo, a symbol, a location. */
  evidence: string;
  /** Why that evidence leads to this conclusion. */
  reasoning: string;
}

export interface DetectedText extends Confidence {
  text: string;
  /** Where on the packaging it appeared, when the model can tell. */
  location?: string;
}

export interface VisibleCertification extends Confidence {
  /** e.g. "CE", "BIS", "FCC", "ISI", "FSSAI", "RoHS", "WEEE" */
  mark: string;
  /**
   * Always phrased as an observation about the artwork, never about the
   * product's certification status.
   */
  observation: string;
}

export interface DetectedBarcode extends Confidence {
  type: 'barcode' | 'qr';
  value?: string;
  symbology?: string;
}

/** Raw observations. Everything here is "what the camera saw". */
export interface VisionObservations {
  productCategory: string;
  productType: string;
  brand?: string;
  detectedText: DetectedText[];
  visibleCertifications: VisibleCertification[];
  codes: DetectedBarcode[];
  packagingLanguages: string[];
  warningLabels: DetectedText[];
  countryOfOrigin?: DetectedText;
  imageQualityNotes?: string;
}

/** A regulatory conclusion derived from observations plus the rules engine. */
export interface ComplianceFinding extends Confidence {
  id: string;
  title: string;
  detail: string;
  severity: 'info' | 'advisory' | 'important' | 'critical';
  /** Standard or regulation reference, when one applies. */
  reference?: string;
}

export interface ComplianceAssessment {
  applicableCertifications: ComplianceFinding[];
  applicableRegulations: ComplianceFinding[];
  applicableStandards: ComplianceFinding[];
  missingVisibleMarkings: ComplianceFinding[];
  missingDeclarations: ComplianceFinding[];
  requiredDocumentation: ComplianceFinding[];
  recommendedNextSteps: ComplianceFinding[];
}

/** The full analysis payload returned to the client and rendered into the PDF. */
export interface ProductAnalysis {
  analysisId: string;
  analysedAt: string;

  productCategory: string;
  productType: string;
  brand?: string;
  detectedText: string[];
  visibleCertifications: string[];
  recommendedCertifications: string[];
  missingRequirements: string[];

  /** 0..100. Higher = more compliance work outstanding. */
  riskScore: number;
  /** 0..1 — overall confidence in the category identification. */
  confidence: number;

  observations: VisionObservations;
  assessment: ComplianceAssessment;

  /** Always present. This output is indicative, never a certificate. */
  disclaimer: string;
}
