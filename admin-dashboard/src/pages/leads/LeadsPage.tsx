import React, { useState, useMemo } from 'react'
import { Search, Mail, Phone, Building2, Clock, CheckCircle2, XCircle, UserCheck, Send } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '../../store/toastStore'
import apiClient from '../../services/apiClient'
import { formatDate } from '../../utils/formatters'

const STATUS_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
  new:       { color: '#6C63FF', icon: Send,        label: 'New' },
  contacted: { color: '#F59E0B', icon: Clock,       label: 'Contacted' },
  qualified: { color: '#00B5D8', icon: UserCheck,   label: 'Qualified' },
  converted: { color: '#10B981', icon: CheckCircle2, label: 'Converted' },
  rejected:  { color: '#EF4444', icon: XCircle,     label: 'Rejected' },
}

const STATUSES = Object.keys(STATUS_CONFIG)

export default function LeadsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState<any | null>(null)
  const [note, setNote] = useState('')

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads', statusFilter],
    queryFn: async () => {
      const res = await apiClient.get(`/leads${statusFilter ? `?status=${statusFilter}` : ''}`)
      return (res as any).data ?? []
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiClient.put(`/leads/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      toast.success('Lead status updated')
    },
    onError: () => toast.error('Could not update the lead status'),
  })

  const noteMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      apiClient.post(`/leads/${id}/notes`, { note }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      setSelected(res?.data ?? selected)
      setNote('')
      toast.success('Note added')
    },
    onError: () => toast.error('Could not add the note'),
  })

  const filtered = useMemo(
    () =>
      (leads || []).filter((l: any) =>
        [l.contact_name, l.contact_email, l.company_name, l.service_name]
          .filter(Boolean)
          .some((v: string) => v.toLowerCase().includes(search.toLowerCase())),
      ),
    [leads, search],
  )

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const l of leads || []) c[l.status] = (c[l.status] ?? 0) + 1
    return c
  }, [leads])

  const cell: React.CSSProperties = { padding: '14px 16px', fontSize: 13, color: 'var(--text-secondary)' }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 24 }}>Certification Enquiries</h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
          Leads submitted from the mobile app. Qualify and convert them into applications.
        </p>
      </div>

      {/* Status summary */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {STATUSES.map((s) => {
          const cfg = STATUS_CONFIG[s]
          const Icon = cfg.icon
          const active = statusFilter === s
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(active ? '' : s)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                background: active ? `${cfg.color}22` : 'var(--bg-card)',
                border: `1px solid ${active ? cfg.color : 'var(--border)'}`,
                borderRadius: 'var(--radius)', cursor: 'pointer', color: 'var(--text-primary)',
              }}
            >
              <Icon size={14} color={cfg.color} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>{cfg.label}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{counts[s] ?? 0}</span>
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 16, maxWidth: 380 }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text-muted)' }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, company or certification"
          style={{
            width: '100%', boxSizing: 'border-box', padding: '10px 12px 10px 34px',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', color: 'var(--text-primary)', outline: 'none', fontSize: 13,
          }}
        />
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
              {['Contact', 'Certification', 'Company', 'Status', 'Received', 'Actions'].map((h) => (
                <th key={h} style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textAlign: 'left', padding: '12px 16px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} style={{ ...cell, textAlign: 'center', padding: 24 }}>Loading enquiries…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ ...cell, textAlign: 'center', padding: 24 }}>No enquiries yet.</td></tr>
            ) : filtered.map((lead: any) => {
              const cfg = STATUS_CONFIG[lead.status] ?? STATUS_CONFIG.new
              return (
                <tr key={lead._id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={cell}>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 13 }}>{lead.contact_name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                      <Mail size={11} /><span style={{ fontSize: 11 }}>{lead.contact_email}</span>
                    </div>
                    {lead.contact_phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                        <Phone size={11} /><span style={{ fontSize: 11 }}>{lead.contact_phone}</span>
                      </div>
                    )}
                  </td>
                  <td style={cell}>{lead.service_name}</td>
                  <td style={cell}>
                    {lead.company_name ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Building2 size={12} />{lead.company_name}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={cell}>
                    <select
                      value={lead.status}
                      onChange={(e) => statusMutation.mutate({ id: lead._id, status: e.target.value })}
                      style={{
                        background: `${cfg.color}18`, color: cfg.color, border: `1px solid ${cfg.color}55`,
                        borderRadius: 6, padding: '5px 8px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                    </select>
                  </td>
                  <td style={{ ...cell, fontSize: 12 }}>{formatDate(lead.created_at)}</td>
                  <td style={cell}>
                    <button
                      onClick={() => setSelected(lead)}
                      style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', color: 'var(--text-primary)', fontSize: 12 }}
                    >
                      Details
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Detail drawer */}
      {selected && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'flex-end', zIndex: 9999 }}
          onClick={() => setSelected(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: 460, maxWidth: '100%', background: 'var(--bg-card)', height: '100%', overflowY: 'auto', padding: 24, borderLeft: '1px solid var(--border)' }}
          >
            <h3 style={{ margin: '0 0 4px', color: 'var(--text-primary)' }}>{selected.contact_name}</h3>
            <p style={{ margin: '0 0 20px', color: 'var(--text-muted)', fontSize: 13 }}>{selected.service_name}</p>

            {[
              ['Email', selected.contact_email],
              ['Phone', selected.contact_phone || '—'],
              ['Company', selected.company_name || '—'],
              ['Target markets', (selected.target_markets || []).join(', ') || '—'],
              ['Product', selected.product_description || '—'],
              ['Source', selected.source],
              ['Received', formatDate(selected.created_at)],
            ].map(([label, value]) => (
              <div key={label as string} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{value as string}</div>
              </div>
            ))}

            <div style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>Internal notes</div>
              {(selected.admin_notes ?? []).length === 0 && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No notes yet.</p>
              )}
              {(selected.admin_notes ?? []).map((n: any, i: number) => (
                <div key={i} style={{ background: 'var(--bg-body)', borderRadius: 8, padding: 10, marginBottom: 8 }}>
                  <div style={{ fontSize: 12.5, color: 'var(--text-primary)' }}>{n.note}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 4 }}>{formatDate(n.at)}</div>
                </div>
              ))}

              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note…"
                rows={3}
                style={{ width: '100%', boxSizing: 'border-box', marginTop: 8, padding: 10, background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', outline: 'none', fontSize: 13, resize: 'vertical' }}
              />
              <button
                disabled={!note.trim() || noteMutation.isPending}
                onClick={() => noteMutation.mutate({ id: selected._id, note: note.trim() })}
                style={{ marginTop: 8, padding: '9px 14px', background: 'var(--accent-purple, #6C63FF)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: note.trim() ? 'pointer' : 'not-allowed', opacity: note.trim() ? 1 : 0.5 }}
              >
                Add note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
