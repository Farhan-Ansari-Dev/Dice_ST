import React, { useState, useRef, useEffect } from 'react'
import { FileText, Upload, Download, Trash2, Search, Eye, History, X } from 'lucide-react'
import Button from '../../components/common/Button'
import { formatDate, formatFileSize } from '../../utils/formatters'
import { currentVersion, statusOf } from '../../components/documents/docHelpers'
import DocumentDrawer from '../../components/documents/DocumentDrawer'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../services/apiClient'
import { toast } from '../../store/toastStore'

const CAT_COLORS: Record<string, string> = { 'Test Report': '#6C63FF', Inspection: '#00D4FF', Declaration: '#00C896', 'Audit Report': '#FFB347', Manual: '#FF6B9D', License: '#FF6B6B' }

async function sha256Hex(file: File): Promise<string> {
  const buf = await file.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function DocumentsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Debounce the search box → server-side search (MongoDB text index on name/description/tags).
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  const { data: result, isLoading } = useQuery({
    queryKey: ['documents', { q: debouncedSearch }],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set('q', debouncedSearch)
      const qs = params.toString()
      const res = await apiClient.get(`/documents${qs ? `?${qs}` : ''}`)
      return res.data as { data: any[]; pagination?: { page: number; limit: number; total: number } }
    },
    placeholderData: (prev) => prev,   // keep results visible while typing
  })
  const docs: any[] = result?.data || []
  const total = result?.pagination?.total ?? docs.length

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      toast.success('Document deleted')
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Delete failed')
  })

  // Full S3 flow: presign → direct browser PUT to S3 → finalize metadata.
  // Same flow for a brand-new document and for a new version — the only
  // difference is passing document_id (which the backend already supports).
  const uploadFile = async (file: File, opts?: { documentId?: string; docType?: string }) => {
    const sha256 = await sha256Hex(file)
    const mime = file.type || 'application/octet-stream'
    const docType = opts?.docType || 'general'
    const presignRes = await apiClient.post('/documents/presign', {
      filename: file.name, mime_type: mime, size_bytes: file.size, sha256, doc_type: docType,
      ...(opts?.documentId ? { document_id: opts.documentId } : {}),
    })
    const { url, s3_key } = presignRes.data.data
    // Plain fetch — presigned S3 URLs must not carry our Authorization header
    const s3Res = await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': mime } })
    if (!s3Res.ok) throw new Error(`S3 upload failed (${s3Res.status})`)
    const finRes = await apiClient.post('/documents/finalize', {
      s3_key, name: file.name, doc_type: docType, mime_type: mime, size_bytes: file.size, sha256,
      ...(opts?.documentId ? { document_id: opts.documentId } : {}),
    })
    return finRes.data.data as { document: any; version: any }
  }

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      await uploadFile(file)
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      toast.success('Document uploaded')
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Preview now happens INLINE in the drawer (no new browser tab).
  const [drawer, setDrawer] = useState<{ doc: any; version?: any } | null>(null)

  // Replace Version: upload a new immutable version of an existing document.
  const handleReplace = async (doc: any, file: File) => {
    try {
      const { version } = await uploadFile(file, { documentId: doc._id, docType: doc.doc_type })
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      // Reflect the new current version immediately in the open drawer.
      setDrawer(d => (d && d.doc._id === doc._id)
        ? { doc: { ...d.doc, current_version_id: version, version_count: (d.doc.version_count || 1) + 1 } }
        : d)
      toast.success(`New version uploaded (v${version.version_number})`)
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Replace failed')
    }
  }

  const downloadDocument = async (doc: any, versionNumber?: number) => {
    try {
      const q = versionNumber ? `?version=${versionNumber}` : ''
      const res = await apiClient.get(`/documents/${doc._id}/download${q}`)
      const link = document.createElement('a')
      link.href = res.data.data.url
      link.setAttribute('download', doc.name || 'document')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Could not fetch download link')
    }
  }

  // Read-only version history (Phase 1). Replace Version is Phase 2.
  const [historyDoc, setHistoryDoc] = useState<any>(null)
  const [versions, setVersions] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const openHistory = async (doc: any) => {
    setHistoryDoc(doc)
    setVersions([])
    setHistoryLoading(true)
    try {
      const res = await apiClient.get(`/documents/${doc._id}/versions`)
      setVersions(res.data.data || [])
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Could not load version history')
    } finally {
      setHistoryLoading(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ color: 'var(--text-primary)', fontSize: 20, fontWeight: 700, margin: 0 }}>Documents</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 0' }}>{total} documents · Powered by AWS S3</p>
        </div>
        <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f) }} />
        <Button icon={<Upload size={14} />} size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
          {uploading ? 'Uploading…' : 'Upload Document'}
        </Button>
      </div>

      <div style={{ position: 'relative', marginBottom: 20, maxWidth: 360 }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents…"
          style={{ width: '100%', padding: '9px 12px 9px 36px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
      </div>

      {isLoading ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading documents...</p>
      ) : docs.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>{debouncedSearch ? 'No documents match your search.' : 'No documents found. Upload one to get started.'}</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {docs.map((doc: any) => (
            <div key={doc.id || doc._id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px', transition: 'var(--transition)' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-light)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: (CAT_COLORS[doc.category] ?? '#6C63FF') + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={18} color={CAT_COLORS[doc.category] ?? '#6C63FF'} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name || 'Document'}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>{currentVersion(doc)?.size_bytes != null ? formatFileSize(currentVersion(doc).size_bytes) : 'Unknown'}</div>
                </div>
                <button onClick={() => { if (window.confirm(`Delete "${doc.name}"?`)) deleteMutation.mutate(doc._id) }} title="Delete"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, flexShrink: 0 }}>
                  <Trash2 size={14} />
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ background: (CAT_COLORS[doc.category] ?? '#6C63FF') + '18', color: CAT_COLORS[doc.category] ?? '#6C63FF', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>{doc.doc_type || doc.category || 'General'}</span>
                <span style={{ color: statusOf(currentVersion(doc)).color, fontSize: 11, fontWeight: 600 }}>{statusOf(currentVersion(doc)).label}</span>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 12 }}>{doc.created_at ? formatDate(doc.created_at) : 'Just now'} · by {doc.uploaded_by?.name || 'Unknown'}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setDrawer({ doc })} style={{ flex: 1, background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', padding: '6px 0', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}><Eye size={12} /> Preview</button>
                <button onClick={() => downloadDocument(doc)} style={{ flex: 1, background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', padding: '6px 0', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}><Download size={12} /> Download</button>
                <button onClick={() => openHistory(doc)} title="Version history" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', padding: '6px 10px', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><History size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {historyDoc && (
        <div onClick={() => setHistoryDoc(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20, width: '100%', maxWidth: 560, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 16 }}>Version History</h3>
              <button onClick={() => setHistoryDoc(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '0 0 16px' }}>{historyDoc.name}</p>
            {historyLoading ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</p>
            ) : versions.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No versions found.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {versions.map((v: any) => (
                  <div key={v._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, border: '1px solid var(--border)', borderRadius: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>v{v.version_number}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: 'var(--text-primary)', fontSize: 12, fontWeight: 600 }}>{v.size_bytes != null ? formatFileSize(v.size_bytes) : 'Unknown'} · <span style={{ color: statusOf(v).color }}>{statusOf(v).label}</span></div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{v.mime_type || 'Unknown'} · {v.uploaded_at ? formatDate(v.uploaded_at) : 'Unknown'} · by {v.uploaded_by?.name || 'Unknown'}</div>
                    </div>
                    <button onClick={() => { const d = historyDoc; setHistoryDoc(null); setDrawer({ doc: d, version: v }) }} title="Preview" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-secondary)', padding: '5px 8px', cursor: 'pointer' }}><Eye size={13} /></button>
                    <button onClick={() => downloadDocument(historyDoc, v.version_number)} title="Download" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-secondary)', padding: '5px 8px', cursor: 'pointer' }}><Download size={13} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {drawer && (
        <DocumentDrawer
          doc={drawer.doc}
          version={drawer.version}
          onClose={() => setDrawer(null)}
          onDownload={(d: any) => downloadDocument(d, drawer.version?.version_number)}
          onReplace={handleReplace}
        />
      )}
    </div>
  )
}
