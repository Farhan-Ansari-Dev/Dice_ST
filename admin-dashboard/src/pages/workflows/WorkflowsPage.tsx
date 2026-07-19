import React, { useState, useMemo } from 'react'
import { GitBranch, Edit2, Search, Clock, DollarSign, Save, X } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Button from '../../components/common/Button'
import { toast } from '../../store/toastStore'
import apiClient from '../../services/apiClient'

export default function WorkflowsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<any>(null)

  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ['workflows'],
    queryFn: async () => {
      const res = await apiClient.get('/workflows')
      return res.data.data || []
    },
  })

  const filtered = useMemo(() => {
    if (!search.trim()) return workflows
    const q = search.toLowerCase()
    return workflows.filter((w: any) =>
      w.display_name?.toLowerCase().includes(q) ||
      w.cert_type?.toLowerCase().includes(q) ||
      w._id?.toLowerCase().includes(q)
    )
  }, [workflows, search])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!editingId || !editForm) return
      await apiClient.put(`/workflows/${editingId}`, editForm)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
      toast.success('Workflow updated')
      setEditingId(null)
      setEditForm(null)
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update workflow'),
  })

  const startEdit = (w: any) => {
    setEditingId(w._id)
    setEditForm({
      display_name: w.display_name || '',
      cert_type: w.cert_type || '',
      estimated_duration_days: w.estimated_duration_days || 45,
      validity_period_months: w.validity_period_months || 24,
      issuing_body: w.issuing_body || '',
      country_code: w.country_code || '',
      active: w.active ?? true,
      fee_structure: {
        application_fee_inr: w.fee_structure?.application_fee_inr || 0,
      },
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm(null)
  }

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 24 }}>
        <div>
          <div style={{ color: 'var(--accent-purple)', fontSize: 11, fontWeight: 800, letterSpacing: 1 }}>CONFIGURATION</div>
          <h2 style={{ color: 'var(--text-primary)', fontSize: 24, fontWeight: 800, margin: '5px 0 6px' }}>Workflows</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>Certification type definitions — fee, duration, and issuing body</p>
        </div>
      </div>

      <div style={{ position: 'relative', marginBottom: 20, maxWidth: 320 }}>
        <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          placeholder="Search workflows..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box', paddingLeft: 32, padding: '9px 12px 9px 32px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg-body)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
        />
      </div>

      {isLoading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading workflows...</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center' }}>
          <GitBranch size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
          <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            {workflows.length === 0 ? 'No workflows configured. Seed the database with workflow definitions.' : 'No workflows match your search'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((w: any) => {
            const isEditing = editingId === w._id
            return (
              <div key={w._id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                {isEditing ? (
                  <div style={{ padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 15 }}>Editing: {w.display_name || w.cert_type}</h4>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Button variant="ghost" onClick={cancelEdit} icon={<X size={14} />}>Cancel</Button>
                        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} icon={<Save size={14} />}>
                          {saveMutation.isPending ? 'Saving...' : 'Save'}
                        </Button>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={labelStyle}>Display Name</label>
                        <input value={editForm.display_name} onChange={e => setEditForm((p: any) => ({ ...p, display_name: e.target.value }))} style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Cert Type</label>
                        <input value={editForm.cert_type} onChange={e => setEditForm((p: any) => ({ ...p, cert_type: e.target.value }))} style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Duration (days)</label>
                        <input type="number" value={editForm.estimated_duration_days} onChange={e => setEditForm((p: any) => ({ ...p, estimated_duration_days: parseInt(e.target.value) || 0 }))} style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Validity (months)</label>
                        <input type="number" value={editForm.validity_period_months} onChange={e => setEditForm((p: any) => ({ ...p, validity_period_months: parseInt(e.target.value) || 0 }))} style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Issuing Body</label>
                        <input value={editForm.issuing_body} onChange={e => setEditForm((p: any) => ({ ...p, issuing_body: e.target.value }))} style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Application Fee (INR)</label>
                        <input type="number" value={editForm.fee_structure.application_fee_inr} onChange={e => setEditForm((p: any) => ({ ...p, fee_structure: { ...p.fee_structure, application_fee_inr: parseInt(e.target.value) || 0 } }))} style={inputStyle} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(108,99,255,0.12)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      <GitBranch size={18} color="var(--accent-purple)" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 14 }}>{w.display_name || w.cert_type}</span>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: w.active ? 'rgba(16,185,129,0.12)' : 'rgba(139,146,165,0.12)', color: w.active ? '#10B981' : 'var(--text-muted)', fontWeight: 700 }}>
                          {w.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                          <Clock size={12} /> {w.estimated_duration_days || '—'} days
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                          <DollarSign size={12} /> {w.fee_structure?.application_fee_inr ? `₹${w.fee_structure.application_fee_inr.toLocaleString()}` : '—'}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {w.issuing_body || '—'} · {w.validity_period_months || '—'}mo validity
                        </span>
                        {w.country_code && (
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {w.country_code}
                          </span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => startEdit(w)} style={iconBtnStyle} title="Edit"><Edit2 size={16} color="var(--accent-purple)" /></button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, marginBottom: 6, marginTop: 0 }
const inputStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '9px 11px', background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', outline: 'none', fontSize: 13 }
const iconBtnStyle: React.CSSProperties = { border: 'none', background: 'transparent', cursor: 'pointer', padding: 5, display: 'grid', placeItems: 'center' }
