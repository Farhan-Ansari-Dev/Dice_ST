import React, { useState, useMemo } from 'react'
import { Search, Clock, Eye, CheckCircle2, XCircle, Building2, Mail, Phone, Globe } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Button from '../../components/common/Button'
import { toast } from '../../store/toastStore'
import apiClient from '../../services/apiClient'
import { formatDate } from '../../utils/formatters'

const STATUS_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
  pending:      { color: '#F59E0B', icon: Clock,        label: 'Pending' },
  under_review: { color: '#00B5D8', icon: Eye,          label: 'Under review' },
  approved:     { color: '#10B981', icon: CheckCircle2, label: 'Approved' },
  rejected:     { color: '#EF4444', icon: XCircle,      label: 'Rejected' },
}

const STATUSES = Object.keys(STATUS_CONFIG)

export default function PartnerApplicationsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('pending')
  const [selected, setSelected] = useState<any | null>(null)
  const [reason, setReason] = useState('')

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['partner-applications', statusFilter],
    queryFn: async () => {
      const res = await apiClient.get(`/partners/applications${statusFilter ? `?status=${statusFilter}` : ''}`)
      return (res as any).data ?? []
    },
  })

  const decide = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: string; reason?: string }) =>
      apiClient.put(`/partners/applications/${id}/status`, { status, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-applications'] })
      setSelected(null)
      setReason('')
      toast.success('Application updated')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not update the application'),
  })

  const filtered = useMemo(
    () => (applications || []).filter((a: any) =>
      [a.company_name, a.contact_name, a.email, a.partner_type]
        .filter(Boolean)
        .some((v: string) => v.toLowerCase().includes(search.toLowerCase()))),
    [applications, search],
  )

  /** Rejection requires a reason — the applicant is told why. */
  const reject = (app: any) => {
    if (!reason.trim()) {
      toast.error('Enter a reason before rejecting')
      return
    }
    decide.mutate({ id: app._id, status: 'rejected', reason: reason.trim() })
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 24 }}>Partner Applications</h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
          Applications from certification bodies, laboratories and inspection bodies.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        {STATUSES.map((s) => {
          const cfg = STATUS_CONFIG[s]
          const active = statusFilter === s
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(active ? '' : s)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '9px 13px',
                background: active ? `${cfg.color}22` : 'var(--bg-card)',
                border: `1px solid ${active ? cfg.color : 'var(--border)'}`,
                borderRadius: 'var(--radius)', cursor: 'pointer', color: 'var(--text-primary)', fontSize: 13, fontWeight: 600,
              }}
            >
              <cfg.icon size={14} color={cfg.color} />{cfg.label}
            </button>
          )
        })}
      </div>

      <div style={{ position: 'relative', marginBottom: 16, maxWidth: 380 }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text-muted)' }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by company, contact, email or type"
          style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px 10px 34px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', outline: 'none', fontSize: 13 }}
        />
      </div>

      {isLoading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading applications…</p>
      ) : filtered.length === 0 ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 40, textAlign: 'center' }}>
          <Building2 size={28} color="var(--text-muted)" />
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 10 }}>No applications with this status.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((a: any) => {
            const cfg = STATUS_CONFIG[a.status] ?? STATUS_CONFIG.pending
            return (
              <div
                key={a._id}
                onClick={() => { setSelected(a); setReason('') }}
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: `${cfg.color}14`, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <cfg.icon size={18} color={cfg.color} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 14 }}>{a.company_name}</span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: `${cfg.color}14`, color: cfg.color, fontWeight: 700 }}>{cfg.label}</span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'rgba(108,99,255,0.12)', color: 'var(--accent-purple)', fontWeight: 600 }}>{a.partner_type}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-secondary)' }}>
                      <span>{a.contact_name}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Mail size={12} />{a.email}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Phone size={12} />{a.phone}</span>
                      <span>{formatDate(a.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Review drawer */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'flex-end', zIndex: 1200 }} onClick={() => setSelected(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 480, maxWidth: '100%', height: '100%', background: 'var(--bg-card)', borderLeft: '1px solid var(--border)', overflowY: 'auto', padding: 24 }}>
            <h3 style={{ margin: '0 0 4px', color: 'var(--text-primary)' }}>{selected.company_name}</h3>
            <p style={{ margin: '0 0 20px', color: 'var(--text-muted)', fontSize: 13 }}>{selected.partner_type}</p>

            {[
              ['Contact', selected.contact_name],
              ['Email', selected.email],
              ['Phone', selected.phone],
              ['Website', selected.website || '—'],
              ['Accreditations', selected.accreditations || '—'],
              ['Scope', selected.scope || '—'],
              ['Submitted', formatDate(selected.created_at)],
              ['Status', STATUS_CONFIG[selected.status]?.label ?? selected.status],
              ...(selected.decision_reason ? [['Decision reason', selected.decision_reason]] : []),
            ].map(([label, value]) => (
              <div key={label as string} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>{value as string}</div>
              </div>
            ))}

            {selected.website && (
              <a href={selected.website} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--accent-purple, #6C63FF)' }}>
                <Globe size={13} /> Open website
              </a>
            )}

            {['pending', 'under_review'].includes(selected.status) && (
              <div style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Decision</div>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason (required when rejecting — the applicant sees this)"
                  rows={3}
                  style={{ width: '100%', boxSizing: 'border-box', padding: 10, background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', outline: 'none', fontSize: 13, resize: 'vertical' }}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  <Button onClick={() => decide.mutate({ id: selected._id, status: 'approved', reason: reason.trim() || undefined })} disabled={decide.isPending}>
                    Approve
                  </Button>
                  <Button variant="ghost" onClick={() => reject(selected)} disabled={decide.isPending}>Reject</Button>
                  {selected.status === 'pending' && (
                    <Button variant="ghost" onClick={() => decide.mutate({ id: selected._id, status: 'under_review' })} disabled={decide.isPending}>
                      Mark under review
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
