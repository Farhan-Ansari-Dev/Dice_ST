import api from './api';

export interface Application {
  id: string;
  application_number: string;
  cert_type: string;
  product_name: string;
  product_category: string;
  status: string;
  assigned_to?: string;
  assignee_name?: string;
  client_name?: string;
  company_name?: string;
  priority: string;
  estimated_completion?: string;
  notes?: string;
  progress?: number;
  amount?: number;
  created_at: string;
  updated_at: string;
  timeline?: ApplicationEvent[];
}

export interface ApplicationEvent {
  id: string;
  event_type: string;
  description: string;
  actor_name?: string;
  created_at: string;
}

export interface CreateApplicationRequest {
  cert_type: string;
  product_name: string;
  product_category?: string;
  notes?: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface ApplicationsResponse {
  data: Application[];
  pagination: { total: number; page: number; limit: number; pages: number };
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

  uploadDocument: (id: string, formData: FormData, onProgress?: (p: number) => void) =>
    api.uploadFile<{ data: any }>(`/applications/${id}/documents`, formData, onProgress),

  getTimeline: (id: string) =>
    api.get<{ data: ApplicationEvent[] }>(`/applications/${id}/timeline`),

  assignTo: (id: string, userId: string) =>
    api.put<{ data: Application }>(`/applications/${id}/assign`, { assigned_to: userId }),

  delete: (id: string) =>
    api.delete<{ message: string }>(`/applications/${id}`),
};

export default applicationsService;
