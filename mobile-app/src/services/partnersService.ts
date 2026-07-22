/**
 * Partner Program client.
 *
 * The onboarding form previously faked submission with a setTimeout and a
 * success alert — nothing was sent and staff never saw the application.
 */
import api from './api';

export type PartnerStatus = 'pending' | 'under_review' | 'approved' | 'rejected';

export interface PartnerApplication {
  _id: string;
  partner_type: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  status: PartnerStatus;
  decision_reason?: string;
  created_at: string;
}

export interface PartnerApplicationInput {
  partnerType: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  accreditations?: string;
  scope?: string;
  website?: string;
}

const partnersService = {
  apply: async (input: PartnerApplicationInput): Promise<PartnerApplication> => {
    const res = await api.post<{ success: boolean; data: PartnerApplication }>('/partners/applications', input);
    return res.data;
  },

  mine: async (): Promise<PartnerApplication[]> => {
    const res = await api.get<{ success: boolean; data: PartnerApplication[] }>('/partners/applications/mine');
    return Array.isArray(res.data) ? res.data : [];
  },
};

export default partnersService;
