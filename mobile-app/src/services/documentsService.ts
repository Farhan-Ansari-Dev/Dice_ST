import api from './api';
// SDK 54 moved uploadAsync/readAsStringAsync into the legacy entrypoint; the new
// File API has no binary-PUT helper. Legacy is the supported path for a raw S3 PUT.
import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';

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

  /**
   * Upload a file the user picked on-device to the real Document store.
   *
   * Mirrors the admin dashboard's proven flow (documentService.ts): presign →
   * direct binary PUT to S3 (Content-Type only — the presigned URL signs no
   * other client headers) → finalize, which records the Document + version
   * server-side. Replaces the previous local-only Vault behaviour that showed
   * "uploaded" but never persisted the file.
   *
   * Throws on any failure so the caller can surface a real error instead of a
   * false success. On-device verification required (the S3 PUT cannot be
   * exercised locally — dev backend has placeholder AWS credentials).
   */
  uploadFromDevice: async (
    fileUri: string,
    name: string,
    mimeType: string,
    docType: string = 'general',
    applicationId?: string,
  ): Promise<Document> => {
    const info = await FileSystem.getInfoAsync(fileUri);
    if (!info.exists) throw new Error('The selected file could not be read.');
    const sizeBytes = info.size ?? 0;

    // Real content-derived digest. finalize stores sha256 as an integrity marker
    // (it does not re-verify it against the object), so hashing the file's base64
    // content is sufficient and avoids raw byte-buffer handling RN lacks a stable
    // API for.
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const sha256 = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, base64);

    // 1. Presign a direct-to-S3 PUT.
    const presign = await api.post<{ data: { url: string; s3_key: string } }>(
      '/documents/presign',
      { filename: name, mime_type: mimeType, size_bytes: sizeBytes, sha256, doc_type: docType },
    );
    const { url, s3_key } = presign.data;

    // 2. PUT the raw bytes straight to S3. No Authorization header (that would
    //    break the S3 signature); Content-Type must match what was presigned.
    const put = await FileSystem.uploadAsync(url, fileUri, {
      httpMethod: 'PUT',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: { 'Content-Type': mimeType },
    });
    if (put.status < 200 || put.status >= 300) {
      throw new Error(`Upload to secure storage failed (${put.status}).`);
    }

    // 3. Finalize — server verifies the object exists and records the Document.
    const finalized = await api.post<{ data: { document: Document; version: unknown } }>(
      '/documents/finalize',
      { s3_key, name, doc_type: docType, mime_type: mimeType, size_bytes: sizeBytes, sha256, application_id: applicationId },
    );
    return finalized.data.document;
  },

  getDownloadUrl: (id: string) =>
    api.get<{ data: { url: string; expiresIn: number } }>(`/documents/${id}/download`),

  saveScanResult: (name: string, ocrText: string, category: string, applicationId?: string) =>
    api.post<{ data: Document }>('/documents/scan', { name, ocr_text: ocrText, category, application_id: applicationId }),

  delete: (id: string) =>
    api.delete<{ message: string }>(`/documents/${id}`),
};

export default documentsService;
