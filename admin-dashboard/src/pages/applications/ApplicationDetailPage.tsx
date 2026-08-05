import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Loader2, Package, GitBranch, UserPlus, StickyNote, Clock, History,
  FileText, Award, CreditCard, Shield, FlaskConical, Truck, Download, AlertTriangle,
} from 'lucide-react'
import Badge from '../../components/common/Badge'
import Avatar from '../../components/common/Avatar'
import Button from '../../components/common/Button'
import { formatDate } from '../../utils/formatters'
import { apiClient } from '../../services/apiClient'
import { toast } from '../../store/toastStore'

// Mirror of the backend ALLOWED_TRANSITIONS so the status dropdown only offers
// valid next states (the backend still validates).
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ['submitted', 'cancelled'],
  submitted: ['docs_review', 'cancelled'],
  docs_review: ['tech_review', 'docs_required', 'rejected', 'on_hold'],
  docs_required: ['docs_review', 'cancelled'],
  tech_review: ['testing', 'approval_pending', 'docs_required', 'rejected'],
  testing: ['approval_pending', 'docs_required', 'rejected'],
  approval_pending: ['approved', 'rejected', 'on_hold'],
  approved: ['cert_issued'],
  cert_issued: [],
  rejected: [],
  on_hold: ['docs_review', 'tech_review', 'cancelled'],
  cancelled: [],
}

const pretty = (s: string) => (s || '').replace(/_/g, ' ')

const card: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }
const sectionTitle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)', fontSize: 14, fontWeight: 700, margin: '0 0 14px' }
const muted: React.CSSProperties = { color: 'var(--text-muted)', fontSize: 13 }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
      <div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600 }}>{children}</div>
    </div>
  )
}

