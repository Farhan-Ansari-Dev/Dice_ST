import React, { useState, useEffect, useRef } from 'react'
import { Plus, Edit2, Trash2, ChevronDown, Search } from 'lucide-react'
import Button from '../../components/common/Button'
import apiClient from '../../services/apiClient'
import { toast } from '../../store/toastStore'

const COUNTRY_FLAGS: { code: string; name: string; flag: string }[] = [
  { code: 'AF', name: 'Afghanistan', flag: '🇦🇫' }, { code: 'AL', name: 'Albania', flag: '🇦🇱' }, { code: 'DZ', name: 'Algeria', flag: '🇩🇿' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' }, { code: 'AU', name: 'Australia', flag: '🇦🇺' }, { code: 'AT', name: 'Austria', flag: '🇦🇹' },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩' }, { code: 'BE', name: 'Belgium', flag: '🇧🇪' }, { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' }, { code: 'CL', name: 'Chile', flag: '🇨🇱' }, { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' }, { code: 'HR', name: 'Croatia', flag: '🇭🇷' }, { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰' }, { code: 'EG', name: 'Egypt', flag: '🇪🇬' }, { code: 'ET', name: 'Ethiopia', flag: '🇪🇹' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮' }, { code: 'FR', name: 'France', flag: '🇫🇷' }, { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭' }, { code: 'GR', name: 'Greece', flag: '🇬🇷' }, { code: 'HK', name: 'Hong Kong', flag: '🇭🇰' },
  { code: 'HU', name: 'Hungary', flag: '🇭🇺' }, { code: 'IN', name: 'India', flag: '🇮🇳' }, { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'IR', name: 'Iran', flag: '🇮🇷' }, { code: 'IQ', name: 'Iraq', flag: '🇮🇶' }, { code: 'IE', name: 'Ireland', flag: '🇮🇪' },
  { code: 'IL', name: 'Israel', flag: '🇮🇱' }, { code: 'IT', name: 'Italy', flag: '🇮🇹' }, { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' }, { code: 'KR', name: 'South Korea', flag: '🇰🇷' }, { code: 'KW', name: 'Kuwait', flag: '🇰🇼' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' }, { code: 'MX', name: 'Mexico', flag: '🇲🇽' }, { code: 'MA', name: 'Morocco', flag: '🇲🇦' },
  { code: 'MM', name: 'Myanmar', flag: '🇲🇲' }, { code: 'NP', name: 'Nepal', flag: '🇳🇵' }, { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿' }, { code: 'NG', name: 'Nigeria', flag: '🇳🇬' }, { code: 'NO', name: 'Norway', flag: '🇳🇴' },
  { code: 'OM', name: 'Oman', flag: '🇴🇲' }, { code: 'PK', name: 'Pakistan', flag: '🇵🇰' }, { code: 'PE', name: 'Peru', flag: '🇵🇪' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' }, { code: 'PL', name: 'Poland', flag: '🇵🇱' }, { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦' }, { code: 'RO', name: 'Romania', flag: '🇷🇴' }, { code: 'RU', name: 'Russia', flag: '🇷🇺' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' }, { code: 'SG', name: 'Singapore', flag: '🇸🇬' }, { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' }, { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰' }, { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭' }, { code: 'TW', name: 'Taiwan', flag: '🇹🇼' }, { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷' }, { code: 'UA', name: 'Ukraine', flag: '🇺🇦' }, { code: 'AE', name: 'UAE', flag: '🇦🇪' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' }, { code: 'US', name: 'United States', flag: '🇺🇸' }, { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
]

function FlagPicker({ value, onChange }: { value: string; onChange: (flag: string, code: string) => void }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = COUNTRY_FLAGS.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen(!open)} style={{
        width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 6,
        border: '1px solid var(--border)', background: 'var(--bg-body)', color: 'var(--text-primary)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontSize: 20, minHeight: 40,
      }}>
        <span>{value || '🏳️'}</span>
        <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 8, marginTop: 4, boxShadow: 'var(--shadow-card)',
          maxHeight: 240, display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Search size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              autoFocus value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search country…"
              style={{ border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)', fontSize: 13, width: '100%' }}
            />
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.map(c => (
              <button key={c.code} type="button" onClick={() => { onChange(c.flag, c.code); setOpen(false); setSearch('') }} style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '7px 10px', border: 'none', background: value === c.flag ? 'var(--bg-hover)' : 'transparent',
                cursor: 'pointer', color: 'var(--text-primary)', fontSize: 13, textAlign: 'left',
              }}>
                <span style={{ fontSize: 18 }}>{c.flag}</span>
                <span>{c.name}</span>
                <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 11 }}>{c.code}</span>
              </button>
            ))}
            {filtered.length === 0 && <div style={{ padding: 12, color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>No match</div>}
          </div>
        </div>
      )}
    </div>
  )
}

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
                      <button onClick={() => handleDelete(country._id)} title="Delete" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-coral)' }}><Trash2 size={16}/></button>
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
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: 24, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ marginTop: 0, color: 'var(--text-primary)' }}>{editingId ? 'Edit Country' : 'Add Country'}</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 2 }}>
                  <label style={labelStyle}>Country Name</label>
                  <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Germany" style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>ISO Code</label>
                  <input required value={formData.code} onChange={e => {
                    const code = e.target.value.toUpperCase()
                    const match = COUNTRY_FLAGS.find(c => c.code === code)
                    setFormData({ ...formData, code, ...(match ? { flag: match.flag } : {}) })
                  }} placeholder="DE" maxLength={3} style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Flag</label>
                  <FlagPicker value={formData.flag} onChange={(flag, code) => setFormData({ ...formData, flag, code })} />
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
