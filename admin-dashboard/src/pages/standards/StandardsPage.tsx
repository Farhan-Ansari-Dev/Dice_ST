import React, { useState, useMemo } from 'react'
import { Plus, Edit2, Trash2, FileText, Globe, Search, X } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Button from '../../components/common/Button'
import { toast } from '../../store/toastStore'
import apiClient from '../../services/apiClient'

interface DocReq {
  name: string
  description?: string
  is_mandatory?: boolean
}

export default function StandardsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [isModalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ certification_id: '', country_code: '', required_documents: [] as DocReq[] })
  const [newDocName, setNewDocName] = useState('')

  const { data: standards = [], isLoading } = useQuery({
    queryKey: ['standards'],
    queryFn: async () => {
      const res = await apiClient.get('/standards')
      return res.data.data || []
    },
  })

  const filtered = useMemo(() => {
    if (!search.trim()) return standards
    const q = search.toLowerCase()
    return standards.filter((s: any) =>
      s.country_code?.toLowerCase().includes(q) ||
      s.certification_id?.name?.toLowerCase().includes(q)
    )
  }, [standards, search])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        await apiClient.put(`/standards/${editingId}`, form)
      } else {
        await apiClient.post('/standards', form)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['standards'] })
      toast.success(editingId ? 'Standard updated' : 'Standard created')
      closeModal()
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save standard')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/standards/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['standards'] })
      toast.success('Standard deleted')
    },
    onError: () => toast.error('Failed to delete standard'),
  })

  const openCreate = () => {
    setEditingId(null)
    setForm({ certification_id: '', country_code: '', required_documents: [] })
    setModalOpen(true)
  }

  const openEdit = (s: any) => {
    setEditingId(s._id)
    setForm({
      certification_id: s.certification_id?._id || s.certification_id || '',
      country_code: s.country_code || '',
      required_documents: s.required_documents || [],
    })
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingId(null)
    setNewDocName('')
  }

  const addDocReq = () => {
    if (!newDocName.trim()) return
    setForm(prev => ({
      ...prev,
      required_documents: [...prev.required_documents, { name: newDocName.trim(), is_mandatory: true }],
    }))
    setNewDocName('')
  }

  const removeDocReq = (idx: number) => {
    setForm(prev => ({
      ...prev,
      required_documents: prev.required_documents.filter((_, i) => i !== idx),
    }))
  }

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 24 }}>
        <div>
          <div style={{ color: 'var(--accent-purple)', fontSize: 11, fontWeight: 800, letterSpacing: 1 }}>COMPLIANCE</div>
          <h2 style={{ color: 'var(--text-primary)', fontSize: 24, fontWeight: 800, margin: '5px 0 6px' }}>Certification Standards</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>Document requirements per certification type and country</p>
        </div>
        <Button icon={<Plus size={15} />} onClick={openCreate}>Add Standard</Button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 20, maxWidth: 320 }}>
        <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          placeholder="Search by country or certification..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box', paddingLeft: 32, padding: '9px 12px 9px 32px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg-body)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading standards...</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center' }}>
          <FileText size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
          <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>No standards found</div>
        </div>
      ) : (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={thStyle}>Certification</th>
                <th style={thStyle}>Country</th>
                <th style={thStyle}>Required Documents</th>
                <th style={{ ...thStyle, width: 100, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s: any) => (
                <tr key={s._id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {s.certification_id?.name || s.certification_id || '—'}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Globe size={14} color="var(--accent-purple)" />
                      <span style={{ fontWeight: 600 }}>{s.country_code}</span>
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {(s.required_documents || []).map((doc: DocReq, i: number) => (
                        <span key={i} style={{
                          fontSize: 11, padding: '2px 8px', borderRadius: 'var(--radius-full)',
                          background: doc.is_mandatory ? 'rgba(108,99,255,0.12)' : 'rgba(139,146,165,0.12)',
                          color: doc.is_mandatory ? 'var(--accent-purple)' : 'var(--text-secondary)',
                          fontWeight: 600,
                        }}>
                          {doc.name}
                        </span>
                      ))}
                      {(!s.required_documents || s.required_documents.length === 0) && (
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>None defined</span>
                      )}
                    </div>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                      <button onClick={() => openEdit(s)} style={iconBtnStyle} title="Edit"><Edit2 size={15} color="var(--accent-purple)" /></button>
                      <button onClick={() => { if (confirm('Delete this standard?')) deleteMutation.mutate(s._id) }} style={iconBtnStyle} title="Delete"><Trash2 size={15} color="#FF6B9D" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center' }} onClick={closeModal}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: 24, width: 480, maxWidth: '90vw', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: 'var(--text-primary)', margin: '0 0 16px', fontSize: 18 }}>{editingId ? 'Edit Standard' : 'New Standard'}</h3>

            <label style={labelStyle}>Certification ID</label>
            <input value={form.certification_id} onChange={e => setForm(p => ({ ...p, certification_id: e.target.value }))} placeholder="MongoDB ObjectId of certification" style={inputStyle} />

            <label style={labelStyle}>Country Code</label>
            <input value={form.country_code} onChange={e => setForm(p => ({ ...p, country_code: e.target.value.toUpperCase() }))} placeholder="e.g. IN, US, SA" maxLength={2} style={inputStyle} />

            <label style={labelStyle}>Required Documents</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input value={newDocName} onChange={e => setNewDocName(e.target.value)} placeholder="Document name..." style={{ ...inputStyle, flex: 1, marginBottom: 0 }} onKeyDown={e => e.key === 'Enter' && addDocReq()} />
              <Button onClick={addDocReq} variant="ghost" style={{ padding: '6px 12px' }}>Add</Button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
              {form.required_documents.map((doc, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--bg-body)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                  <FileText size={14} color="var(--accent-purple)" />
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)' }}>{doc.name}</span>
                  <span style={{ fontSize: 11, color: doc.is_mandatory ? 'var(--accent-purple)' : 'var(--text-muted)' }}>{doc.is_mandatory ? 'Required' : 'Optional'}</span>
                  <button onClick={() => removeDocReq(i)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 2 }}><X size={14} color="#FF6B9D" /></button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button variant="ghost" onClick={closeModal}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.certification_id || !form.country_code}>
                {saveMutation.isPending ? 'Saving...' : editingId ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const thStyle: React.CSSProperties = { textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }
const tdStyle: React.CSSProperties = { padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)' }
const labelStyle: React.CSSProperties = { display: 'block', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, marginBottom: 6, marginTop: 14 }
const inputStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '10px 11px', background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', outline: 'none', marginBottom: 4 }
const iconBtnStyle: React.CSSProperties = { border: 'none', background: 'transparent', cursor: 'pointer', padding: 5, display: 'grid', placeItems: 'center' }
