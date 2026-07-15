import React, { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import Button from '../../components/common/Button'
import apiClient from '../../services/apiClient'
import { toast } from '../../store/toastStore'

const EMPTY_FORM = {
  name: '', code: '', flag: '', demandLevel: 'Medium',
  importOpportunity: 'Medium', exportOpportunity: 'Medium',
  marketGrowth: 0, overview: '',
}

const inputStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: 10, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-body)', color: 'var(--text-primary)', outline: 'none' }
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }

export default function CountriesPage() {
  const [countries, setCountries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<any>(EMPTY_FORM)

  const fetchCountries = async () => {
    try {
      const res = await apiClient.get('/bi/countries')
      setCountries(res.data?.data || [])
    } catch (err) {
      toast.error('Failed to fetch countries')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCountries() }, [])

  const openCreate = () => { setEditingId(null); setFormData(EMPTY_FORM); setShowModal(true) }

  const openEdit = (country: any) => {
    setEditingId(country._id)
    setFormData({
      name: country.name || '', code: country.code || '', flag: country.flag || '',
      demandLevel: country.demandLevel || 'Medium',
      importOpportunity: country.importOpportunity || 'Medium',
      exportOpportunity: country.exportOpportunity || 'Medium',
      marketGrowth: Number(country.marketGrowth) || 0,
      overview: country.overview || '',
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this country?')) return
    try {
      await apiClient.delete(`/bi/countries/${id}`)
      toast.success('Country deleted')
      fetchCountries()
    } catch (err) {
      toast.error('Delete failed')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingId) {
        await apiClient.put(`/bi/countries/${editingId}`, formData)
        toast.success('Country updated')
      } else {
        await apiClient.post('/bi/countries', formData)
        toast.success('Country added')
      }
      setShowModal(false)
      setEditingId(null)
      fetchCountries()
    } catch (err: any) {
      toast.error(err.response?.data?.message || (editingId ? 'Update failed' : 'Creation failed'))
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Countries</h2>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0' }}>Manage country-specific compliance and trade data.</p>
        </div>
        <Button variant="primary" icon={<Plus size={16} />} onClick={openCreate}>Add Country</Button>
      </div>

      <div className="glass" style={{ borderRadius: 'var(--radius-lg)', padding: 16 }}>
        {loading ? <p>Loading...</p> : countries.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No countries yet. Add one to get started.</p>
        ) : (
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: 12 }}>Flag</th>
                <th>Name</th>
                <th>Demand Level</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {countries.map(country => (
                <tr key={country._id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: 12, fontSize: 24 }}>{country.flag}</td>
                  <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{country.name}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{country.demandLevel}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => openEdit(country)} title="Edit" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-blue)' }}><Edit2 size={16}/></button>
                      <button onClick={() => handleDelete(country._id)} title="Delete" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)' }}><Trash2 size={16}/></button>
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
          <div className="glass" style={{ padding: 24, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ marginTop: 0, color: 'var(--text-primary)' }}>{editingId ? 'Edit Country' : 'Add Country'}</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 2 }}>
                  <label style={labelStyle}>Country Name</label>
                  <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Germany" style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>ISO Code</label>
                  <input required value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })} placeholder="DE" maxLength={3} style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Flag (emoji)</label>
                  <input required value={formData.flag} onChange={e => setFormData({ ...formData, flag: e.target.value })} placeholder="🇩🇪" style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Demand Level</label>
                  <select value={formData.demandLevel} onChange={e => setFormData({ ...formData, demandLevel: e.target.value })} style={inputStyle}>
                    <option>Low</option><option>Medium</option><option>High</option><option>Very High</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Import Opportunity</label>
                  <select value={formData.importOpportunity} onChange={e => setFormData({ ...formData, importOpportunity: e.target.value })} style={inputStyle}>
                    <option>Low</option><option>Medium</option><option>High</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Export Opportunity</label>
                  <select value={formData.exportOpportunity} onChange={e => setFormData({ ...formData, exportOpportunity: e.target.value })} style={inputStyle}>
                    <option>Low</option><option>Medium</option><option>High</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Market Growth (%)</label>
                <input type="number" min={0} step="0.1" value={formData.marketGrowth === 0 ? '' : String(formData.marketGrowth)}
                  onChange={e => {
                    const parsed = parseFloat(e.target.value)
                    setFormData({ ...formData, marketGrowth: Number.isNaN(parsed) ? 0 : Math.max(0, parsed) })
                  }} placeholder="0" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Overview</label>
                <textarea rows={3} value={formData.overview} onChange={e => setFormData({ ...formData, overview: e.target.value })} placeholder="Market overview…" style={{ ...inputStyle, fontFamily: 'inherit' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 4 }}>
                <Button variant="secondary" type="button" onClick={() => { setShowModal(false); setEditingId(null) }}>Cancel</Button>
                <Button variant="primary" type="submit">{editingId ? 'Save Changes' : 'Add Country'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
