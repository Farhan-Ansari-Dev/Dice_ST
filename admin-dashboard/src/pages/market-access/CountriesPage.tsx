import React, { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import Button from '../../components/common/Button'
import apiClient from '../../services/apiClient'
import { toast } from '../../store/toastStore'

export default function CountriesPage() {
  const [countries, setCountries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Countries</h2>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0' }}>Manage country-specific compliance and trade data.</p>
        </div>
        <Button variant="primary" icon={<Plus size={16} />}>Add Country</Button>
      </div>

      <div className="glass" style={{ borderRadius: 'var(--radius-lg)', padding: 16 }}>
        {loading ? <p>Loading...</p> : (
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
    </div>
  )
}
