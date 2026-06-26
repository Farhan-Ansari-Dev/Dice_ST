import React, { useState } from 'react'
import { List, LayoutGrid, Plus, Search, Loader2, Trash2, RefreshCcw } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Badge from '../../components/common/Badge'
import Avatar from '../../components/common/Avatar'
import Button from '../../components/common/Button'
import { formatDate } from '../../utils/formatters'
import { apiClient } from '../../services/apiClient'
import { toast } from '../../store/toastStore'

const COLS = [
  { key: 'draft', label: 'Draft', color: '#8B92A5' },
  { key: 'submitted', label: 'Submitted', color: '#00D4FF' },
  { key: 'docs_review', label: 'Under Review', color: '#FFB347' },
  { key: 'testing', label: 'Lab Testing', color: '#9B59B6' },
  { key: 'approved', label: 'Approved', color: '#00C896' },
  { key: 'rejected', label: 'Rejected', color: '#FF6B6B' },
]

const PRIORITY_COLOR: Record<string, string> = { high: '#FF6B6B', urgent: '#FF6B6B', medium: '#FFB347', low: '#00C896' }

export default function ApplicationsPage() {
  const queryClient = useQueryClient()
  const [view, setView] = useState<'kanban' | 'list'>('kanban')
  const [search, setSearch] = useState('')
  const [quoteModalVisible, setQuoteModalVisible] = useState(false)
  const [selectedApp, setSelectedApp] = useState<any>(null)
  const [govFee, setGovFee] = useState('')
  const [labFee, setLabFee] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['applications'],
    queryFn: async () => {
      const res = await apiClient.get('/applications')
      return res.data.data
    }
  })

  // Map backend IApplication to UI shape
  const APPS = (data || []).map((app: any) => ({
    _id: app._id,
    id: app.application_number,
    client: 'My Organization', // In a multi-tenant admin, this would be populated from org_id
    type: app.cert_type,
    product: app.product_id?.name || 'Unknown Product',
    status: app.status,
    priority: app.priority || 'medium',
    date: app.created_at,
    assignee: app.primary_assignee?.name || 'Unassigned',
    deleted_at: app.deleted_at
  }))

  const filtered = APPS.filter((a: any) =>
    a.client.toLowerCase().includes(search.toLowerCase()) ||
    a.type.toLowerCase().includes(search.toLowerCase()) ||
    a.id.toLowerCase().includes(search.toLowerCase())
  )

  const handleGenerateQuote = async () => {
    if (!selectedApp) return;
    setIsSubmitting(true);
    try {
      await apiClient.post('/payments/quotations', {
        application_id: selectedApp._id || selectedApp.id,
        gov_fee: Number(govFee),
        lab_fee: Number(labFee)
      });
      toast.success('Quotation Sent successfully!');
      setQuoteModalVisible(false);
      setGovFee('');
      setLabFee('');
      queryClient.invalidateQueries({ queryKey: ['applications'] })
    } catch (e: any) {
      toast.error('Failed to send quotation');
    } finally {
      setIsSubmitting(false);
    }
  }

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/applications/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['applications'] })
  })

  const restoreMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/applications/${id}/restore`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['applications'] })
  })

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}><Loader2 className="animate-spin" size={24} color="var(--text-muted)" /></div>
  if (error) return <div style={{ color: 'var(--accent-coral)' }}>Failed to load applications</div>

  return (
    <div>
      {/* Quotation Modal */}
      {quoteModalVisible && selectedApp && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 'var(--radius-lg)', width: 400, border: '1px solid var(--border)' }}>
            <h3 style={{ margin: '0 0 16px', color: 'var(--text-primary)' }}>Generate Quotation</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>Creating quote for application <strong>{selectedApp.id}</strong></p>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Government Fee</label>
              <input type="number" value={govFee} onChange={e => setGovFee(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', outline: 'none' }} placeholder="e.g. 50000" />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Lab Testing Fee</label>
              <input type="number" value={labFee} onChange={e => setLabFee(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', outline: 'none' }} placeholder="e.g. 35000" />
            </div>

            <div style={{ marginBottom: 24, padding: 12, background: 'var(--bg-body)', borderRadius: 'var(--radius)' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: 12, margin: 0, lineHeight: 1.4 }}>
                <strong>Note:</strong> Sanyog Consultancy Fee (₹1999 or $50) and applicable taxes (GST or TDS) will be calculated automatically based on the client's location.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setQuoteModalVisible(false)}>Cancel</Button>
              <Button onClick={handleGenerateQuote} disabled={isSubmitting}>{isSubmitting ? 'Sending...' : 'Send Quotation'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ color: 'var(--text-primary)', fontSize: 20, fontWeight: 700, margin: 0 }}>Applications</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 0' }}>{filtered.length} applications tracked</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ display: 'flex', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 4 }}>
            <button onClick={() => setView('kanban')} style={{ background: view === 'kanban' ? 'var(--bg-hover)' : 'transparent', color: view === 'kanban' ? 'var(--text-primary)' : 'var(--text-muted)', border: 'none', padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}><LayoutGrid size={14} /> Kanban</button>
            <button onClick={() => setView('list')} style={{ background: view === 'list' ? 'var(--bg-hover)' : 'transparent', color: view === 'list' ? 'var(--text-primary)' : 'var(--text-muted)', border: 'none', padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}><List size={14} /> List</button>
          </div>
          <Button icon={<Plus size={14} />} size="sm">New Application</Button>
        </div>
      </div>

      <div style={{ position: 'relative', marginBottom: 24, maxWidth: 360 }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search applications…"
          style={{ width: '100%', padding: '9px 12px 9px 36px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
      </div>

      {view === 'kanban' ? (
        <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 12 }}>
          {COLS.map(col => {
            const items = filtered.filter((a: any) => a.status === col.key)
            return (
              <div key={col.key} style={{ minWidth: 260, flex: '0 0 260px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, display: 'inline-block' }} />
                    <span style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600 }}>{col.label}</span>
                  </div>
                  <span style={{ background: col.color + '22', color: col.color, borderRadius: 'var(--radius-full)', padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{items.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {items.map((app: any) => (
                    <div key={app.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 14px', cursor: 'pointer', transition: 'var(--transition)' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}
                      onClick={() => { setSelectedApp(app); setQuoteModalVisible(true); }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ color: 'var(--accent-purple)', fontSize: 11, fontWeight: 600, textDecoration: app.deleted_at ? 'line-through' : 'none' }}>{app.id}</span>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: PRIORITY_COLOR[app.priority], marginTop: 2, flexShrink: 0 }} />
                      </div>
                      <div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{app.product}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 10 }}>{app.client} · {app.type}</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Avatar name={app.assignee} size={20} />
                        <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>{formatDate(app.date)}</span>
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: '20px 0', border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>No applications</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                {['ID', 'Client', 'Type', 'Product', 'Status', 'Priority', 'Assigned To', 'Date', 'Actions'].map(h => (
                  <th key={h} style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textAlign: 'left', padding: '12px 16px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((app: any) => (
                <tr key={app._id} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', opacity: app.deleted_at ? 0.5 : 1 }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '12px 16px', color: 'var(--accent-purple)', fontSize: 12, fontWeight: 600, textDecoration: app.deleted_at ? 'line-through' : 'none' }}>{app.id}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontSize: 13 }}>{app.client}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: 12 }}>{app.type}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: 12, maxWidth: 200 }}>{app.product}</td>
                  <td style={{ padding: '12px 16px' }}><Badge status={app.status} size="sm" /></td>
                  <td style={{ padding: '12px 16px' }}><span style={{ color: PRIORITY_COLOR[app.priority], fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>{app.priority}</span></td>
                  <td style={{ padding: '12px 16px' }}><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Avatar name={app.assignee} size={22} /><span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{app.assignee}</span></div></td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 12 }}>{formatDate(app.date)}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Button variant="secondary" size="sm" onClick={() => { setSelectedApp(app); setQuoteModalVisible(true) }}>Quote</Button>
                      {app.deleted_at ? (
                         <button onClick={() => restoreMutation.mutate(app._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-green)', padding: 0 }} title="Restore"><RefreshCcw size={14} /></button>
                      ) : (
                         <button onClick={() => deleteMutation.mutate(app._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-coral)', padding: 0 }} title="Delete"><Trash2 size={14} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
