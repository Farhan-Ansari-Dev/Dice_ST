import api from './api';

export interface Certification {
  id: string;
  type: string;
  name: string;
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'expired' | 'active';
  applicationId: string;
  certificateNumber?: string;
  issuedDate?: string;
  expiryDate?: string;
  productName: string;
  applicantName: string;
  progress: number;
  documents: Document[];
  timeline: TimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
  uploadedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'upcoming';
  date?: string;
}

export interface Application {
  id: string;
  applicationNumber: string;
  certificationType: string;
  productName: string;
  status: string;
  submittedAt: string;
  updatedAt: string;
  assignedTo?: string;
  notes?: string;
  estimatedCompletion?: string;
  progress: number;
  amount: number;
  paidAmount: number;
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
    api.uploadFile<Document>(`/applications/${applicationId}/documents`, formData, onProgress),

  getDocuments: (applicationId: string) =>
    api.get<Document[]>(`/applications/${applicationId}/documents`),

  deleteDocument: (applicationId: string, documentId: string) =>
    api.delete(`/applications/${applicationId}/documents/${documentId}`),

  downloadCertificate: (certificationId: string) =>
    api.get<{ downloadUrl: string }>(`/certifications/${certificationId}/download`),

  getDashboardStats: () =>
    api.get<{
      totalCertifications: number;
      activeCertifications: number;
      pendingApplications: number;
      expiringCertifications: number;
      totalRevenue: number;
      monthlyGrowth: number;
    }>('/dashboard/stats'),
};

export default certificationService;
