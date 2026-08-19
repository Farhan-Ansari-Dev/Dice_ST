import React, { useState, useMemo } from 'react'
import { ShieldCheck, ShieldX, Clock, FileText, ChevronDown, User2, Search } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import { toast } from '../../store/toastStore'
import apiClient from '../../services/apiClient'

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  pending:  { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', label: 'Pending' },
  verified: { color: '#10B981', bg: 'rgba(16,185,129,0.12)', label: 'Verified' },
  rejected: { color: '#EF4444', bg: 'rgba(239,68,68,0.12)', label: 'Rejected' },
}

export default function ConsultantVerificationPage() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('pending')
  const [search, setSearch] = useState('')
  const [actionModal, setActionModal] = useState<{ userId: string; name: string; action: 'approve' | 'reject' } | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: consultants = [], isLoading } = useQuery({
    queryKey: ['consultants_verification'],
    queryFn: async () => {
      // Consultants self-declare via onboarding (business_role='consultant');
      // their `role` stays 'client', so filtering by role returned nobody.
      const res = await apiClient.get('/users?business_role=consultant&limit=200')
      return (res.data.data || []).filter((u: any) => u.consultant_verification_status)
    },
  })

  const filtered = useMemo(() => {
    let list = consultants
    if (filter !== 'all') {
      list = list.filter((c: any) => c.consultant_verification_status === filter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((c: any) =>
        c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)
      )
    }
    return list
  }, [consultants, filter, search])

  const pendingCount = consultants.filter((c: any) => c.consultant_verification_status === 'pending').length

  const updateStatus = useMutation({
    mutationFn: async ({ userId, status, reason }: { userId: string; status: string; reason?: string }) => {
      await apiClient.post(`/consultants/${userId}/update-status`, {
        status,
        rejection_reason: reason,
      })
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['consultants_verification'] })
      toast.success(`Consultant ${vars.status === 'verified' ? 'approved' : 'rejected'} successfully`)
      setActionModal(null)
      setRejectionReason('')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update status')
    },
  })

  const handleApprove = (userId: string, name: string) => {
    setActionModal({ userId, name, action: 'approve' })
  }

  const handleReject = (userId: string, name: string) => {
    setActionModal({ userId, name, action: 'reject' })
  }

  const confirmAction = () => {
    if (!actionModal) return
    if (actionModal.action === 'reject' && !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason')
      return
    }
    updateStatus.mutate({
      userId: actionModal.userId,
      status: actionModal.action === 'approve' ? 'verified' : 'rejected',
      reason: actionModal.action === 'reject' ? rejectionReason : undefined,
    })
  }

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ color: 'var(--accent-purple)', fontSize: 11, fontWeight: 800, letterSpacing: 1 }}>CONSULTANT MANAGEMENT</div>
          <h2 style={{ color: 'var(--text-primary)', fontSize: 24, fontWeight: 800, margin: '5px 0 6px' }}>Verification Queue</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>
            Review and approve consultant verification requests.
            {pendingCount > 0 && <span style={{ color: '#F59E0B', fontWeight: 700 }}> {pendingCount} pending</span>}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {(['all', 'pending', 'verified', 'rejected'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius)',
              border: `1px solid ${filter === f ? 'var(--accent-purple)' : 'var(--border)'}`,
              background: filter === f ? 'rgba(108,99,255,0.12)' : 'var(--bg-card)',
              color: filter === f ? 'var(--accent-purple)' : 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'pending' && pendingCount > 0 && (
              <span style={{ marginLeft: 6, background: '#F59E0B', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11 }}>{pendingCount}</span>
            )}
          </button>
        ))}

        <div style={{ marginLeft: 'auto', position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            placeholder="Search consultants..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              paddingLeft: 32,
              padding: '8px 12px 8px 32px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              background: 'var(--bg-body)',
              color: 'var(--text-primary)',
              fontSize: 13,
              outline: 'none',
              width: 220,
            }}
          />
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading consultants...</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center' }}>
          <ShieldCheck size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
          <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            {filter === 'pending' ? 'No pending verification requests' : 'No consultants match your filter'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((c: any) => {
            const status = STATUS_CONFIG[c.consultant_verification_status] || STATUS_CONFIG.pending
            const isExpanded = expandedId === c._id
            const docs = c.consultant_verification_documents || []

            return (
              <div
                key={c._id}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                }}
              >
                {/* Row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '14px 20px',
                    cursor: 'pointer',
                  }}
                  onClick={() => setExpandedId(isExpanded ? null : c._id)}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: 'rgba(108,99,255,0.12)',
                    display: 'grid', placeItems: 'center',
                  }}>
                    <User2 size={18} color="var(--accent-purple)" />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 14 }}>{c.name}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>{c.email}</div>
                  </div>

                  <div style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-full)',
                    background: status.bg,
                    color: status.color,
                    fontSize: 12,
                    fontWeight: 700,
                  }}>
                    {status.label}
                  </div>

                  {docs.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', fontSize: 12 }}>
                      <FileText size={14} />
                      {docs.length} doc{docs.length !== 1 ? 's' : ''}
                    </div>
                  )}

                  <ChevronDown
                    size={16}
                    color="var(--text-muted)"
                    style={{ transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none' }}
                  />
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div style={{ padding: '0 20px 16px', borderTop: '1px solid var(--border)' }}>
                    {/* Documents */}
                    {docs.length > 0 && (
                      <div style={{ marginTop: 14 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Uploaded Documents</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {docs.map((doc: any, i: number) => (
                            <div key={i} style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              padding: '8px 12px',
                              background: 'var(--bg-body)',
                              borderRadius: 'var(--radius)',
                              border: '1px solid var(--border)',
                            }}>
                              <FileText size={16} color="var(--accent-purple)" />
                              <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)' }}>{doc.name}</span>
                              {doc.url && (
                                <a
                                  href={doc.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ fontSize: 12, color: 'var(--accent-purple)', textDecoration: 'none', fontWeight: 600 }}
                                >
                                  View
                                </a>
                              )}
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Rejection reason */}
                    {c.consultant_verification_status === 'rejected' && c.consultant_rejection_reason && (
                      <div style={{
                        marginTop: 14, padding: 12, borderRadius: 'var(--radius)',
                        background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
                      }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#EF4444', marginBottom: 4 }}>Rejection Reason</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{c.consultant_rejection_reason}</div>
                      </div>
                    )}

                    {/* Actions */}
                    {c.consultant_verification_status === 'pending' && (
                      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                        <Button
                          icon={<ShieldCheck size={15} />}
                          onClick={() => handleApprove(c._id, c.name)}
                          style={{ background: '#10B981', border: 'none' }}
                        >
                          Approve
                        </Button>
                        <Button
                          icon={<ShieldX size={15} />}
                          onClick={() => handleReject(c._id, c.name)}
                          variant="ghost"
                          style={{ color: '#EF4444' }}
                        >
                          Reject
                        </Button>
                      </div>
                    )}

                    {c.consultant_verification_status === 'rejected' && (
                      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                        <Button
                          icon={<ShieldCheck size={15} />}
                          onClick={() => handleApprove(c._id, c.name)}
                          style={{ background: '#10B981', border: 'none' }}
                        >
                          Approve (Override)
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Action confirmation modal */}
      {actionModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.5)',
          display: 'grid', placeItems: 'center',
        }}
          onClick={() => { setActionModal(null); setRejectionReason(''); }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg)',
              padding: 24,
              width: 420,
              maxWidth: '90vw',
              border: '1px solid var(--border)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ color: 'var(--text-primary)', margin: '0 0 8px', fontSize: 18 }}>
              {actionModal.action === 'approve' ? 'Approve Consultant' : 'Reject Consultant'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '0 0 16px' }}>
              {actionModal.action === 'approve'
                ? `Are you sure you want to verify ${actionModal.name}? They will be able to be assigned to applications.`
                : `Provide a reason for rejecting ${actionModal.name}'s verification request.`
              }
            </p>

            {actionModal.action === 'reject' && (
              <textarea
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="Reason for rejection (required)..."
                rows={3}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: 12,
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-body)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  resize: 'vertical',
                  outline: 'none',
                  marginBottom: 16,
                }}
              />
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button variant="ghost" onClick={() => { setActionModal(null); setRejectionReason(''); }}>Cancel</Button>
              <Button
                onClick={confirmAction}
                disabled={updateStatus.isPending}
                style={{
                  background: actionModal.action === 'approve' ? '#10B981' : '#EF4444',
                  border: 'none',
                }}
              >
                {updateStatus.isPending ? 'Updating...' : actionModal.action === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
