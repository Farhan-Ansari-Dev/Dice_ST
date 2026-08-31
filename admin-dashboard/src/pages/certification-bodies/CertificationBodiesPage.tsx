import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, Plus, Search, Loader2, ChevronLeft, ChevronRight, ShieldCheck, ShieldAlert, Eye } from 'lucide-react'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import EmptyState from '../../components/common/EmptyState'
import { Label, Input } from '../../components/common/Forms'
import { formatDate } from '../../utils/formatters'
import { toast } from '../../store/toastStore'
import { usePermissions } from '../../hooks/usePermissions'
import { cbService, CB_VERIFICATION_STATUSES, prettyStatus } from '../../services/cbService'

const card: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }
const muted: React.CSSProperties = { color: 'var(--text-muted)', fontSize: 13 }
const inputStyle: React.CSSProperties = { padding: '9px 12px', background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', outline: 'none', fontSize: 13 }
const th: React.CSSProperties = { textAlign: 'left', padding: '10px 14px', color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, whiteSpace: 'nowrap' }
const td: React.CSSProperties = { padding: '12px 14px', fontSize: 13, color: 'var(--text-primary)', borderTop: '1px solid var(--border)', verticalAlign: 'middle' }
const chip: React.CSSProperties = { display: 'inline-block', padding: '2px 7px', margin: '1px 3px 1px 0', background: 'var(--bg-hover)', borderRadius: 4, fontSize: 11, color: 'var(--text-secondary)' }

const EMPTY_CB = { name: '', legal_name: '', email: '', phone: '', website: '', country_code: '', allowed_cert_types: '' }

export default function CertificationBodiesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { canCreate, canEdit } = usePermissions()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [q, setQ] = useState('')
  const [verification, setVerification] = useState('')
  const [country, setCountry] = useState('')
  const [certType, setCertType] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_CB)
  const limit = 20

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['cbs', page, q, verification, country, certType],
    queryFn: () => cbService.listCBs({ page, limit, q: q || undefined, verification_status: verification || undefined, country: country || undefined, cert_type: certType || undefined }),
  })

  const createMut = useMutation({
    mutationFn: (body: any) => cbService.createCB(body),
    onSuccess: (cb: any) => { setCreateOpen(false); setForm(EMPTY_CB); queryClient.invalidateQueries({ queryKey: ['cbs'] }); toast.success('Certification body created'); if (cb?.id || cb?._id) navigate(`/certification-bodies/${cb.id || cb._id}`) },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to create'),
  })
  const suspendMut = useMutation({
    mutationFn: (id: string) => cbService.suspendCB(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cbs'] }); toast.success('Certification body suspended') },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to suspend'),
  })

  const items: any[] = data?.data || []
  const pagination = data?.pagination || { page: 1, total_pages: 1, total: 0 }
  const submitSearch = () => { setQ(search.trim()); setPage(1) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, margin: 0, color: 'var(--text-primary)', fontSize: 22, fontWeight: 800 }}>
            <BadgeCheck size={22} color="var(--accent-purple)" /> Certification Bodies
          </h1>
          <p style={{ ...muted, margin: '4px 0 0' }}>{pagination.total} certification bodies</p>
        </div>
        {canCreate && (
          <Button size="sm" icon={<Plus size={15} />} onClick={() => setCreateOpen(true)}>Add Certification Body</Button>
        )}
      </div>

      {/* Filters */}
      <div style={{ ...card, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitSearch()}
            placeholder="Search name or legal name…" style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', paddingLeft: 32 }} />
        </div>
        <select value={verification} onChange={e => { setVerification(e.target.value); setPage(1) }} style={inputStyle}>
          <option value="">All verification</option>
          {CB_VERIFICATION_STATUSES.map(s => <option key={s} value={s} style={{ textTransform: 'capitalize' }}>{prettyStatus(s)}</option>)}
        </select>
        <input value={country} onChange={e => { setCountry(e.target.value.toUpperCase()); setPage(1) }} placeholder="Country (ISO)" style={{ ...inputStyle, width: 110 }} />
        <input value={certType} onChange={e => { setCertType(e.target.value); setPage(1) }} placeholder="Certification" style={{ ...inputStyle, width: 140 }} />
        <Button size="sm" variant="secondary" onClick={submitSearch}>Search</Button>
      </div>

      {/* Table / states */}
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Loader2 className="animate-spin" size={26} color="var(--text-muted)" /></div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <p style={{ color: 'var(--accent-coral)', marginBottom: 12 }}>Failed to load certification bodies.</p>
            <Button size="sm" variant="secondary" onClick={() => refetch()}>Retry</Button>
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: 32 }}>
            <EmptyState icon="🏛️" title="No certification bodies available"
              subtitle={q || verification || country || certType ? 'No bodies match these filters.' : 'Add your first certification body to start building the directory.'}
              action={canCreate && !(q || verification || country || certType) ? <Button size="sm" icon={<Plus size={15} />} onClick={() => setCreateOpen(true)}>Add Certification Body</Button> : undefined} />
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead><tr>
                <th style={th}>Certification Body</th><th style={th}>Verification</th><th style={th}>Accreditations</th>
                <th style={th}>Certifications</th><th style={th}>Markets</th><th style={th}>Last Verified</th><th style={th}>Updated</th><th style={th}>Actions</th>
              </tr></thead>
              <tbody>
                {items.map((cb) => {
                  const v = cb.cb_verification?.status
                  const accs: string[] = cb.cb_profile?.accreditations || []
                  const certs: string[] = cb.settings?.allowed_cert_types || []
                  const countries: string[] = cb.cb_profile?.countries || []
                  return (
                    <tr key={cb._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/certification-bodies/${cb._id}`)}>
                      <td style={td}>
                        <div style={{ fontWeight: 600 }}>{cb.name}</div>
                        {cb.legal_name && <div style={muted}>{cb.legal_name}</div>}
                      </td>
                      <td style={td}>{v ? <Badge status={v} size="sm" /> : <span style={muted}>—</span>}</td>
                      <td style={td}>{accs.length ? <span style={muted}>{accs.length} on record</span> : <span style={muted}>—</span>}</td>
                      <td style={td}>{certs.length ? certs.slice(0, 3).map(c => <span key={c} style={chip}>{c}</span>) : <span style={muted}>All</span>}{certs.length > 3 && <span style={muted}>+{certs.length - 3}</span>}</td>
                      <td style={td}>{countries.length ? countries.slice(0, 4).join(', ') : <span style={muted}>—</span>}{countries.length > 4 && <span style={muted}> +{countries.length - 4}</span>}</td>
                      <td style={td}>{cb.cb_verification?.verified_at ? formatDate(cb.cb_verification.verified_at) : <span style={muted}>—</span>}</td>
                      <td style={td}><span style={muted}>{formatDate(cb.updated_at)}</span></td>
                      <td style={td} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button title="View" onClick={() => navigate(`/certification-bodies/${cb._id}`)} style={iconBtn}><Eye size={15} /></button>
                          {canEdit && v !== 'verified' && <button title="Verify" onClick={() => navigate(`/certification-bodies/${cb._id}?tab=verification`)} style={{ ...iconBtn, color: 'var(--accent-green)' }}><ShieldCheck size={15} /></button>}
                          {canEdit && v !== 'suspended' && <button title="Suspend" onClick={() => { if (confirm(`Suspend ${cb.name}? It will be removed from customer results.`)) suspendMut.mutate(cb._id) }} style={{ ...iconBtn, color: 'var(--accent-coral)' }}><ShieldAlert size={15} /></button>}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && !error && items.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={muted}>Page {pagination.page} of {pagination.total_pages}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} style={pageBtn}><ChevronLeft size={16} /></button>
            <button disabled={page >= pagination.total_pages} onClick={() => setPage(p => p + 1)} style={pageBtn}><ChevronRight size={16} /></button>
          </div>
        </div>
      )}

      {/* Create modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Add Certification Body" subtitle="Creates a draft CB. Add scopes and verify it before it appears to customers.">
        <div style={{ display: 'grid', gap: 12 }}>
          <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Alpha Certifiers" /></div>
          <div><Label>Legal name</Label><Input value={form.legal_name} onChange={e => setForm({ ...form, legal_name: e.target.value })} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><Label>Email</Label><Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
            <div><Label>Website</Label><Input value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} /></div>
            <div><Label>Country (ISO)</Label><Input value={form.country_code} onChange={e => setForm({ ...form, country_code: e.target.value.toUpperCase() })} placeholder="IN" maxLength={2} /></div>
          </div>
          <div><Label>Certifications it can issue (comma-separated)</Label><Input value={form.allowed_cert_types} onChange={e => setForm({ ...form, allowed_cert_types: e.target.value })} placeholder="BIS_CRS, SASO" /></div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button loading={createMut.isPending} disabled={!form.name.trim()} onClick={() => createMut.mutate({
              name: form.name.trim(), legal_name: form.legal_name || undefined, email: form.email || undefined, phone: form.phone || undefined,
              website: form.website || undefined, country_code: form.country_code || undefined,
              allowed_cert_types: form.allowed_cert_types.split(',').map(x => x.trim()).filter(Boolean),
            })}>Create</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

const iconBtn: React.CSSProperties = { display: 'flex', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 6, padding: 6, cursor: 'pointer', color: 'var(--text-secondary)' }
const pageBtn: React.CSSProperties = { display: 'flex', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, padding: 7, cursor: 'pointer', color: 'var(--text-secondary)' }
