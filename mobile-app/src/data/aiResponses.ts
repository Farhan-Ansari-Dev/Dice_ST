export interface ServiceResponse {
  id: string;
  keywords: string[];
  response: string;
  sources: string[];
}

export const DEFAULT_RESPONSE = `I am your Sanyog Conformity AI Assistant. I can help you with over 60 domestic and international compliance services, including BIS, EPR, SASO, CE Marking, and specialized Testing & Inspection. How can I assist you today?`;

export const AI_KNOWLEDGE_BASE: ServiceResponse[] = [];

// Levenshtein distance algorithm for typo tolerance
function getEditDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) == a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1) // insertion/deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

export const matchAIService = (query: string): ServiceResponse | null => {
  return null;
};

export function getDocumentsForService(serviceId: string): string {
  return '• Duly Filled Application Form\n• Company Registration / Trade License\n• Technical Product Specifications\n• Valid Test Reports (if applicable)\n• Authorized Signatory ID Proof';
}
