import React, { useState } from 'react'
import { ClipboardList, Plus, Edit2, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Button from '../../components/common/Button'
import Badge from '../../components/common/Badge'
import { toast } from '../../store/toastStore'
import { formatDate } from '../../utils/formatters'
import apiClient from '../../services/apiClient'

const EMPTY_FORM = { product_name: '', inspection_type: 'factory', status: 'pending', scheduled_date: '', location: '', remarks: '' }

export default function InspectionsPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ ...EMPTY_FORM })

  const { data: inspections = [], isLoading } = useQuery({
    queryKey: ['inspections'],
    queryFn: async () => {
      const res = await apiClient.get('/inspections')
      return res.data.data
    }
  })

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => apiClient.post('/inspections', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] })
      setShowForm(false)
      setFormData({ ...EMPTY_FORM })
      toast.success('Inspection created')
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to create inspection'),
  })

  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) => apiClient.put(`/inspections/${editingId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] })
      setEditingId(null)
      setFormData({ ...EMPTY_FORM })
      toast.success('Inspection updated')
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update inspection'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/inspections/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] })
      toast.success('Inspection deleted')
    },
    onError: () => toast.error('Failed to delete inspection'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingId) updateMutation.mutate(formData)
    else createMutation.mutate(formData)
  }

  const handleEdit = (inspection: any) => {
    setEditingId(inspection._id)
    setFormData({
      product_name: inspection.product_name,
      inspection_type: inspection.inspection_type,
      status: inspection.status,
      scheduled_date: inspection.scheduled_date?.split('T')[0] || '',
      location: inspection.location || '',
      remarks: inspection.remarks || '',
    })
    setShowForm(true)
  }

  const progressPct = (status: string) => status === 'completed' ? 100 : status === 'in_progress' ? 60 : status === 'scheduled' ? 20 : 0

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 24 }}>
        <div>
          <div style={{ color: 'var(--accent-purple)', fontSize: 11, fontWeight: 800, letterSpacing: 1 }}>QUALITY</div>
          <h2 style={{ color: 'var(--text-primary)', fontSize: 24, fontWeight: 800, margin: '5px 0 6px' }}>Inspections</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>Factory and product inspection management</p>
        </div>
        <Button icon={<Plus size={15} />} onClick={() => { setShowForm(!showForm); if (showForm) { setEditingId(null); setFormData({ ...EMPTY_FORM }) } }}>
          {showForm ? 'Cancel' : 'New Inspection'}
        </Button>
      </div>

      {showForm && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24, marginBottom: 20 }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              {[
                { label: 'Product Name', key: 'product_name', type: 'text', placeholder: 'Product name', required: true },
                { label: 'Inspection Type', key: 'inspection_type', type: 'select', options: ['factory', 'product', 'process', 'audit'] },
                { label: 'Scheduled Date', key: 'scheduled_date', type: 'date' },
                { label: 'Status', key: 'status', type: 'select', options: ['pending', 'scheduled', 'in_progress', 'completed', 'cancelled'] },
                { label: 'Location', key: 'location', type: 'text', placeholder: 'Inspection location' },
              ].map(f => (
                <div key={f.key}>
                  <label style={labelStyle}>{f.label}</label>
                  {f.type === 'select' ? (
                    <select value={(formData as any)[f.key]} onChange={e => setFormData(p => ({ ...p, [f.key]: e.target.value }))} style={inputStyle}>
                      {f.options!.map(o => <option key={o} value={o}>{o.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
                    </select>
                  ) : (
                    <input type={f.type} value={(formData as any)[f.key]} onChange={e => setFormData(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} required={f.required} style={inputStyle} />
                  )}
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Remarks</label>
              <textarea value={formData.remarks} onChange={e => setFormData(p => ({ ...p, remarks: e.target.value }))} placeholder="Additional remarks" rows={3} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingId ? 'Update' : 'Create'} Inspection
              </Button>
              {editingId && <Button variant="ghost" onClick={() => { setEditingId(null); setFormData({ ...EMPTY_FORM }) }}>Cancel</Button>}
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading inspections...</div>
        ) : inspections.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <ClipboardList size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
            <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>No inspections found</div>
          </div>
        ) : (
          inspections.map((i: any) => (
            <div key={i._id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(108,99,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ClipboardList size={18} color="var(--accent-purple)" />
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 700 }}>{i.product_name}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{i.inspection_type} · {i.location || 'No location'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Badge status={i.status} size="sm" />
                  <button onClick={() => handleEdit(i)} style={iconBtnStyle}><Edit2 size={15} color="var(--accent-purple)" /></button>
                  <button onClick={() => deleteMutation.mutate(i._id)} style={iconBtnStyle}><Trash2 size={15} color="var(--accent-coral)" /></button>
                </div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Progress</span>
                  <span style={{ color: 'var(--text-primary)', fontSize: 11, fontWeight: 700 }}>{progressPct(i.status)}%</span>
                </div>
                <div style={{ height: 5, background: 'var(--bg-hover)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${progressPct(i.status)}%`, background: 'var(--gradient-purple)', borderRadius: 3, transition: 'width 0.4s ease' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-muted)' }}>
                <span>Scheduled: {i.scheduled_date ? formatDate(i.scheduled_date) : 'Not set'}</span>
                <span>Status: {i.status}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, marginBottom: 6 }
const inputStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '10px 11px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', outline: 'none', fontSize: 13 }
const iconBtnStyle: React.CSSProperties = { border: 'none', background: 'transparent', cursor: 'pointer', padding: 4, display: 'grid', placeItems: 'center' }
