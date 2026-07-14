export interface CertificationStandard {
  _id?: string;
  certification_id: string;
  country_code: string;
  required_documents: string[];
  estimated_time_days: number;
  cost_usd: number;
  requirements: string[];
  updatedAt?: string;
  createdAt?: string;
}

export interface Certification {
  _id: string;
  standard_name: string;
  issuing_body: string;
  issue_date: string;
  expiry_date: string;
  status: 'active' | 'expiring' | 'expired';
  certificate_number?: string;
  scope?: string;
  url?: string;
}
