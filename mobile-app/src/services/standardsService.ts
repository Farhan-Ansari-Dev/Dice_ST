import { api } from './api';
import type { CertificationStandard } from '../../../shared/types/certifications';

export const standardsService = {
  /**
   * Fetches the required documents for a specific certification and country.
   * @param certification_id - The ID of the certification.
   * @param country_code - The ISO 3166-1 alpha-2 country code.
   */
  getStandard: async (
    certification_id: string,
    country_code: string
  ): Promise<CertificationStandard> => {
    const response = await api.get<{ data: CertificationStandard }>('/standards/lookup', {
      params: {
        certification_id,
        country_code,
      },
    });
    return (response.data as any).data;
  },
};
