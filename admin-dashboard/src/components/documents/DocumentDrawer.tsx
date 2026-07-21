import { useRef, useState } from 'react'
import { X, Download, Upload } from 'lucide-react'
import { formatDate, formatFileSize } from '../../utils/formatters'
import { currentVersion, statusOf } from './docHelpers'
import DocumentPreview from './DocumentPreview'

/**
 * Document Details Drawer — inline preview (PDF.js / image / fallback) plus the
 * version's metadata. The user never leaves the dashboard (Drive/Dropbox-style).
 */
export default function DocumentDrawer({
  doc, version, onClose, onDownload, onReplace,
}: {
  doc: any
  version?: any            // specific version to preview (from history); defaults to current
  onClose: () => void
  onDownload: (doc: any) => void
  onReplace?: (doc: any, file: File) => Promise<void> | void
}) {
  const v = version ?? currentVersion(doc)
  const st = statusOf(v)
  const fileRef = useRef<HTMLInputElement>(null)
  const [replacing, setReplacing] = useState(false)

  const pickReplacement = async (file: File) => {
    if (!onReplace) return
    setReplacing(true)
    try { await onReplace(doc, file) } finally {
      setReplacing(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
      <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{label}</span>
      <span style={{ color: 'var(--text-primary)', textAlign: 'right', wordBreak: 'break-all' }}>{value ?? 'Unknown'}</span>
    </div>
  )

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(640px, 96vw)', height: '100%', background: 'var(--bg-card)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 24px rgba(0,0,0,0.2)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name || 'Document'}</div>
            <div style={{ color: st.color, fontSize: 11, fontWeight: 600, marginTop: 2 }}>{st.label}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
            {onReplace && (
              <>
                <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) pickReplacement(f) }} />
                <button onClick={() => fileRef.current?.click()} disabled={replacing} title="Upload a new version" style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', padding: '6px 12px', cursor: replacing ? 'default' : 'pointer', fontSize: 12, opacity: replacing ? 0.6 : 1 }}><Upload size={13} /> {replacing ? 'Uploading…' : 'Replace'}</button>
              </>
            )}
            <button onClick={() => onDownload(doc)} title="Download" style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}><Download size={13} /> Download</button>
            <button onClick={onClose} title="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
          </div>
        </div>

        {/* Inline preview */}
        <div style={{ flex: 1, minHeight: 0, padding: 16 }}>
          <DocumentPreview
            docId={doc._id}
            versionNumber={v?.version_number}
            mimeType={v?.mime_type || ''}
            onDownload={() => onDownload(doc)}
          />
        </div>

        {/* Details */}
        <div style={{ padding: '10px 18px 18px', borderTop: '1px solid var(--border)', maxHeight: '38%', overflowY: 'auto' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, margin: '4px 0 6px' }}>Details</div>
          <Row label="File size" value={v?.size_bytes != null ? formatFileSize(v.size_bytes) : 'Unknown'} />
          <Row label="Type" value={v?.mime_type || 'Unknown'} />
          <Row label="Version" value={v?.version_number != null ? `v${v.version_number}` : 'Unknown'} />
          <Row label="Processing status" value={st.label} />
          <Row label="Uploaded by" value={v?.uploaded_by?.name || doc.uploaded_by?.name || 'Unknown'} />
          <Row label="Upload date" value={v?.uploaded_at ? formatDate(v.uploaded_at) : (doc.created_at ? formatDate(doc.created_at) : 'Unknown')} />
          <Row label="SHA-256" value={v?.sha256 ? <span style={{ fontFamily: 'monospace', fontSize: 10 }}>{v.sha256}</span> : 'Unknown'} />
          {doc.description ? <Row label="Description" value={doc.description} /> : null}
          {Array.isArray(doc.tags) && doc.tags.length ? <Row label="Tags" value={doc.tags.join(', ')} /> : null}
        </div>
      </div>
    </div>
  )
}
