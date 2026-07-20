import React, { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, Globe2 } from 'lucide-react'
import Button from '../../components/common/Button'
import apiClient from '../../services/apiClient'
import { toast } from '../../store/toastStore'

const EMPTY_FORM = {
  title: '', slug: '', category: 'Manufacturing', industry: 'Electronics', country: 'India', overview: '', investment: 0, demand: 'Medium', risk: 'Medium', status: 'draft'
}

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<any>(EMPTY_FORM)

  const fetchOpps = async () => {
    try {
      const res = await apiClient.get('/bi/opportunities')
      setOpportunities(res.data?.data || [])
    } catch (err) {
      toast.error('Failed to fetch opportunities')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchOpps() }, [])

  const openCreate = () => { setEditingId(null); setFormData(EMPTY_FORM); setShowModal(true) }

  const openEdit = (opp: any) => {
    setEditingId(opp._id)
    setFormData({
      title: opp.title || '', slug: opp.slug || '', category: opp.category || 'Manufacturing',
      industry: opp.industry || '', country: opp.country || '', overview: opp.overview || '',
      investment: Number(opp.investment) || 0, demand: opp.demand || 'Medium',
      risk: opp.risk || 'Medium', status: opp.status || 'draft',
      requiredCertifications: opp.requiredCertifications || [],
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this opportunity?')) return
    try {
      await apiClient.delete(`/bi/opportunities/${id}`)
      toast.success('Opportunity deleted')
      fetchOpps()
    } catch (err) {
      toast.error('Delete failed')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingId) {
        await apiClient.put(`/bi/opportunities/${editingId}`, formData)
        toast.success('Opportunity updated!')
      } else {
        await apiClient.post('/bi/opportunities', formData)
        toast.success('Opportunity Created!')
      }
      setShowModal(false)
      setEditingId(null)
      fetchOpps()
    } catch (err) {
      toast.error(editingId ? 'Update failed' : 'Creation failed')
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Business Opportunities</h2>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0' }}>Manage market access and investment opportunities.</p>
        </div>
        <Button variant="primary" icon={<Plus size={16} />} onClick={openCreate}>Add Opportunity</Button>
      </div>

      <div className="glass" style={{ borderRadius: 'var(--radius-lg)', padding: 16 }}>
        {loading ? <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>Loading...</p> : opportunities.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <Globe2 size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
            <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>No opportunities yet. Add one to get started.</div>
          </div>
        ) : (
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: 12 }}>Title</th>
                <th>Industry</th>
                <th>Country</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {opportunities.map(opp => (
                <tr key={opp._id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{opp.title}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{opp.industry}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{opp.country}</td>
                  <td>
                    <span style={{ padding: '4px 8px', borderRadius: 12, fontSize: 12, background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                      {opp.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => openEdit(opp)} title="Edit" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-blue)' }}><Edit2 size={16}/></button>
                      <button onClick={() => handleDelete(opp._id)} title="Delete" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-coral)' }}><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: 24, width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto', borderRadius: 'var(--radius-lg)' }}>
            <h3>{editingId ? 'Edit Opportunity' : 'Create Opportunity'}</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <input placeholder="Title / Name" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value, slug: e.target.value.toLowerCase().replace(/ /g, '-')})} style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)' }} />
              <input placeholder="Industry (Tag)" required value={formData.industry} onChange={e => setFormData({...formData, industry: e.target.value})} style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)' }} />
              <input placeholder="Country" required value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)' }} />

              <textarea placeholder="Description / Overview" required rows={3} value={formData.overview} onChange={e => setFormData({...formData, overview: e.target.value})} style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)' }} />
              
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Est. Investment</label>
                  <input placeholder="Investment Required" type="number" min={0} step={1} required
                    value={formData.investment === 0 ? '' : String(formData.investment)}
                    onChange={e => {
                      const parsed = parseInt(e.target.value, 10)
                      setFormData({ ...formData, investment: Number.isNaN(parsed) ? 0 : Math.max(0, parsed) })
                    }}
                    style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Market Demand</label>
                  <select value={formData.demand} onChange={e => setFormData({...formData, demand: e.target.value})} style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Very High">Very High</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Required Certifications (comma separated)</label>
                <input
                  placeholder="e.g. BIS, CE, RoHS"
                  value={(formData as any).requiredCertifications?.join(', ') || ''}
                  onChange={e => setFormData({...formData, requiredCertifications: e.target.value.split(',').map(s => s.trim()).filter(Boolean)} as any)}
                  style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                <Button variant="secondary" onClick={() => setShowModal(false)} type="button">Cancel</Button>
                <Button variant="primary" type="submit">{editingId ? 'Save Changes' : 'Create'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
