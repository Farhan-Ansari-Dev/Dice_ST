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
  // Staff-requested documents the applicant must supply (certification flow).
  required_documents?: Array<{
    _id: string;
    doc_type: string;
    label: string;
    stage?: string;
    status: 'pending' | 'submitted' | 'accepted' | 'rejected';
    document_id?: string | { _id: string; name?: string };
    note?: string;
    requested_at?: string;
    submitted_at?: string;
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

  /** Applications where the current user is an assignee (verified consultants).
   *  The backend scopes strictly to `assignees: me`, so this never leaks other
   *  users' applications regardless of client-side gating. */
  getAssignedToMe: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get<ApplicationsResponse>('/applications', { params: { ...params, assignee_to_me: 'true' } }),

  getById: (id: string) =>
    api.get<{ data: Application }>(`/applications/${id}`),

  create: (data: CreateApplicationRequest) =>
    api.post<{ data: Application }>('/applications', data),

  // Both go through the single transition path. `PUT /:id/status` was removed
  // server-side; updateStatus now maps status/notes onto the transition contract.
  updateStatus: (id: string, status: string, notes?: string) =>
    api.post<{ data: Application }>(`/applications/${id}/transition`, { to_status: status, reason: notes }),

  transition: (id: string, to_status: string, reason?: string) =>
    api.post<{ data: Application }>(`/applications/${id}/transition`, { to_status, reason }),

  uploadDocument: (id: string, formData: FormData, onProgress?: (p: number) => void) =>
    api.uploadFile<{ data: any }>(`/applications/${id}/documents`, formData, onProgress),

  // Certification flow — link an uploaded Document to a requested requirement.
  submitDocument: (id: string, requirementId: string, documentId: string) =>
    api.post<{ data: Application }>(`/applications/${id}/submit-document`, { requirement_id: requirementId, document_id: documentId }),

  // Unified activity feed: status history + audit + linked testing/inspection.
  getTimeline: (id: string) =>
    api.get<{ data: any[] }>(`/applications/${id}/timeline`),

  getAudit: (id: string) =>
    api.get<{ data: any[] }>(`/applications/${id}/audit`),

  assignTo: (id: string, userId: string) =>
    api.put<{ data: Application }>(`/applications/${id}/assign`, { assigned_to: userId }),

  assign: (id: string, userIds: string[], primary?: string) =>
    api.post<{ data: Application }>(`/applications/${id}/assign`, { user_ids: userIds, primary }),

  unassign: (id: string) =>
    api.delete<{ data: Application }>(`/applications/${id}/assign`),

  escalate: (id: string, managerId: string, reason: string) =>
    api.post<{ data: Application }>(`/applications/${id}/escalate`, { manager_id: managerId, reason }),

  // Admin escape hatch — bypasses the state machine; reason required.
  override: (id: string, toStatus: string, reason: string) =>
    api.post<{ data: Application }>(`/applications/${id}/override`, { to_status: toStatus, reason }),

  delete: (id: string) =>
    api.delete<{ message: string }>(`/applications/${id}`),
};

export default applicationsService;
