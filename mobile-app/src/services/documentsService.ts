import api from './api';

export interface Document {
  _id: string;
  name: string;
  doc_type: string;
  size_bytes: number;
  s3_key: string;
  s3_url?: string;
  category?: string;
  application_id?: string;
  verified?: boolean;
  uploaded_by?: { _id: string; name: string };
  ocr_text?: string;
  created_at: string;
}

const documentsService = {
  getAll: (params?: { category?: string; application_id?: string }) =>
    api.get<{ data: Document[] }>('/documents', { params }),

  upload: (formData: FormData, onProgress?: (p: number) => void) =>
    api.uploadFile<{ data: Document }>('/documents/upload', formData, onProgress),

  getPresignedUrl: (filename: string, contentType: string) =>
    api.post<{ data: { uploadUrl: string; key: string; publicUrl: string } }>('/documents/presigned-url', { filename, content_type: contentType }),

  getDownloadUrl: (id: string) =>
    api.get<{ data: { url: string; expiresIn: number } }>(`/documents/${id}/download`),

  saveScanResult: (name: string, ocrText: string, category: string, applicationId?: string) =>
    api.post<{ data: Document }>('/documents/scan', { name, ocr_text: ocrText, category, application_id: applicationId }),

  delete: (id: string) =>
    api.delete<{ message: string }>(`/documents/${id}`),
};

export default documentsService;
