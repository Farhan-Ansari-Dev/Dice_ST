import React, { useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Loader2, BadgeCheck, Award, Layers, Globe2, Factory, ShieldCheck,
  Inbox, History, Check, X, Plus, Trash2, Pencil, ExternalLink, ShieldAlert, Rocket,
} from 'lucide-react'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import { Label, Input, Textarea, Select } from '../../components/common/Forms'
import { formatDate } from '../../utils/formatters'
import { toast } from '../../store/toastStore'
import { usePermissions } from '../../hooks/usePermissions'
import { cbService, CB_SCOPE_STATUSES, prettyStatus } from '../../services/cbService'

const card: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }
const muted: React.CSSProperties = { color: 'var(--text-muted)', fontSize: 13 }
const chip: React.CSSProperties = { display: 'inline-block', padding: '3px 9px', margin: '2px 4px 2px 0', background: 'var(--bg-hover)', borderRadius: 5, fontSize: 12, color: 'var(--text-secondary)' }
const sectionTitle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)', fontSize: 14, fontWeight: 700, margin: '0 0 14px' }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div><div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600 }}>{children}</div></div>
}

const EMPTY_SCOPE = { cert_type: '', product_categories: '', industries: '', markets: '', service_type: '', accreditation_id: '', scope_description: '', valid_from: '', valid_until: '', status: 'active' }
const EMPTY_ACC = { name: '', code: '', country_code: '', description: '', website: '', verification_source: '', status: 'active' }

const TABS = [
  { key: 'overview', label: 'Overview', icon: BadgeCheck },
  { key: 'accreditations', label: 'Accreditations', icon: Award },
  { key: 'scopes', label: 'Certification Scope', icon: Layers },
  { key: 'markets', label: 'Markets', icon: Globe2 },
  { key: 'industries', label: 'Industries', icon: Factory },
  { key: 'verification', label: 'Verification', icon: ShieldCheck },
  { key: 'requests', label: 'Requests', icon: Inbox },
  { key: 'audit', label: 'Audit History', icon: History },
] as const

