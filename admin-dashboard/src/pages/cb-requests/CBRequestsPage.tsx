import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Inbox, Search, Loader2, ChevronLeft, ChevronRight, Eye } from 'lucide-react'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import EmptyState from '../../components/common/EmptyState'
import { formatDate } from '../../utils/formatters'
import { cbService, CB_REQUEST_STATUSES, prettyStatus } from '../../services/cbService'

const card: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }
const muted: React.CSSProperties = { color: 'var(--text-muted)', fontSize: 13 }
const inputStyle: React.CSSProperties = { padding: '9px 12px', background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', outline: 'none', fontSize: 13 }
const th: React.CSSProperties = { textAlign: 'left', padding: '10px 14px', color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, whiteSpace: 'nowrap' }
const td: React.CSSProperties = { padding: '12px 14px', fontSize: 13, color: 'var(--text-primary)', borderTop: '1px solid var(--border)', verticalAlign: 'middle', whiteSpace: 'nowrap' }

// Metric buckets map 1:1 to real backend statuses (no invented states).
const METRICS: { key: string; label: string }[] = [
  { key: 'submitted', label: 'New' },
  { key: 'sent_to_cb', label: 'Sent to CB' },
  { key: 'acknowledged', label: 'Acknowledged' },
  { key: 'quote_received', label: 'Quote Received' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'closed', label: 'Completed' },
]

export default function CBRequestsPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [certType, setCertType] = useState('')
  const [market, setMarket] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const limit = 20

  const { data: staff } = useQuery({ queryKey: ['cb-staff'], queryFn: () => cbService.listStaff() })
  const { data: metrics } = useQuery({
    queryKey: ['cb-request-metrics'],
    queryFn: async () => {
      const entries = await Promise.all(METRICS.map(async (m) => {
        const r = await cbService.listRequests({ status: m.key, limit: 1 })
        return [m.key, r?.pagination?.total || 0] as const
      }))
      return Object.fromEntries(entries) as Record<string, number>
    },
  })
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['cb-requests', page, q, status, certType, market, assignedTo],
    queryFn: () => cbService.listRequests({ page, limit, q: q || undefined, status: status || undefined, cert_type: certType || undefined, market: market || undefined, assigned_to: assignedTo || undefined }),
  })

  const items: any[] = data?.data || []
  const pagination = data?.pagination || { page: 1, total_pages: 1, total: 0 }
  const submitSearch = () => { setQ(search.trim()); setPage(1) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, margin: 0, color: 'var(--text-primary)', fontSize: 22, fontWeight: 800 }}><Inbox size={22} color="var(--accent-purple)" /> CB Requests</h1>
        <p style={{ ...muted, margin: '4px 0 0' }}>{pagination.total} requests</p>
      </div>

      {/* Metrics (real backend counts) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        {METRICS.map(m => (
          <div key={m.key} onClick={() => { setStatus(m.key); setPage(1) }} style={{ ...card, cursor: 'pointer', padding: 16, borderColor: status === m.key ? 'var(--accent-purple)' : 'var(--border)' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>{m.label}</div>
            <div style={{ color: 'var(--text-primary)', fontSize: 26, fontWeight: 800, marginTop: 6 }}>{metrics ? (metrics[m.key] ?? 0) : '—'}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ ...card, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitSearch()} placeholder="Search request ID…" style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', paddingLeft: 32 }} />
        </div>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} style={inputStyle}>
          <option value="">All statuses</option>
          {CB_REQUEST_STATUSES.map(s => <option key={s} value={s}>{prettyStatus(s)}</option>)}
        </select>
        <input value={certType} onChange={e => { setCertType(e.target.value); setPage(1) }} placeholder="Certification" style={{ ...inputStyle, width: 130 }} />
        <input value={market} onChange={e => { setMarket(e.target.value.toUpperCase()); setPage(1) }} placeholder="Market" style={{ ...inputStyle, width: 90 }} />
        <select value={assignedTo} onChange={e => { setAssignedTo(e.target.value); setPage(1) }} style={inputStyle}>
          <option value="">Any assignee</option>
          {(staff || []).map((u: any) => <option key={u._id} value={u._id}>{u.name}</option>)}
        </select>
        <Button size="sm" variant="secondary" onClick={submitSearch}>Search</Button>
      </div>

      {/* Table / states */}
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Loader2 className="animate-spin" size={26} color="var(--text-muted)" /></div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: 48 }}><p style={{ color: 'var(--accent-coral)', marginBottom: 12 }}>Failed to load requests.</p><Button size="sm" variant="secondary" onClick={() => refetch()}>Retry</Button></div>
        ) : items.length === 0 ? (
          <div style={{ padding: 32 }}><EmptyState icon="📥" title="No CB requests" subtitle={q || status || certType || market || assignedTo ? 'No requests match these filters.' : 'Customer quote requests will appear here.'} /></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
              <thead><tr>
                <th style={th}>Request ID</th><th style={th}>Customer</th><th style={th}>Product</th><th style={th}>Certification</th><th style={th}>Market</th>
                <th style={th}>Certification Body</th><th style={th}>Status</th><th style={th}>Assigned</th><th style={th}>Created</th><th style={th}>Updated</th><th style={th}>Actions</th>
              </tr></thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/cb-requests/${r._id}`)}>
                    <td style={{ ...td, fontWeight: 600, color: 'var(--accent-purple)' }}>{r.request_number}</td>
                    <td style={td}>{r.customer_id?.name || r.user_id?.name || r.user_id?.email || <span style={muted}>—</span>}</td>
                    <td style={td}>{r.product_id?.name || <span style={muted}>—</span>}</td>
                    <td style={td}>{r.cert_type || <span style={muted}>—</span>}</td>
                    <td style={td}>{r.market || <span style={muted}>—</span>}</td>
                    <td style={td}>{r.certification_body_id?.name || <span style={muted}>—</span>}</td>
                    <td style={td}><Badge status={r.status} size="sm" /></td>
                    <td style={td}>{r.assigned_to?.name || <span style={muted}>Unassigned</span>}</td>
                    <td style={td}><span style={muted}>{formatDate(r.created_at)}</span></td>
                    <td style={td}><span style={muted}>{formatDate(r.updated_at)}</span></td>
                    <td style={td} onClick={e => e.stopPropagation()}><button title="View" onClick={() => navigate(`/cb-requests/${r._id}`)} style={iconBtn}><Eye size={15} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!isLoading && !error && items.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={muted}>Page {pagination.page} of {pagination.total_pages}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} style={pageBtn}><ChevronLeft size={16} /></button>
            <button disabled={page >= pagination.total_pages} onClick={() => setPage(p => p + 1)} style={pageBtn}><ChevronRight size={16} /></button>
          </div>
        </div>
      )}
    </div>
  )
}

const iconBtn: React.CSSProperties = { display: 'flex', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 6, padding: 6, cursor: 'pointer', color: 'var(--text-secondary)' }
const pageBtn: React.CSSProperties = { display: 'flex', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, padding: 7, cursor: 'pointer', color: 'var(--text-secondary)' }
