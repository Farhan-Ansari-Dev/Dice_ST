import React, { useState } from 'react'
import { ClipboardList, CheckCircle, Clock, AlertCircle, Plus, Edit2, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Badge from '../../components/common/Badge'
import { formatDate } from '../../utils/formatters'
import apiClient from '../../services/apiClient'

export default function InspectionsPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    product_name: '',
    inspection_type: 'factory',
    status: 'pending',
    scheduled_date: '',
    location: '',
    remarks: '',
  })

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
      setFormData({
        product_name: '',
        inspection_type: 'factory',
        status: 'pending',
        scheduled_date: '',
        location: '',
        remarks: '',
      })
    }
  })

  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) => apiClient.put(`/inspections/${editingId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] })
      setEditingId(null)
      setFormData({
        product_name: '',
        inspection_type: 'factory',
        status: 'pending',
        scheduled_date: '',
        location: '',
        remarks: '',
      })
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/inspections/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] })
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingId) {
      updateMutation.mutate(formData)
    } else {
      createMutation.mutate(formData)
    }
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
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} color="var(--success)" />
      case 'in_progress':
        return <Clock size={16} color="var(--warning)" />
      case 'scheduled':
        return <AlertCircle size={16} color="var(--info)" />
      default:
        return <Clock size={16} color="var(--muted)" />
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ color: 'var(--text-primary)', fontSize: 20, fontWeight: 700, margin: 0 }}>Inspections</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 0' }}>Factory and product inspection management</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            background: 'var(--primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Plus size={16} /> New Inspection
        </button>
      </div>

      {showForm && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20, marginBottom: 20 }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  Product Name
                </label>
                <input
                  type="text"
                  value={formData.product_name}
                  onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                  placeholder="Product name"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-hover)',
                    color: 'var(--text-primary)',
                    fontSize: 13,
                    boxSizing: 'border-box',
                  }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  Inspection Type
                </label>
                <select
                  value={formData.inspection_type}
                  onChange={(e) => setFormData({ ...formData, inspection_type: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-hover)',
                    color: 'var(--text-primary)',
                    fontSize: 13,
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="factory">Factory</option>
                  <option value="product">Product</option>
                  <option value="process">Process</option>
                  <option value="audit">Audit</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  Scheduled Date
                </label>
                <input
                  type="date"
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-hover)',
                    color: 'var(--text-primary)',
                    fontSize: 13,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-hover)',
                    color: 'var(--text-primary)',
                    fontSize: 13,
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="pending">Pending</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Inspection location"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-hover)',
                    color: 'var(--text-primary)',
                    fontSize: 13,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Remarks
              </label>
              <textarea
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="Additional remarks"
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-hover)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                style={{
                  background: 'var(--primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {editingId ? 'Update' : 'Create'} Inspection
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null)
                    setFormData({
                      product_name: '',
                      inspection_type: 'factory',
                      status: 'pending',
                      scheduled_date: '',
                      location: '',
                      remarks: '',
                    })
                  }}
                  style={{
                    background: 'transparent',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '8px 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {isLoading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading inspections...</p>
        ) : inspections.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No inspections found. Create one to get started.</p>
        ) : (
          inspections.map((i: any) => (
            <div key={i._id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(108,99,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ClipboardList size={18} color="var(--primary)" />
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 700 }}>{i.product_name}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{i.inspection_type} • {i.location || 'No location'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Badge status={i.status} size="sm" />
                  <button
                    onClick={() => handleEdit(i)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(i._id)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--error)', padding: 4 }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Progress</span>
                  <span style={{ color: 'var(--text-primary)', fontSize: 12, fontWeight: 700 }}>
                    {i.status === 'completed' ? 100 : (i.status === 'in_progress' ? 60 : (i.status === 'scheduled' ? 20 : 0))}%
                  </span>
                </div>
                <div style={{ height: 6, background: 'var(--bg-hover)', borderRadius: 3, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${i.status === 'completed' ? 100 : (i.status === 'in_progress' ? 60 : (i.status === 'scheduled' ? 20 : 0))}%`,
                      background: 'var(--gradient-primary)',
                      borderRadius: 3,
                      transition: 'width 0.5s ease'
                    }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Scheduled: </span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
                    {i.scheduled_date ? formatDate(i.scheduled_date) : 'Not scheduled'}
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Status: </span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{i.status}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
