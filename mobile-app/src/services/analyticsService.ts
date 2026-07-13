import api from './api';

export interface DashboardData {
  total_applications: number;
  active_certifications: number;
  pending_payments: number;
  compliance_score: number;
  monthly_applications: { month: string; count: number }[];
  recent_activity: ActivityItem[];
  expiring_soon: ExpiringCert[];
}

export interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  created_at: string;
}

export interface ExpiringCert {
  id: string;
  cert_type: string;
  product_name: string;
  expiry_date: string;
  days_left: number;
}

export interface ComplianceScoreData {
  overall_score: number;
  bis_score: number;
  epr_score: number;
  fssai_score: number;
  wpc_score: number;
  customs_score: number;
  document_score: number;
  improvements: string[];
  trend: number;
}

const analyticsService = {
  getDashboard: () =>
    api.get<{ data: DashboardData }>('/analytics/dashboard'),

  getComplianceScore: () =>
    api.get<{ data: ComplianceScoreData }>('/analytics/compliance-score'),

  getActivity: (limit: number = 20) =>
    api.get<{ data: ActivityItem[] }>('/analytics/activity', { params: { limit } }),
};

export default analyticsService;
