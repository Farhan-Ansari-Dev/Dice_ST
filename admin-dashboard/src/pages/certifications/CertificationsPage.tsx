import React, { useState } from 'react'
import { Search, Plus, Award, AlertTriangle, Trash2, RefreshCcw, Edit2, Filter } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Badge from '../../components/common/Badge'
import Avatar from '../../components/common/Avatar'
import Button from '../../components/common/Button'
import { formatDate } from '../../utils/formatters'
import { apiClient } from '../../services/apiClient'

const isExpiringSoon = (expiry: string) => {
  const days = Math.ceil((new Date(expiry).getTime() - Date.now()) / 86400000)
  return days > 0 && days <= 60
}

export default function CertificationsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showDeleted, setShowDeleted] = useState(true)

  const { data: certs, isLoading } = useQuery({
    queryKey: ['certifications', showDeleted],
    queryFn: async () => {
      const res = await apiClient.get(`/certifications${showDeleted ? '?showDeleted=true' : ''}`)
      return res.data.data || []
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/certifications/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['certifications'] })
  })

  const restoreMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/certifications/${id}/restore`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['certifications'] })
  })

  const filtered = (certs || []).filter((c: any) =>
    (c.org_id?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.cert_type || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.cert_number || '').toLowerCase().includes(search.toLowerCase())
  )

  const expiringCount = filtered.filter((c: any) => isExpiringSoon(c.expiry_date) && !c.deleted_at).length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ color: 'var(--text-primary)', fontSize: 20, fontWeight: 700, margin: 0 }}>Certifications</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 0' }}>{filtered.length} certificates tracked</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" icon={<Filter size={14} />} size="sm" onClick={() => setShowDeleted(!showDeleted)}>
            {showDeleted ? 'Hide Deleted' : 'Show Deleted'}
          </Button>
          <Button icon={<Plus size={14} />} size="sm">Add Certificate</Button>
        </div>
      </div>

      {/* Alert Banner */}
      {expiringCount > 0 && (
        <div style={{ background: 'rgba(255,179,71,0.08)', border: '1px solid rgba(255,179,71,0.3)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertTriangle size={16} color="#FFB347" />
          <span style={{ color: '#FFB347', fontSize: 13 }}>
            <strong>{expiringCount} certificate(s)</strong> expiring within 60 days — review and initiate renewal.
          </span>
        </div>
      )}

      <div style={{ position: 'relative', marginBottom: 20, maxWidth: 360 }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search certificates…"
          style={{ width: '100%', padding: '9px 12px 9px 36px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
              {['Cert Number', 'Client', 'Type', 'Product', 'Standard', 'Status', 'Expiry', 'Actions'].map(h => (
                <th key={h} style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textAlign: 'left', padding: '12px 16px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
               <tr><td colSpan={8} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading certificates...</td></tr>
            ) : filtered.length === 0 ? (
               <tr><td colSpan={8} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No certificates found.</td></tr>
            ) : filtered.map((cert: any) => {
              const expiring = isExpiringSoon(cert.expiry_date) && !cert.deleted_at
              return (
                <tr key={cert._id} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.15s', opacity: cert.deleted_at ? 0.5 : 1 }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Award size={13} color="var(--accent-purple)" />
                      <span style={{ color: 'var(--accent-purple)', fontSize: 12, fontWeight: 600, textDecoration: cert.deleted_at ? 'line-through' : 'none' }}>{cert.cert_number}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar name={cert.org_id?.name || 'Unknown'} size={24} />
                      <span style={{ color: 'var(--text-primary)', fontSize: 13 }}>{cert.org_id?.name || 'Unknown'}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: 'rgba(108,99,255,0.12)', color: 'var(--accent-purple)', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>{cert.cert_type}</span>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: 12 }}>{cert.product_id?.name || '—'}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 11 }}>{cert.scheme || '—'}</td>
                  <td style={{ padding: '12px 16px' }}><Badge status={cert.deleted_at ? 'suspended' : cert.status} size="sm" /></td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ color: expiring ? '#FFB347' : cert.status === 'expired' ? '#FF6B6B' : 'var(--text-secondary)', fontSize: 12, fontWeight: expiring ? 600 : 400 }}>
                      {expiring && '⚠ '}{cert.expiry_date ? formatDate(cert.expiry_date) : '—'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} title="Edit">
                        <Edit2 size={14} />
                      </button>
                      {cert.deleted_at ? (
                        <button onClick={() => restoreMutation.mutate(cert._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-green)' }} title="Restore">
                          <RefreshCcw size={14} />
                        </button>
                      ) : (
                        <button onClick={() => deleteMutation.mutate(cert._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-coral)' }} title="Delete">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
