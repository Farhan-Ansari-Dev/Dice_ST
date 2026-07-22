/**
 * AI Quality Analyzer client.
 *
 * Uploads a product photograph and returns the backend's structured compliance
 * analysis. There is no local fallback by design: if the service is
 * unavailable the caller must show an error, never fabricated findings.
 */
import api from './api';

export interface Finding {
  id: string;
  title: string;
  detail: string;
  severity: 'info' | 'advisory' | 'important' | 'critical';
  reference?: string;
  confidence: number;
  evidence: string;
  reasoning: string;
}

export interface VisibleCertification {
  mark: string;
  observation: string;
  confidence: number;
  evidence: string;
  reasoning: string;
}

export interface DetectedTextItem {
  text: string;
  location?: string;
  confidence: number;
}

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
  riskScore: number;
  confidence: number;
  disclaimer: string;
  observations: {
    productCategory: string;
    productType: string;
    brand?: string;
    detectedText: DetectedTextItem[];
    visibleCertifications: VisibleCertification[];
    codes: Array<{ type: 'barcode' | 'qr'; value?: string; symbology?: string; confidence: number }>;
    packagingLanguages: string[];
    warningLabels: DetectedTextItem[];
    countryOfOrigin?: DetectedTextItem;
    imageQualityNotes?: string;
  };
  assessment: {
    applicableCertifications: Finding[];
    applicableRegulations: Finding[];
    applicableStandards: Finding[];
    missingVisibleMarkings: Finding[];
    missingDeclarations: Finding[];
    requiredDocumentation: Finding[];
    recommendedNextSteps: Finding[];
  };
  report: {
    s3Key: string;
    downloadUrl: string;
    expiresInSeconds: number;
    byteLength: number;
  } | null;
}

/** Derives a multipart filename/type from an image-picker URI. */
function fileFromUri(uri: string) {
  const name = uri.split('/').pop() || `product-${Date.now()}.jpg`;
  const ext = (name.split('.').pop() || 'jpg').toLowerCase();
  const type =
    ext === 'png' ? 'image/png'
    : ext === 'webp' ? 'image/webp'
    : ext === 'heic' || ext === 'heif' ? 'image/heic'
    : 'image/jpeg';
  return { uri, name, type };
}

const productAnalysisService = {
  /**
   * Runs the full pipeline: upload → vision → compliance engine → PDF.
   * Throws on failure; the screen surfaces the message.
   */
  analyzeImage: async (imageUri: string, notes?: string): Promise<ProductAnalysis> => {
    const form = new FormData();
    form.append('image', fileFromUri(imageUri) as any);
    if (notes?.trim()) form.append('notes', notes.trim());

    const res = await api.uploadFile<{ success: boolean; data: ProductAnalysis }>(
      '/ai/analyze-product-image',
      form,
    );
    return res.data;
  },

  /** Regenerates the PDF for an analysis already held by the client. */
  generateReport: async (analysis: ProductAnalysis) => {
    const res = await api.post<{ success: boolean; data: ProductAnalysis['report'] }>(
      '/ai/product-report',
      { analysis },
    );
    return res.data;
  },
};

export default productAnalysisService;