export default function ApplicationDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'documents' | 'certifications' | 'payments' | 'inspections' | 'testing' | 'shipments'>('documents')
  const [notes, setNotes] = useState<string | null>(null)
  const [newStatus, setNewStatus] = useState('')
  const [statusReason, setStatusReason] = useState('')
  const [assignee, setAssignee] = useState('')
  const [overrideTo, setOverrideTo] = useState('')
  const [overrideReason, setOverrideReason] = useState('')
  const [escalateTo, setEscalateTo] = useState('')
  const [escalateReason, setEscalateReason] = useState('')
  const [pickProduct, setPickProduct] = useState('')
  const [hsCode, setHsCode] = useState('')
  const [certTypeInput, setCertTypeInput] = useState('')

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['application', id] })

  const { data: app, isLoading, error } = useQuery({
    queryKey: ['application', id],
    queryFn: async () => (await apiClient.get(`/applications/${id}`)).data.data,
  })

  const { data: staff } = useQuery({
    queryKey: ['assignable_staff'],
    queryFn: async () => ((await apiClient.get('/users')).data.data || []).filter((u: any) => ['admin', 'super_admin', 'consultant', 'employee'].includes(u.role)),
  })

  const { data: audit } = useQuery({
    queryKey: ['application_audit', id],
    queryFn: async () => (await apiClient.get(`/applications/${id}/audit`)).data.data || [],
    enabled: !!id,
  })

  // Manual review: fetch product suggestions when the application is flagged.
  const isManual = !!app && (((app.tags || []) as string[]).includes('manual_review') || app.product_status === 'pending_validation')
  const { data: suggest } = useQuery({
    queryKey: ['product_suggestions', id],
    queryFn: async () => (await apiClient.get(`/applications/${id}/product-suggestions`)).data.data,
    enabled: isManual,
  })

  // Related records (only Documents / Certifications / Payments are linked to an
  // application in the backend; the others show an honest "not linked" state).
  const { data: documents } = useQuery({
    queryKey: ['app_documents', id],
    queryFn: async () => (await apiClient.get(`/documents?application_id=${id}`)).data.data || [],
    enabled: tab === 'documents',
  })
  const { data: certifications } = useQuery({
    queryKey: ['app_certs', id],
    queryFn: async () => ((await apiClient.get('/certifications')).data.data || []).filter((c: any) => String(c.application_id) === String(id)),
    enabled: tab === 'certifications',
  })
  const { data: payments } = useQuery({
    queryKey: ['app_payments', id],
    queryFn: async () => ((await apiClient.get('/payments')).data.data || []).filter((p: any) => String(p.application_id) === String(id)),
    enabled: tab === 'payments',
  })

  const transitionMut = useMutation({
    mutationFn: (body: any) => apiClient.post(`/applications/${id}/transition`, body),
    onSuccess: () => { invalidate(); queryClient.invalidateQueries({ queryKey: ['application_audit', id] }); toast.success('Status updated'); setNewStatus(''); setStatusReason('') },
    onError: (e: any) => toast.error(e?.response?.data?.message || e?.response?.data?.error === 'invalid_transition' ? 'Invalid transition' : 'Failed to update status'),
  })
  const assignMut = useMutation({
    mutationFn: (userId: string) => apiClient.post(`/applications/${id}/assign`, { user_ids: [userId], primary: userId }),
    onSuccess: () => { invalidate(); toast.success('Consultant assigned'); setAssignee('') },
    onError: () => toast.error('Failed to assign'),
  })
  const notesMut = useMutation({
    mutationFn: (value: string) => apiClient.put(`/applications/${id}`, { notes: value }),
    onSuccess: () => { invalidate(); toast.success('Notes saved') },
    onError: () => toast.error('Failed to save notes'),
  })
  const overrideMut = useMutation({
    mutationFn: (body: { to_status: string; reason: string }) => apiClient.post(`/applications/${id}/override`, body),
    onSuccess: () => { invalidate(); queryClient.invalidateQueries({ queryKey: ['application_audit', id] }); toast.success('Status overridden'); setOverrideTo(''); setOverrideReason('') },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed to override'),
  })
  const escalateMut = useMutation({
    mutationFn: (body: { manager_id: string; reason: string }) => apiClient.post(`/applications/${id}/escalate`, body),
    onSuccess: () => { invalidate(); toast.success('Escalated'); setEscalateTo(''); setEscalateReason('') },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed to escalate'),
  })
  const resolveMut = useMutation({
    mutationFn: (body: { product_id: string; hs_code?: string; cert_type?: string }) => apiClient.post(`/applications/${id}/resolve-product`, body),
    onSuccess: () => { invalidate(); queryClient.invalidateQueries({ queryKey: ['application_audit', id] }); toast.success('Product resolved — workflow can continue'); setPickProduct(''); setHsCode(''); setCertTypeInput('') },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed to resolve product'),
  })
  const downloadDoc = async (docId: string) => {
    try {
      const res = await apiClient.get(`/documents/${docId}/download`)
      const url = res.data?.data?.url
      if (url) window.open(url, '_blank')
      else toast.error('Download link unavailable')
    } catch { toast.error('Failed to get download link') }
  }

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Loader2 className="animate-spin" size={26} color="var(--text-muted)" /></div>
  if (error || !app) return (
    <div style={{ ...card, textAlign: 'center', color: 'var(--accent-coral)' }}>
      Failed to load application. <button onClick={() => navigate('/applications')} style={{ color: 'var(--accent-purple)', background: 'none', border: 'none', cursor: 'pointer' }}>Back to Applications</button>
    </div>
  )

  const productArchived = !!app.product_id?.deleted_at
  const nextStates = ALLOWED_TRANSITIONS[app.status] || []
  const notesValue = notes ?? app.notes ?? ''
  const TABS = [
    { key: 'documents', label: 'Documents', icon: FileText },
    { key: 'certifications', label: 'Certifications', icon: Award },
    { key: 'payments', label: 'Payments', icon: CreditCard },
    { key: 'inspections', label: 'Inspections', icon: Shield },
    { key: 'testing', label: 'Testing', icon: FlaskConical },
    { key: 'shipments', label: 'Shipments', icon: Truck },
  ] as const

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div>
        <button onClick={() => navigate('/applications')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, marginBottom: 12, padding: 0 }}>
          <ArrowLeft size={15} /> Back to Applications
        </button>
        <div style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, color: 'var(--accent-purple)', fontSize: 18, fontWeight: 800 }}>{app.application_number}</h2>
              <Badge status={app.status} size="sm" />
              {app.deleted_at && <span style={{ background: 'rgba(255,107,107,0.15)', color: '#FF6B6B', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Archived</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)', fontSize: 15, fontWeight: 600 }}>
              <Package size={15} color="var(--text-muted)" /> {app.product_id?.name || (app.product_status === 'pending_validation' ? 'Pending Validation' : 'Unknown Product')}
              {productArchived && <span style={{ background: 'rgba(255,179,71,0.15)', color: '#FFB347', padding: '1px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>Archived</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Meta strip */}
      <div style={{ ...card, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
        <Field label="Certification">{app.cert_type}</Field>
        <Field label="Priority"><span style={{ textTransform: 'capitalize' }}>{app.priority || 'medium'}</span></Field>
        <Field label="Created">{formatDate(app.created_at)}</Field>
        <Field label="Created By">{app.created_by?.name || '—'}</Field>
        <Field label="Assigned To">{app.primary_assignee?.name || 'Unassigned'}</Field>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(260px, 1fr)', gap: 20, alignItems: 'start' }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Related records */}
          <div style={card}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
              {TABS.map(t => {
                const Icon = t.icon
                const active = tab === t.key
                return (
                  <button key={t.key} onClick={() => setTab(t.key)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: active ? 'var(--bg-hover)' : 'transparent', color: active ? 'var(--text-primary)' : 'var(--text-muted)', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                    <Icon size={13} /> {t.label}
                  </button>
                )
              })}
            </div>

            {tab === 'documents' && (
              (documents || []).length === 0
                ? <p style={muted}>No documents linked to this application yet.</p>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {documents.map((d: any) => (
                      <div key={d.id || d._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-body)', borderRadius: 'var(--radius)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FileText size={14} color="var(--accent-purple)" /><span style={{ color: 'var(--text-primary)', fontSize: 13 }}>{d.name}</span><span style={muted}>{d.doc_type}</span></div>
                        <button onClick={() => downloadDoc(d.id || d._id)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: 'var(--accent-purple)', cursor: 'pointer', fontSize: 12 }}><Download size={13} /> Download</button>
                      </div>
                    ))}
                  </div>
            )}
            {tab === 'certifications' && (
              (certifications || []).length === 0
                ? <p style={muted}>No certifications issued for this application yet.</p>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {certifications.map((c: any) => (
                      <div key={c._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-body)', borderRadius: 'var(--radius)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Award size={14} color="var(--accent-green)" /><span style={{ color: 'var(--text-primary)', fontSize: 13 }}>{c.cert_number}</span><span style={muted}>{c.cert_type}</span></div>
                        <Badge status={c.status} size="sm" />
                      </div>
                    ))}
                  </div>
            )}
            {tab === 'payments' && (
              (payments || []).length === 0
                ? <p style={muted}>No payments recorded for this application yet.</p>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {payments.map((p: any) => (
                      <div key={p._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-body)', borderRadius: 'var(--radius)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><CreditCard size={14} color="var(--accent-purple)" /><span style={{ color: 'var(--text-primary)', fontSize: 13 }}>{p.invoice_number || p._id.slice(-6)}</span><span style={muted}>₹{((p.total_paise || 0) / 100).toLocaleString('en-IN')}</span></div>
                        <Badge status={p.status === 'captured' ? 'paid' : p.status} size="sm" />
                      </div>
                    ))}
                  </div>
            )}
            {(tab === 'inspections' || tab === 'testing' || tab === 'shipments') && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...muted }}>
                <AlertTriangle size={14} color="var(--text-muted)" />
                {pretty(tab).charAt(0).toUpperCase() + pretty(tab).slice(1)} are managed from their own module — open it to view records linked to this application.
              </div>
            )}
          </div>

          {/* Status timeline */}
          <div style={card}>
            <h3 style={sectionTitle}><Clock size={15} /> Status Timeline</h3>
            {(app.status_history || []).length === 0 ? (
              <p style={muted}>No status changes yet — application is still a draft.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {[...app.status_history].reverse().map((h: any, i: number) => (
                  <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: 16, position: 'relative' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-purple)', flexShrink: 0, marginTop: 3 }} />
                      {i < app.status_history.length - 1 && <div style={{ width: 2, flex: 1, background: 'var(--border)', marginTop: 2 }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600 }}>{pretty(h.from)} → {pretty(h.to)}</div>
                      <div style={muted}>{formatDate(h.at)}{h.reason ? ` · ${h.reason}` : ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Audit history */}
          <div style={card}>
            <h3 style={sectionTitle}><History size={15} /> Audit History</h3>
            {(audit || []).length === 0 ? (
              <p style={muted}>No audit entries yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {audit.map((a: any) => (
                  <div key={a._id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <span style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, textTransform: 'capitalize' }}>{pretty(a.action)}</span>
                      {a.notes && <span style={{ ...muted, marginLeft: 6 }}>{a.notes}</span>}
                    </div>
                    <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{a.actor?.name || 'System'}</div>
                      <div style={muted}>{formatDate(a.ts)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column — actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Manual review — identify product, assign HS code + certification, continue */}
          {isManual && (
            <div style={{ ...card, borderColor: '#FFB347' }}>
              <h3 style={sectionTitle}><Package size={15} /> Manual Review</h3>
              <div style={{ ...muted, marginBottom: 10 }}>
                {app.manual_review?.original_product && <div>Customer product: <b style={{ color: 'var(--text-primary)' }}>{app.manual_review.original_product}</b></div>}
                {app.manual_review?.requested_markets?.length ? <div>Markets: {app.manual_review.requested_markets.join(', ')}</div> : null}
                {app.manual_review?.reason && <div>Reason: {app.manual_review.reason}</div>}
                {typeof app.manual_review?.confidence_score === 'number' && <div>Confidence: {app.manual_review.confidence_score}%</div>}
                {app.manual_review?.ai_summary && <div>Notes: {app.manual_review.ai_summary}</div>}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Suggested products</div>
              {(suggest?.suggestions || []).length === 0
                ? <p style={muted}>No suggestions — paste a Product ID below.</p>
                : suggest.suggestions.map((s: any) => (
                    <label key={s.product_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', cursor: 'pointer' }}>
                      <input type="radio" name="pickProduct" checked={pickProduct === s.product_id} onChange={() => { setPickProduct(s.product_id); if (s.hsn_code) setHsCode(s.hsn_code) }} />
                      <span style={{ color: 'var(--text-primary)', fontSize: 13 }}>{s.name}{s.brand ? ` — ${s.brand}` : ''}</span>
                      <span style={muted}>{s.matchType} · {s.confidence}%</span>
                    </label>
                  ))}
              <input value={pickProduct} onChange={e => setPickProduct(e.target.value)} placeholder="…or paste a Product ID" style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', outline: 'none', margin: '10px 0' }} />
              <input value={hsCode} onChange={e => setHsCode(e.target.value)} placeholder="HS / HSN code (optional)" style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', outline: 'none', marginBottom: 10 }} />
              <input value={certTypeInput} onChange={e => setCertTypeInput(e.target.value)} placeholder="Certification type (e.g. BIS_CRS, optional)" style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', outline: 'none', marginBottom: 12 }} />
              <Button size="sm" disabled={!pickProduct || resolveMut.isPending} onClick={() => resolveMut.mutate({ product_id: pickProduct, hs_code: hsCode || undefined, cert_type: certTypeInput || undefined })}>
                {resolveMut.isPending ? 'Resolving…' : 'Resolve & Continue'}
              </Button>
            </div>
          )}

          {/* Change status */}
          <div style={card}>
            <h3 style={sectionTitle}><GitBranch size={15} /> Change Status</h3>
            {nextStates.length === 0 ? (
              <p style={muted}>This application is in a terminal state ({pretty(app.status)}).</p>
            ) : (
              <>
                <select value={newStatus} onChange={e => setNewStatus(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', outline: 'none', marginBottom: 10 }}>
                  <option value="">Select next status…</option>
                  {nextStates.map(s => <option key={s} value={s} style={{ textTransform: 'capitalize' }}>{pretty(s)}</option>)}
                </select>
                <input value={statusReason} onChange={e => setStatusReason(e.target.value)} placeholder="Reason (optional)" style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', outline: 'none', marginBottom: 12 }} />
                <Button size="sm" disabled={!newStatus || transitionMut.isPending} onClick={() => transitionMut.mutate({ to_status: newStatus, reason: statusReason || undefined })}>
                  {transitionMut.isPending ? 'Updating…' : 'Update Status'}
                </Button>
              </>
            )}
          </div>

          {/* Assign */}
          <div style={card}>
            <h3 style={sectionTitle}><UserPlus size={15} /> Assign Consultant</h3>
            {app.primary_assignee && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Avatar name={app.primary_assignee.name} size={24} />
                <span style={{ color: 'var(--text-primary)', fontSize: 13 }}>{app.primary_assignee.name}</span>
              </div>
            )}
            <select value={assignee} onChange={e => setAssignee(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', outline: 'none', marginBottom: 12 }}>
              <option value="">Select staff…</option>
              {(staff || []).map((u: any) => <option key={u._id} value={u._id}>{u.name} ({u.role})</option>)}
            </select>
            <Button size="sm" variant="secondary" disabled={!assignee || assignMut.isPending} onClick={() => assignMut.mutate(assignee)}>
              {assignMut.isPending ? 'Assigning…' : 'Assign'}
            </Button>
          </div>

          {/* Escalate */}
          <div style={card}>
            <h3 style={sectionTitle}><AlertTriangle size={15} /> Escalate to Manager</h3>
            <select value={escalateTo} onChange={e => setEscalateTo(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', outline: 'none', marginBottom: 10 }}>
              <option value="">Select manager…</option>
              {(staff || []).filter((u: any) => ['admin', 'super_admin'].includes(u.role)).map((u: any) => <option key={u._id} value={u._id}>{u.name} ({u.role})</option>)}
            </select>
            <input value={escalateReason} onChange={e => setEscalateReason(e.target.value)} placeholder="Reason (required)" style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', outline: 'none', marginBottom: 12 }} />
            <Button size="sm" variant="secondary" disabled={!escalateTo || !escalateReason || escalateMut.isPending} onClick={() => escalateMut.mutate({ manager_id: escalateTo, reason: escalateReason })}>
              {escalateMut.isPending ? 'Escalating…' : 'Escalate'}
            </Button>
          </div>

          {/* Admin override */}
          <div style={card}>
            <h3 style={sectionTitle}><Shield size={15} /> Admin Override</h3>
            <p style={{ ...muted, marginTop: 0, marginBottom: 12 }}>Force any status, bypassing the workflow. Always audited and notified.</p>
            <select value={overrideTo} onChange={e => setOverrideTo(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', outline: 'none', marginBottom: 10 }}>
              <option value="">Select status…</option>
              {Object.keys(ALLOWED_TRANSITIONS).filter(s => s !== app.status).map(s => <option key={s} value={s} style={{ textTransform: 'capitalize' }}>{pretty(s)}</option>)}
            </select>
            <input value={overrideReason} onChange={e => setOverrideReason(e.target.value)} placeholder="Reason (required)" style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', outline: 'none', marginBottom: 12 }} />
            <Button size="sm" variant="secondary" disabled={!overrideTo || !overrideReason || overrideMut.isPending} onClick={() => overrideMut.mutate({ to_status: overrideTo, reason: overrideReason })}>
              {overrideMut.isPending ? 'Overriding…' : 'Override Status'}
            </Button>
          </div>

          {/* Notes */}
          <div style={card}>
            <h3 style={sectionTitle}><StickyNote size={15} /> Notes</h3>
            <textarea value={notesValue} onChange={e => setNotes(e.target.value)} rows={5} placeholder="Internal notes about this application…"
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', outline: 'none', resize: 'vertical', marginBottom: 12 }} />
            <Button size="sm" variant="secondary" disabled={notesMut.isPending || notesValue === (app.notes ?? '')} onClick={() => notesMut.mutate(notesValue)}>
              {notesMut.isPending ? 'Saving…' : 'Save Notes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
