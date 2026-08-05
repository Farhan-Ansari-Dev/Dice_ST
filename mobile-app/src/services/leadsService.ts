/**
 * Certification enquiry (Lead) client.
 *
 * Apply from an overview page creates a Lead, which lands in the Admin Panel
 * for a certification manager to qualify — it does not create an Application,
 * because none of the required documentation exists yet.
 */
import api from './api';

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'rejected';

export interface Lead {
  _id: string;
  service_id: string;
  service_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  company_name?: string;
  product_description?: string;
  target_markets: string[];
  status: LeadStatus;
  created_at: string;
}

export interface CreateLeadInput {
  serviceId: string;
  serviceName: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  companyName?: string;
  productDescription?: string;
  targetMarkets?: string[];
  notes?: string;
  /** "Continue as Manual Application" — no certification mapping was found. */
  manualReview?: boolean;
}

const leadsService = {
  create: async (input: CreateLeadInput): Promise<Lead> => {
    const res = await api.post<{ success: boolean; data: Lead }>('/leads', input);
    return res.data;
  },

  mine: async (): Promise<Lead[]> => {
    const res = await api.get<{ success: boolean; data: Lead[] }>('/leads/mine');
    return Array.isArray(res.data) ? res.data : [];
  },
};

export default leadsService;
