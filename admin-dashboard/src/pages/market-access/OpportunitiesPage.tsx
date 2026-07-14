import React, { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, Globe2 } from 'lucide-react'
import Button from '../../components/common/Button'
import apiClient from '../../services/apiClient'
import { toast } from '../../store/toastStore'

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    title: '', slug: '', category: 'Manufacturing', industry: 'Electronics', country: 'India', overview: '', investment: 0, demand: 'Medium', risk: 'Medium', status: 'draft'
  })

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await apiClient.post('/bi/opportunities', formData)
      toast.success('Opportunity Created!')
      setShowModal(false)
      fetchOpps()
    } catch (err) {
      toast.error('Creation failed')
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Business Opportunities</h2>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0' }}>Manage market access and investment opportunities.</p>
        </div>
        <Button variant="primary" icon={<Plus size={16} />} onClick={() => setShowModal(true)}>Add Opportunity</Button>
      </div>

      <div className="glass" style={{ borderRadius: 'var(--radius-lg)', padding: 16 }}>
        {loading ? <p>Loading...</p> : (
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
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-blue)' }}><Edit2 size={16}/></button>
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)' }}><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass" style={{ padding: 24, width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto', borderRadius: 'var(--radius-lg)' }}>
            <h3>Create Opportunity</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <input placeholder="Title / Name" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value, slug: e.target.value.toLowerCase().replace(/ /g, '-')})} style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-body)', color: 'white' }} />
              <input placeholder="Industry (Tag)" required value={formData.industry} onChange={e => setFormData({...formData, industry: e.target.value})} style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-body)', color: 'white' }} />
              <input placeholder="Country" required value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-body)', color: 'white' }} />
              
              <textarea placeholder="Description / Overview" required rows={3} value={formData.overview} onChange={e => setFormData({...formData, overview: e.target.value})} style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-body)', color: 'white' }} />
              
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Est. Investment</label>
                  <input placeholder="Investment Required" type="number" required value={formData.investment} onChange={e => setFormData({...formData, investment: Number(e.target.value)})} style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-body)', color: 'white' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Market Demand</label>
                  <select value={formData.demand} onChange={e => setFormData({...formData, demand: e.target.value})} style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-body)', color: 'white' }}>
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
                  style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-body)', color: 'white' }} 
                />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                <Button variant="secondary" onClick={() => setShowModal(false)} type="button">Cancel</Button>
                <Button variant="primary" type="submit">Create</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