export default function CertificationBodyDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { canEdit } = usePermissions()
  const [sp, setSp] = useSearchParams()
  const tab = (sp.get('tab') || 'overview')
  const setTab = (t: string) => setSp(prev => { prev.set('tab', t); return prev }, { replace: true })

  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState<any>(null)
  const [scopeModal, setScopeModal] = useState<{ open: boolean; scope: any | null }>({ open: false, scope: null })
  const [scopeForm, setScopeForm] = useState<any>(EMPTY_SCOPE)
  const [accModal, setAccModal] = useState(false)
  const [accForm, setAccForm] = useState<any>(EMPTY_ACC)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['cb', id] })

  const { data: cb, isLoading, error, refetch } = useQuery({ queryKey: ['cb', id], queryFn: () => cbService.getCB(id) })
  const { data: scopes } = useQuery({ queryKey: ['cb-scopes', id], queryFn: () => cbService.listScopes(id), enabled: !!id })
  const { data: accreditations } = useQuery({ queryKey: ['accreditations'], queryFn: () => cbService.listAccreditations(), enabled: tab === 'scopes' || tab === 'accreditations' })
  const { data: requests } = useQuery({ queryKey: ['cb-requests-for', id], queryFn: () => cbService.listRequests({ certification_body_id: id, limit: 100 }), enabled: tab === 'requests' })
  const { data: audit } = useQuery({ queryKey: ['cb-audit', id], queryFn: () => cbService.cbAudit(id), enabled: tab === 'audit' })

  const updateMut = useMutation({ mutationFn: (body: any) => cbService.updateCB(id, body), onSuccess: () => { invalidate(); setEditOpen(false); toast.success('Saved') }, onError: (e: any) => toast.error(e?.response?.data?.message || 'Save failed') })
  const verifyMut = useMutation({ mutationFn: (checks: any) => cbService.verifyCB(id, { checks }), onSuccess: (v: any) => { invalidate(); toast.success(`Verification: ${prettyStatus(v?.status)}`) }, onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed') })
  const publishMut = useMutation({ mutationFn: () => cbService.publishCB(id), onSuccess: () => { invalidate(); toast.success('Published — now visible to customers') }, onError: (e: any) => toast.error(e?.response?.data?.message || 'All checks must pass first') })
  const suspendMut = useMutation({ mutationFn: (reason: string) => cbService.suspendCB(id, reason), onSuccess: () => { invalidate(); toast.success('Suspended') }, onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed') })
  const scopeSaveMut = useMutation({
    mutationFn: (body: any) => scopeModal.scope ? cbService.updateScope(scopeModal.scope.id, body) : cbService.addScope(id, body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cb-scopes', id] }); setScopeModal({ open: false, scope: null }); toast.success('Scope saved') },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  })
  const scopeDelMut = useMutation({ mutationFn: (scopeId: string) => cbService.deleteScope(scopeId), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cb-scopes', id] }); toast.success('Scope removed') }, onError: () => toast.error('Failed') })
  const accCreateMut = useMutation({ mutationFn: (body: any) => cbService.createAccreditation(body), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['accreditations'] }); setAccModal(false); setAccForm(EMPTY_ACC); toast.success('Accreditation created') }, onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed') })
  const accArchiveMut = useMutation({ mutationFn: (accId: string) => cbService.deleteAccreditation(accId), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['accreditations'] }); toast.success('Accreditation archived') }, onError: () => toast.error('Failed') })

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Loader2 className="animate-spin" size={26} color="var(--text-muted)" /></div>
  if (error || !cb) return <div style={{ ...card, textAlign: 'center', color: 'var(--accent-coral)' }}>Failed to load. <button onClick={() => refetch()} style={{ color: 'var(--accent-purple)', background: 'none', border: 'none', cursor: 'pointer' }}>Retry</button></div>

  const v = cb.verification || {}
  const checks = v.checks || {}
  const accById: Record<string, any> = Object.fromEntries((accreditations || []).map((a: any) => [a._id, a]))
  const allScopes: any[] = scopes || []
  const now = Date.now()
  const industries = Array.from(new Set(allScopes.flatMap((s: any) => s.industries || [])))

  const openScope = (scope: any | null) => {
    setScopeForm(scope ? {
      cert_type: scope.cert_type || '', product_categories: (scope.product_categories || []).join(', '), industries: (scope.industries || []).join(', '),
      markets: (scope.markets || []).join(', '), service_type: scope.service_type || '', accreditation_id: scope.accreditation_id || '',
      scope_description: scope.scope_description || '', valid_from: scope.valid_from ? String(scope.valid_from).slice(0, 10) : '', valid_until: scope.valid_until ? String(scope.valid_until).slice(0, 10) : '', status: scope.status || 'active',
    } : EMPTY_SCOPE)
    setScopeModal({ open: true, scope })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <button onClick={() => navigate('/certification-bodies')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, padding: 0 }}><ArrowLeft size={15} /> Certification Bodies</button>

      {/* Header */}
      <div style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          {cb.logo_url ? <img src={cb.logo_url} alt="" style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'contain', background: 'var(--bg-hover)' }} /> : <div style={{ width: 48, height: 48, borderRadius: 10, background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BadgeCheck size={22} color="var(--accent-purple)" /></div>}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 20, fontWeight: 800 }}>{cb.name}</h1>
              {v.status && <Badge status={v.status} size="sm" />}
              {v.verified && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--accent-green)', fontSize: 12, fontWeight: 600 }}><ShieldCheck size={13} /> Verified by Sanyog</span>}
            </div>
            {cb.legal_name && <div style={muted}>{cb.legal_name}</div>}
            <div style={{ display: 'flex', gap: 14, marginTop: 4, flexWrap: 'wrap' }}>
              {cb.email && <span style={muted}>{cb.email}</span>}
              {cb.phone && <span style={muted}>{cb.phone}</span>}
              {cb.website && <a href={cb.website} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--accent-purple)', fontSize: 13, textDecoration: 'none' }}>Website <ExternalLink size={12} /></a>}
            </div>
          </div>
        </div>
        {canEdit && <Button size="sm" variant="secondary" icon={<Pencil size={14} />} onClick={() => { setEditForm({ name: cb.name, legal_name: cb.legal_name || '', email: cb.email || '', phone: cb.phone || '', website: cb.website || '', city: cb.location?.city || '', country_code: cb.location?.country_code || '', allowed_cert_types: (cb.allowed_cert_types || []).join(', ') }); setEditOpen(true) }}>Edit</Button>}
      </div>

      {/* Tabs */}
      <div style={{ ...card, padding: '4px 8px', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {TABS.map(t => { const Icon = t.icon; const active = tab === t.key; return (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: active ? 'var(--bg-hover)' : 'transparent', color: active ? 'var(--text-primary)' : 'var(--text-muted)', border: 'none', padding: '8px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
            <Icon size={13} /> {t.label}{t.key === 'requests' && requests?.pagination?.total ? ` (${requests.pagination.total})` : ''}
          </button>
        )})}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div style={{ ...card, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 18 }}>
          <Field label="Lifecycle">{v.status ? prettyStatus(v.status) : '—'}</Field>
          <Field label="Certifications">{(cb.allowed_cert_types || []).length ? cb.allowed_cert_types.join(', ') : 'All'}</Field>
          <Field label="Markets">{(cb.countries || []).length ? cb.countries.join(', ') : '—'}</Field>
          <Field label="Active scopes">{allScopes.filter((s: any) => s.status === 'active').length}</Field>
          <Field label="Location">{[cb.location?.city, cb.location?.country_code].filter(Boolean).join(', ') || '—'}</Field>
          <Field label="Last verified">{v.verified_at ? formatDate(v.verified_at) : '—'}</Field>
          {cb.scope_summary && <div style={{ gridColumn: '1 / -1' }}><Field label="Scope summary">{cb.scope_summary}</Field></div>}
        </div>
      )}

      {/* Accreditations (structured catalog) */}
      {tab === 'accreditations' && (
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ ...sectionTitle, margin: 0 }}><Award size={15} /> Accreditation catalog</h3>
            {canEdit && <Button size="sm" icon={<Plus size={14} />} onClick={() => { setAccForm(EMPTY_ACC); setAccModal(true) }}>New accreditation</Button>}
          </div>
          {(accreditations || []).length === 0 ? <p style={muted}>No accreditations defined yet. Create one, then attach it to a certification scope.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(accreditations || []).map((a: any) => (
                <div key={a._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--bg-body)', borderRadius: 'var(--radius)' }}>
                  <div>
                    <div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600 }}>{a.name} <span style={chip}>{a.code}</span> {a.country_code && <span style={muted}>· {a.country_code}</span>}</div>
                    {a.verification_source && <div style={muted}>Source: {a.verification_source}</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Badge status={a.status} size="sm" />
                    {canEdit && a.status !== 'archived' && <button title="Archive" onClick={() => confirm(`Archive ${a.code}?`) && accArchiveMut.mutate(a._id)} style={{ ...iconBtn, color: 'var(--accent-coral)' }}><Trash2 size={14} /></button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Scopes */}
      {tab === 'scopes' && (
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ ...sectionTitle, margin: 0 }}><Layers size={15} /> Certification scopes</h3>
            {canEdit && <Button size="sm" icon={<Plus size={14} />} onClick={() => openScope(null)}>Add scope</Button>}
          </div>
          {allScopes.length === 0 ? <p style={muted}>No scopes yet. Add structured scopes so this CB can be matched precisely.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {allScopes.map((sc: any) => {
                const expired = sc.valid_until && new Date(sc.valid_until).getTime() < now
                return (
                  <div key={sc.id} style={{ padding: '12px 14px', background: 'var(--bg-body)', borderRadius: 'var(--radius)', border: expired ? '1px solid var(--accent-coral)' : '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 700 }}>{sc.cert_type}</span>
                          <Badge status={expired ? 'expired' : sc.status} size="sm" />
                          {expired && <span style={{ color: 'var(--accent-coral)', fontSize: 11, fontWeight: 600 }}>EXPIRED</span>}
                          {sc.accreditation_id && accById[sc.accreditation_id] && <span style={chip}>{accById[sc.accreditation_id].code}</span>}
                        </div>
                        <div style={{ marginTop: 6, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 8 }}>
                          <div style={muted}>Products: {(sc.product_categories || []).join(', ') || 'All'}</div>
                          <div style={muted}>Markets: {(sc.markets || []).join(', ') || 'All'}</div>
                          <div style={muted}>Industries: {(sc.industries || []).join(', ') || '—'}</div>
                          <div style={muted}>Service: {sc.service_type || '—'}</div>
                          <div style={muted}>Valid: {sc.valid_from ? formatDate(sc.valid_from) : '—'} → {sc.valid_until ? formatDate(sc.valid_until) : '—'}</div>
                        </div>
                        {sc.scope_description && <div style={{ ...muted, marginTop: 4 }}>{sc.scope_description}</div>}
                      </div>
                      {canEdit && <div style={{ display: 'flex', gap: 6 }}>
                        <button title="Edit" onClick={() => openScope(sc)} style={iconBtn}><Pencil size={14} /></button>
                        <button title="Delete" onClick={() => confirm('Remove this scope?') && scopeDelMut.mutate(sc.id)} style={{ ...iconBtn, color: 'var(--accent-coral)' }}><Trash2 size={14} /></button>
                      </div>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Markets */}
      {tab === 'markets' && (
        <div style={card}>
          <h3 style={sectionTitle}><Globe2 size={15} /> Markets served</h3>
          {(() => { const mk = Array.from(new Set([...(cb.countries || []), ...allScopes.flatMap((s: any) => s.markets || [])])); return mk.length ? <div>{mk.map((m: any) => <span key={m} style={chip}>{m}</span>)}</div> : <p style={muted}>No markets recorded. Add markets on the CB profile or its scopes.</p> })()}
        </div>
      )}

      {/* Industries */}
      {tab === 'industries' && (
        <div style={card}>
          <h3 style={sectionTitle}><Factory size={15} /> Industries</h3>
          {industries.length ? <div>{industries.map((i: any) => <span key={i} style={chip}>{i}</span>)}</div> : <p style={muted}>No industries recorded on this CB's scopes.</p>}
        </div>
      )}

      {/* Verification */}
      {tab === 'verification' && (
        <div style={card}>
          <h3 style={sectionTitle}><ShieldCheck size={15} /> Verification workflow</h3>
          <p style={{ ...muted, marginTop: 0 }}>A CB is only shown to customers as “Verified by Sanyog” when all checks pass and it is published. Sanyog verifies the CB’s own claims — it is not an accreditation authority.</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0 16px' }}>
            <span style={muted}>Current:</span> {v.status ? <Badge status={v.status} size="sm" /> : <span style={muted}>draft</span>}
            {v.verified_at && <span style={muted}>· verified {formatDate(v.verified_at)}</span>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10, marginBottom: 16 }}>
            {(['organization', 'accreditation', 'scope', 'contact'] as const).map(k => (
              <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--bg-body)', borderRadius: 'var(--radius)', cursor: canEdit ? 'pointer' : 'default' }}>
                <input type="checkbox" disabled={!canEdit} checked={!!checks[k]} onChange={e => canEdit && verifyMut.mutate({ ...checks, [k]: e.target.checked })} />
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-primary)', fontSize: 13, textTransform: 'capitalize' }}>
                  {checks[k] ? <Check size={14} color="var(--accent-green)" /> : <X size={14} color="var(--text-muted)" />} {k} verified
                </span>
              </label>
            ))}
          </div>
          {v.notes && <div style={{ ...muted, marginBottom: 14 }}>Notes: {v.notes}</div>}
          {canEdit && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Button size="sm" icon={<Rocket size={14} />} loading={publishMut.isPending}
                disabled={!(checks.organization && checks.accreditation && checks.scope && checks.contact)}
                onClick={() => confirm('Publish this CB? It will appear in customer results.') && publishMut.mutate()}>Publish (verify)</Button>
              <Button size="sm" variant="danger" icon={<ShieldAlert size={14} />} disabled={v.status === 'suspended'}
                onClick={() => { const r = prompt('Reason for suspension (optional):') ?? undefined; if (r !== null) suspendMut.mutate(r || '') }}>Suspend</Button>
            </div>
          )}
          {!(checks.organization && checks.accreditation && checks.scope && checks.contact) && <p style={{ ...muted, marginTop: 10 }}>Complete all four checks to enable publishing.</p>}
        </div>
      )}

      {/* Requests */}
      {tab === 'requests' && (
        <div style={card}>
          <h3 style={sectionTitle}><Inbox size={15} /> Requests to this CB</h3>
          {(requests?.data || []).length === 0 ? <p style={muted}>No requests for this certification body yet.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(requests?.data || []).map((r: any) => (
                <div key={r._id} onClick={() => navigate(`/cb-requests/${r._id}`)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--bg-body)', borderRadius: 'var(--radius)', cursor: 'pointer' }}>
                  <div><span style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600 }}>{r.request_number}</span> <span style={muted}>{r.cert_type || ''} {r.market ? '· ' + r.market : ''}</span></div>
                  <Badge status={r.status} size="sm" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Audit */}
      {tab === 'audit' && (
        <div style={card}>
          <h3 style={sectionTitle}><History size={15} /> Audit history</h3>
          {(audit || []).length === 0 ? <p style={muted}>No audit entries yet.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(audit || []).map((a: any) => (
                <div key={a._id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                  <div><span style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, textTransform: 'capitalize' }}>{prettyStatus(a.action)}</span>{a.notes && <span style={{ ...muted, marginLeft: 6 }}>{a.notes}</span>}</div>
                  <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}><div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{a.actor?.name || 'System'}</div><div style={muted}>{formatDate(a.ts)}</div></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit modal */}
      {editForm && (
        <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Certification Body">
          <div style={{ display: 'grid', gap: 12 }}>
            <div><Label>Name</Label><Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></div>
            <div><Label>Legal name</Label><Input value={editForm.legal_name} onChange={e => setEditForm({ ...editForm, legal_name: e.target.value })} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><Label>Email</Label><Input value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
              <div><Label>Website</Label><Input value={editForm.website} onChange={e => setEditForm({ ...editForm, website: e.target.value })} /></div>
              <div><Label>City</Label><Input value={editForm.city} onChange={e => setEditForm({ ...editForm, city: e.target.value })} /></div>
              <div><Label>Country</Label><Input value={editForm.country_code} onChange={e => setEditForm({ ...editForm, country_code: e.target.value.toUpperCase() })} maxLength={2} /></div>
            </div>
            <div><Label>Certifications it can issue (comma-separated)</Label><Input value={editForm.allowed_cert_types} onChange={e => setEditForm({ ...editForm, allowed_cert_types: e.target.value })} /></div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button loading={updateMut.isPending} onClick={() => updateMut.mutate({ name: editForm.name, legal_name: editForm.legal_name, email: editForm.email, phone: editForm.phone, website: editForm.website, city: editForm.city, country_code: editForm.country_code, allowed_cert_types: editForm.allowed_cert_types.split(',').map((x: string) => x.trim()).filter(Boolean) })}>Save</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Scope modal */}
      <Modal isOpen={scopeModal.open} onClose={() => setScopeModal({ open: false, scope: null })} title={scopeModal.scope ? 'Edit scope' : 'Add scope'}>
        <div style={{ display: 'grid', gap: 12 }}>
          <div><Label>Certification *</Label><Input value={scopeForm.cert_type} onChange={e => setScopeForm({ ...scopeForm, cert_type: e.target.value })} placeholder="e.g. BIS_CRS" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><Label>Product categories (csv)</Label><Input value={scopeForm.product_categories} onChange={e => setScopeForm({ ...scopeForm, product_categories: e.target.value })} placeholder="Electronics" /></div>
            <div><Label>Markets (ISO, csv)</Label><Input value={scopeForm.markets} onChange={e => setScopeForm({ ...scopeForm, markets: e.target.value.toUpperCase() })} placeholder="SA, AE" /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><Label>Industries (csv)</Label><Input value={scopeForm.industries} onChange={e => setScopeForm({ ...scopeForm, industries: e.target.value })} /></div>
            <div><Label>Service type</Label><Input value={scopeForm.service_type} onChange={e => setScopeForm({ ...scopeForm, service_type: e.target.value })} placeholder="product_certification" /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><Label>Accreditation</Label>
              <Select value={scopeForm.accreditation_id} onChange={e => setScopeForm({ ...scopeForm, accreditation_id: e.target.value })}
                options={[{ value: '', label: 'None' }, ...(accreditations || []).filter((a: any) => a.status === 'active').map((a: any) => ({ value: a._id, label: `${a.code} — ${a.name}` }))]} />
            </div>
            <div><Label>Status</Label>
              <Select value={scopeForm.status} onChange={e => setScopeForm({ ...scopeForm, status: e.target.value })} options={CB_SCOPE_STATUSES.map(s => ({ value: s, label: prettyStatus(s) }))} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><Label>Valid from</Label><Input type="date" value={scopeForm.valid_from} onChange={e => setScopeForm({ ...scopeForm, valid_from: e.target.value })} /></div>
            <div><Label>Valid until</Label><Input type="date" value={scopeForm.valid_until} onChange={e => setScopeForm({ ...scopeForm, valid_until: e.target.value })} /></div>
          </div>
          <div><Label>Scope description</Label><Textarea rows={2} value={scopeForm.scope_description} onChange={e => setScopeForm({ ...scopeForm, scope_description: e.target.value })} /></div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button variant="ghost" onClick={() => setScopeModal({ open: false, scope: null })}>Cancel</Button>
            <Button loading={scopeSaveMut.isPending} disabled={!scopeForm.cert_type.trim()} onClick={() => scopeSaveMut.mutate({
              cert_type: scopeForm.cert_type.trim(),
              product_categories: scopeForm.product_categories.split(',').map((x: string) => x.trim()).filter(Boolean),
              industries: scopeForm.industries.split(',').map((x: string) => x.trim()).filter(Boolean),
              markets: scopeForm.markets.split(',').map((x: string) => x.trim()).filter(Boolean),
              service_type: scopeForm.service_type || undefined, accreditation_id: scopeForm.accreditation_id || undefined,
              scope_description: scopeForm.scope_description || undefined, status: scopeForm.status,
              valid_from: scopeForm.valid_from || undefined, valid_until: scopeForm.valid_until || undefined,
            })}>Save scope</Button>
          </div>
        </div>
      </Modal>

      {/* Accreditation create modal */}
      <Modal isOpen={accModal} onClose={() => setAccModal(false)} title="New accreditation">
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
            <div><Label>Name *</Label><Input value={accForm.name} onChange={e => setAccForm({ ...accForm, name: e.target.value })} /></div>
            <div><Label>Code *</Label><Input value={accForm.code} onChange={e => setAccForm({ ...accForm, code: e.target.value.toUpperCase() })} placeholder="NABCB" /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
            <div><Label>Country</Label><Input value={accForm.country_code} onChange={e => setAccForm({ ...accForm, country_code: e.target.value.toUpperCase() })} maxLength={2} /></div>
            <div><Label>Website</Label><Input value={accForm.website} onChange={e => setAccForm({ ...accForm, website: e.target.value })} /></div>
          </div>
          <div><Label>Verification source</Label><Input value={accForm.verification_source} onChange={e => setAccForm({ ...accForm, verification_source: e.target.value })} placeholder="Where this can be independently checked" /></div>
          <div><Label>Description</Label><Textarea rows={2} value={accForm.description} onChange={e => setAccForm({ ...accForm, description: e.target.value })} /></div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button variant="ghost" onClick={() => setAccModal(false)}>Cancel</Button>
            <Button loading={accCreateMut.isPending} disabled={!accForm.name.trim() || !accForm.code.trim()} onClick={() => accCreateMut.mutate(accForm)}>Create</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

const iconBtn: React.CSSProperties = { display: 'flex', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 6, padding: 6, cursor: 'pointer', color: 'var(--text-secondary)' }
