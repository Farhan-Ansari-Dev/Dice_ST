import api from './api';

export interface Application {
  _id: string;
  application_number: string;
  cert_type: string;
  status: string;
  priority: string;
  product_id?: {
    _id: string;
    name: string;
    brand?: string;
    category?: string;
    deleted_at?: string;
  };
  created_by?: { _id: string; name: string; email: string };
  assignees?: Array<{ _id: string; name: string; email: string; role: string }>;
  primary_assignee?: { _id: string; name: string; email: string };
  fee?: { base_inr: number; expedited: boolean; paid: boolean };
  notes?: string;
  status_history?: Array<{
    from: string;
    to: string;
    by: string;
    at: string;
    reason?: string;
  }>;
  documents?: Array<{
    document_id: string;
    required_for_stage: string;
    label: string;
    added_at: string;
  }>;
  estimated_completion_at?: string;
  submitted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateApplicationRequest {
  product_id: string;
  cert_type: string;
  priority?: 'low' | 'medium' | 'high';
  notes?: string;
}

export interface ApplicationsResponse {
  data: Application[];
  pagination: { total: number; page: number; limit: number; total_pages: number };
}

const applicationsService = {
  getAll: (params?: { page?: number; limit?: number; status?: string; cert_type?: string }) =>
    api.get<ApplicationsResponse>('/applications', { params }),

  getById: (id: string) =>
    api.get<{ data: Application }>(`/applications/${id}`),

  create: (data: CreateApplicationRequest) =>
    api.post<{ data: Application }>('/applications', data),

  updateStatus: (id: string, status: string, notes?: string) =>
    api.put<{ data: Application }>(`/applications/${id}/status`, { status, notes }),

  transition: (id: string, to_status: string, reason?: string) =>
    api.post<{ data: Application }>(`/applications/${id}/transition`, { to_status, reason }),

  uploadDocument: (id: string, formData: FormData, onProgress?: (p: number) => void) =>
    api.uploadFile<{ data: any }>(`/applications/${id}/documents`, formData, onProgress),

  getTimeline: (id: string) =>
    api.get<{ data: Application }>(`/applications/${id}`),

  getAudit: (id: string) =>
    api.get<{ data: any[] }>(`/applications/${id}/audit`),

  assignTo: (id: string, userId: string) =>
    api.put<{ data: Application }>(`/applications/${id}/assign`, { assigned_to: userId }),

  delete: (id: string) =>
    api.delete<{ message: string }>(`/applications/${id}`),
};

export default applicationsService;
