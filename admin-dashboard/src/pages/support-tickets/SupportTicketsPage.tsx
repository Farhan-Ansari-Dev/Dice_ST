import React, { useState, useMemo } from 'react'
import { Plus, MessageSquare, Clock, AlertCircle, CheckCircle2, Search } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Button from '../../components/common/Button'
import { toast } from '../../store/toastStore'
import apiClient from '../../services/apiClient'

const PRIORITY_COLOR: Record<string, string> = {
  low: '#10B981',
  medium: '#F59E0B',
  high: '#EF4444',
  urgent: '#DC2626',
}

const STATUS_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
  open: { color: '#F59E0B', icon: Clock, label: 'Open' },
  in_progress: { color: '#6C63FF', icon: AlertCircle, label: 'In Progress' },
  resolved: { color: '#10B981', icon: CheckCircle2, label: 'Resolved' },
  closed: { color: '#8B92A5', icon: CheckCircle2, label: 'Closed' },
}

const CATEGORIES = ['General', 'Billing', 'Technical', 'Certification', 'Documentation', 'Account']

export default function SupportTicketsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [isModalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ subject: '', description: '', category: 'General', priority: 'medium' })

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['support_tickets'],
    queryFn: async () => {
      const res = await apiClient.get('/support-tickets/mine')
      return res.data.data || []
    },
  })

  const filtered = useMemo(() => {
    if (!search.trim()) return tickets
    const q = search.toLowerCase()
    return tickets.filter((t: any) =>
      t.subject?.toLowerCase().includes(q) ||
      t.ticket_number?.toLowerCase().includes(q) ||
      t.category?.toLowerCase().includes(q)
    )
  }, [tickets, search])

  const createMutation = useMutation({
    mutationFn: () => apiClient.post('/support-tickets', form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support_tickets'] })
      toast.success('Support ticket created')
      setModalOpen(false)
      setForm({ subject: '', description: '', category: 'General', priority: 'medium' })
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to create ticket'),
  })

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 24 }}>
        <div>
          <div style={{ color: 'var(--accent-purple)', fontSize: 11, fontWeight: 800, letterSpacing: 1 }}>SUPPORT</div>
          <h2 style={{ color: 'var(--text-primary)', fontSize: 24, fontWeight: 800, margin: '5px 0 6px' }}>Support Tickets</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>{tickets.length} ticket{tickets.length !== 1 ? 's' : ''}</p>
        </div>
        <Button icon={<Plus size={15} />} onClick={() => setModalOpen(true)}>New Ticket</Button>
      </div>

      <div style={{ position: 'relative', marginBottom: 20, maxWidth: 320 }}>
        <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          placeholder="Search tickets..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box', paddingLeft: 32, padding: '9px 12px 9px 32px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg-body)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
        />
      </div>

      {isLoading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading tickets...</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center' }}>
          <MessageSquare size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
          <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>No support tickets</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((t: any) => {
            const status = STATUS_CONFIG[t.status] || STATUS_CONFIG.open
            const StatusIcon = status.icon
            return (
              <div key={t._id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: `${status.color}14`, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <StatusIcon size={18} color={status.color} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 14 }}>{t.subject}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{t.ticket_number}</span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.5, marginBottom: 8 }}>{t.description}</div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: `${status.color}14`, color: status.color, fontWeight: 700 }}>{status.label}</span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'rgba(108,99,255,0.12)', color: 'var(--accent-purple)', fontWeight: 600 }}>{t.category}</span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: `${PRIORITY_COLOR[t.priority] || '#F59E0B'}14`, color: PRIORITY_COLOR[t.priority] || '#F59E0B', fontWeight: 600 }}>{t.priority}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.created_at ? new Date(t.created_at).toLocaleDateString() : ''}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center' }} onClick={() => setModalOpen(false)}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: 24, width: 480, maxWidth: '90vw', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: 'var(--text-primary)', margin: '0 0 16px', fontSize: 18 }}>New Support Ticket</h3>

            <label style={labelStyle}>Subject</label>
            <input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="Brief summary of the issue" style={inputStyle} />

            <label style={labelStyle}>Description</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe the issue in detail..." rows={4} style={{ ...inputStyle, resize: 'vertical' }} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Category</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={inputStyle}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Priority</label>
                <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))} style={inputStyle}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.subject.trim() || !form.description.trim()}>
                {createMutation.isPending ? 'Creating...' : 'Create Ticket'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, marginBottom: 6, marginTop: 14 }
const inputStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '10px 11px', background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', outline: 'none', fontSize: 13 }
