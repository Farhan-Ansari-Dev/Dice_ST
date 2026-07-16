import api from './api';

export interface Certification {
  _id: string;
  cert_number: string;
  cert_type: string;
  status: 'active' | 'expiring_soon' | 'expired' | 'renewed' | 'revoked' | 'suspended';
  application_id?: string;
  org_id?: string | { _id: string; name: string };
  product_id?: string | { _id: string; name: string };
  issuing_body?: string;
  scheme?: string;
  issue_date?: string;
  expiry_date?: string;
  scope?: string;
  notes?: string;
  tags?: string[];
  deleted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Application {
  _id: string;
  cert_type: string;
  product_id?: string | { _id: string; name: string };
  status: string;
  priority?: string;
  notes?: string;
  assigned_to?: string[];
  created_by?: string;
  created_at: string;
  updated_at: string;
}

const certificationService = {
  getCertifications: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get<{ data: Certification[]; total: number; page: number }>('/certifications', { params }),

  getCertificationById: (id: string) =>
    api.get<Certification>(`/certifications/${id}`),

  getApplications: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get<{ data: Application[]; total: number; page: number }>('/applications', { params }),

  getApplicationById: (id: string) =>
    api.get<Application>(`/applications/${id}`),

  createApplication: (data: Partial<Application>) =>
    api.post<Application>('/applications', data),

  updateApplication: (id: string, data: Partial<Application>) =>
    api.put<Application>(`/applications/${id}`, data),

  uploadDocument: (applicationId: string, formData: FormData, onProgress?: (p: number) => void) =>
    api.uploadFile<any>(`/applications/${applicationId}/documents`, formData, onProgress),

  getDocuments: (applicationId: string) =>
    api.get<any[]>(`/applications/${applicationId}/documents`),

  deleteDocument: (applicationId: string, documentId: string) =>
    api.delete(`/applications/${applicationId}/documents/${documentId}`),

  downloadCertificate: (certificationId: string) =>
    api.get<{ data: { url: string; expires_in: number } }>(`/certifications/${certificationId}/download`),

  getDashboardStats: () =>
    api.get<any>('/analytics/dashboard'),
};

export default certificationService;
