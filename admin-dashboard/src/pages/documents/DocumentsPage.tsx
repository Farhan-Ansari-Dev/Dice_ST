import React, { useState } from 'react'
import { FileText, Upload, Download, Trash2, Search, Eye } from 'lucide-react'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import { formatDate, formatFileSize } from '../../utils/formatters'

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../services/apiClient'

const CAT_COLORS: Record<string, string> = { 'Test Report': '#6C63FF', Inspection: '#00D4FF', Declaration: '#00C896', 'Audit Report': '#FFB347', Manual: '#FF6B9D', License: '#FF6B6B' }

export default function DocumentsPage() {
  const [search, setSearch] = useState('')
  
  const { data: docs, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const res = await apiClient.get('/documents')
      return res.data.data || []
    }
  })

  // Grouping logic based on user's request (categorised according to company wise / ib / test lab)
  // Backend returns documents which we map here.
  const filtered = (docs || []).filter((d: any) => 
    (d.name || '').toLowerCase().includes(search.toLowerCase()) || 
    (d.org_id?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (d.category || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ color: 'var(--text-primary)', fontSize: 20, fontWeight: 700, margin: 0 }}>Documents</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 0' }}>{filtered.length} documents · Powered by AWS S3</p>
        </div>
        <Button icon={<Upload size={14} />} size="sm">Upload Document</Button>
      </div>

      <div style={{ position: 'relative', marginBottom: 20, maxWidth: 360 }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents…"
          style={{ width: '100%', padding: '9px 12px 9px 36px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {filtered.map((doc: any) => (
          <div key={doc.id || doc._id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px', transition: 'var(--transition)', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-light)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: (CAT_COLORS[doc.category] ?? '#6C63FF') + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileText size={18} color={CAT_COLORS[doc.category] ?? '#6C63FF'} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name || 'Document'}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>{formatFileSize(doc.size || 0)} · {doc.org_id?.name || 'Unknown'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ background: (CAT_COLORS[doc.category] ?? '#6C63FF') + '18', color: CAT_COLORS[doc.category] ?? '#6C63FF', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>{doc.category || 'General'}</span>
              {doc.verified ? <span style={{ color: '#00C896', fontSize: 11 }}>✓ Verified</span> : <span style={{ color: '#FFB347', fontSize: 11 }}>⏳ Pending</span>}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 12 }}>{doc.application_id || 'Global'} · {doc.created_at ? formatDate(doc.created_at) : 'Just now'}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ flex: 1, background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', padding: '6px 0', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}><Eye size={12} /> Preview</button>
              <button style={{ flex: 1, background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', padding: '6px 0', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}><Download size={12} /> Download</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
