import React, { useState, useRef } from 'react'
import { FileText, Upload, Download, Trash2, Search, Eye } from 'lucide-react'
import Button from '../../components/common/Button'
import { formatDate, formatFileSize } from '../../utils/formatters'

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
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: docs, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const res = await apiClient.get('/documents')
      return res.data.data || []
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      toast.success('Document deleted')
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Delete failed')
  })

  // Full S3 flow: presign → direct browser PUT to S3 → finalize metadata
  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const sha256 = await sha256Hex(file)
      const presignRes = await apiClient.post('/documents/presign', {
        filename: file.name,
        mime_type: file.type || 'application/octet-stream',
        size_bytes: file.size,
        sha256,
        doc_type: 'general',
      })
      const { url, s3_key } = presignRes.data.data

      // Plain fetch — presigned S3 URLs must not carry our Authorization header
      const s3Res = await fetch(url, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
      })
      if (!s3Res.ok) throw new Error(`S3 upload failed (${s3Res.status})`)

      await apiClient.post('/documents/finalize', {
        s3_key,
        name: file.name,
        doc_type: 'general',
        mime_type: file.type || 'application/octet-stream',
        size_bytes: file.size,
        sha256,
      })
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      toast.success('Document uploaded')
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const openDocument = async (doc: any, download: boolean) => {
    try {
      const res = await apiClient.get(`/documents/${doc._id}/download`)
      const url = res.data.data.url
      if (download) {
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', doc.name || 'document')
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } else {
        window.open(url, '_blank', 'noopener,noreferrer')
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Could not fetch download link')
    }
  }

  const filtered = (docs || []).filter((d: any) =>
    (d.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (d.org_id?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (d.doc_type || d.category || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ color: 'var(--text-primary)', fontSize: 20, fontWeight: 700, margin: 0 }}>Documents</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 0' }}>{filtered.length} documents · Powered by AWS S3</p>
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
      ) : filtered.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>No documents found. Upload one to get started.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {filtered.map((doc: any) => (
            <div key={doc.id || doc._id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px', transition: 'var(--transition)' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-light)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: (CAT_COLORS[doc.category] ?? '#6C63FF') + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={18} color={CAT_COLORS[doc.category] ?? '#6C63FF'} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name || 'Document'}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>{formatFileSize(doc.size_bytes || doc.size || 0)} · {doc.org_id?.name || 'Unknown'}</div>
                </div>
                <button onClick={() => { if (window.confirm(`Delete "${doc.name}"?`)) deleteMutation.mutate(doc._id) }} title="Delete"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, flexShrink: 0 }}>
                  <Trash2 size={14} />
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ background: (CAT_COLORS[doc.category] ?? '#6C63FF') + '18', color: CAT_COLORS[doc.category] ?? '#6C63FF', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>{doc.doc_type || doc.category || 'General'}</span>
                {doc.verified ? <span style={{ color: '#00C896', fontSize: 11 }}>✓ Verified</span> : <span style={{ color: '#FFB347', fontSize: 11 }}>⏳ Pending</span>}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 12 }}>{doc.created_at ? formatDate(doc.created_at) : 'Just now'} · by {doc.uploaded_by?.name || 'Unknown'}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => openDocument(doc, false)} style={{ flex: 1, background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', padding: '6px 0', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}><Eye size={12} /> Preview</button>
                <button onClick={() => openDocument(doc, true)} style={{ flex: 1, background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', padding: '6px 0', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}><Download size={12} /> Download</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
