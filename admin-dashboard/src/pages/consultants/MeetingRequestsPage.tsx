import React, { useState, useMemo } from 'react'
import { Search, Clock, CheckCircle2, XCircle, Video, Calendar, User } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Button from '../../components/common/Button'
import { toast } from '../../store/toastStore'
import apiClient from '../../services/apiClient'
import { asList } from '../../utils/http'

const STATUS_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
  pending:   { color: '#F59E0B', icon: Clock,        label: 'Pending' },
  approved:  { color: '#10B981', icon: CheckCircle2, label: 'Approved' },
  confirmed: { color: '#10B981', icon: CheckCircle2, label: 'Confirmed' },
  rejected:  { color: '#EF4444', icon: XCircle,      label: 'Rejected' },
  cancelled: { color: '#8B92A5', icon: XCircle,      label: 'Cancelled' },
}

const FILTERS = ['pending', 'approved', 'rejected', 'cancelled']

export default function MeetingRequestsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('pending')

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ['meetings', statusFilter],
    queryFn: async () => {
      const res = await apiClient.get(`/meetings${statusFilter ? `?status=${statusFilter}` : ''}`)
      return asList(res)
    },
  })

  const decide = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiClient.put(`/meetings/${id}/status`, { status }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] })
      toast.success(res?.message ?? 'Meeting updated')
    },
    onError: () => toast.error('Could not update the meeting'),
  })

  const filtered = useMemo(
    () => (meetings || []).filter((m: any) =>
      [m.consultant_name, m.topic, m.user_id?.name, m.user_id?.email]
        .filter(Boolean)
        .some((v: string) => v.toLowerCase().includes(search.toLowerCase()))),
    [meetings, search],
  )

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 24 }}>Meeting Requests</h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
          Approve a request to generate its Google Meet link and notify the customer.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        {FILTERS.map((s) => {
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

      <div style={{ position: 'relative', marginBottom: 16, maxWidth: 360 }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text-muted)' }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by customer, specialist or topic"
          style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px 10px 34px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', outline: 'none', fontSize: 13 }}
        />
      </div>

      {isLoading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading meeting requests…</p>
      ) : filtered.length === 0 ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 40, textAlign: 'center' }}>
          <Calendar size={28} color="var(--text-muted)" />
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 10 }}>No meetings with this status.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((m: any) => {
            const cfg = STATUS_CONFIG[m.status] ?? STATUS_CONFIG.pending
            const starts = new Date(m.starts_at)
            return (
              <div key={m._id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: `${cfg.color}14`, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <cfg.icon size={18} color={cfg.color} />
                  </div>

                  <div style={{ flex: 1, minWidth: 240 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 14 }}>{m.topic}</span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: `${cfg.color}14`, color: cfg.color, fontWeight: 700 }}>{cfg.label}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-secondary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><User size={12} />{m.user_id?.name ?? 'Customer'} · {m.user_id?.email ?? ''}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Calendar size={12} />{starts.toLocaleString()}</span>
                      <span>with {m.consultant_name}</span>
                    </div>
                    {m.meeting_url && (
                      <a href={m.meeting_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12, color: 'var(--accent-purple, #6C63FF)' }}>
                        <Video size={13} /> Google Meet link
                      </a>
                    )}
                  </div>

                  {m.status === 'pending' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button onClick={() => decide.mutate({ id: m._id, status: 'approved' })} disabled={decide.isPending}>Approve</Button>
                      <Button variant="ghost" onClick={() => decide.mutate({ id: m._id, status: 'rejected' })} disabled={decide.isPending}>Reject</Button>
                    </div>
                  )}
                  {(m.status === 'approved' || m.status === 'confirmed') && (
                    <Button variant="ghost" onClick={() => decide.mutate({ id: m._id, status: 'cancelled' })} disabled={decide.isPending}>Cancel</Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
