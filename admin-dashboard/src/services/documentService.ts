import { apiClient } from './apiClient'

/**
 * Single client-side surface for the Documents API. Every document call goes
 * through here so callers stay thin and the endpoints live in one place.
 * Does not change any request/response contract — only centralizes them.
 */

export interface ListParams { q?: string; page?: number; limit?: number }
export interface ListResult {
  data: any[]
  pagination?: { page: number; limit: number; total: number }
}
export interface UploadOpts { documentId?: string; docType?: string }

async function sha256Hex(file: File): Promise<string> {
  const buf = await file.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export const documentService = {
  async list(params: ListParams = {}): Promise<ListResult> {
    const sp = new URLSearchParams()
    if (params.q) sp.set('q', params.q)
    if (params.page) sp.set('page', String(params.page))
    if (params.limit) sp.set('limit', String(params.limit))
    const qs = sp.toString()
    const res = await apiClient.get(`/documents${qs ? `?${qs}` : ''}`)
    return res.data
  },

  // Full S3 flow: presign → direct browser PUT → finalize. Passing documentId
  // uploads a new immutable version of an existing document.
  async upload(file: File, opts: UploadOpts = {}): Promise<{ document: any; version: any }> {
    const sha256 = await sha256Hex(file)
    const mime = file.type || 'application/octet-stream'
    const docType = opts.docType || 'general'
    const presign = await apiClient.post('/documents/presign', {
      filename: file.name, mime_type: mime, size_bytes: file.size, sha256, doc_type: docType,
      ...(opts.documentId ? { document_id: opts.documentId } : {}),
    })
    const { url, s3_key } = presign.data.data
    // Plain fetch — presigned S3 URLs must not carry our Authorization header.
    const put = await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': mime } })
    if (!put.ok) throw new Error(`S3 upload failed (${put.status})`)
    const fin = await apiClient.post('/documents/finalize', {
      s3_key, name: file.name, doc_type: docType, mime_type: mime, size_bytes: file.size, sha256,
      ...(opts.documentId ? { document_id: opts.documentId } : {}),
    })
    return fin.data.data
  },

  // Inline preview URL (Content-Disposition: inline). Accepts an AbortSignal so
  // callers can cancel in-flight requests on unmount.
  async previewUrl(id: string, versionNumber?: number, config?: { signal?: AbortSignal }): Promise<string> {
    const q = versionNumber ? `?version=${versionNumber}` : ''
    const res = await apiClient.get(`/documents/${id}/preview${q}`, config)
    return res.data.data.url
  },

  // Download URL (Content-Disposition: attachment).
  async downloadUrl(id: string, versionNumber?: number): Promise<string> {
    const q = versionNumber ? `?version=${versionNumber}` : ''
    const res = await apiClient.get(`/documents/${id}/download${q}`)
    return res.data.data.url
  },

  async versions(id: string): Promise<any[]> {
    const res = await apiClient.get(`/documents/${id}/versions`)
    return res.data.data || []
  },

  async remove(id: string) {
    return apiClient.delete(`/documents/${id}`)
  },
}
