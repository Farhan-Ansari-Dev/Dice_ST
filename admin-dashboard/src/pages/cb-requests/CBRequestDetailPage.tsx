import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2, Inbox, UserPlus, GitBranch, Lock, MessageSquare, FileText, Download, ExternalLink, Receipt, Clock, History } from 'lucide-react'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import { Label, Input, Textarea, Select } from '../../components/common/Forms'
import { formatDate } from '../../utils/formatters'
import { apiClient } from '../../services/apiClient'
import { toast } from '../../store/toastStore'
import { usePermissions } from '../../hooks/usePermissions'
import { cbService, CB_REQUEST_STATUSES, prettyStatus } from '../../services/cbService'

const card: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }
const muted: React.CSSProperties = { color: 'var(--text-muted)', fontSize: 13 }
const sectionTitle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)', fontSize: 14, fontWeight: 700, margin: '0 0 14px' }
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div><div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600 }}>{children}</div></div>
}

export default function CBRequestDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { canEdit } = usePermissions()

  const [assignee, setAssignee] = useState('')
  const [statusTo, setStatusTo] = useState('')
  const [customerNote, setCustomerNote] = useState('')
  const [internalNote, setInternalNote] = useState<string | null>(null)
  const [resp, setResp] = useState({ summary: '', quote_amount: '', quote_currency: 'INR', valid_until: '' })

  const invalidate = () => { queryClient.invalidateQueries({ queryKey: ['cb-request', id] }); queryClient.invalidateQueries({ queryKey: ['cb-request-audit', id] }) }

  const { data: r, isLoading, error, refetch } = useQuery({ queryKey: ['cb-request', id], queryFn: () => cbService.getRequest(id) })
  const { data: staff } = useQuery({ queryKey: ['cb-staff'], queryFn: () => cbService.listStaff() })
  const { data: audit } = useQuery({ queryKey: ['cb-request-audit', id], queryFn: () => cbService.requestAudit(id), enabled: !!id })

  const mut = useMutation({
    mutationFn: (body: any) => cbService.updateRequest(id, body),
    onSuccess: () => { invalidate(); toast.success('Request updated'); setAssignee(''); setStatusTo(''); setCustomerNote(''); setResp({ summary: '', quote_amount: '', quote_currency: 'INR', valid_until: '' }) },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Update failed'),
  })
  const cancelMut = useMutation({
    mutationFn: () => apiClient.patch(`/cb-requests/${id}/cancel`, { reason: 'Cancelled by staff' }),
    onSuccess: () => { invalidate(); toast.success('Request cancelled') }, onError: () => toast.error('Failed'),
  })

  const downloadDoc = async (docId: string) => {
    try { const res = await apiClient.get(`/documents/${docId}/download`); const url = res.data?.data?.url; if (url) window.open(url, '_blank'); else toast.error('Download unavailable') } catch { toast.error('Failed to get link') }
  }

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Loader2 className="animate-spin" size={26} color="var(--text-muted)" /></div>
  if (error || !r) return <div style={{ ...card, textAlign: 'center', color: 'var(--accent-coral)' }}>Failed to load request. <button onClick={() => refetch()} style={{ color: 'var(--accent-purple)', background: 'none', border: 'none', cursor: 'pointer' }}>Retry</button></div>

  const terminal = ['rejected', 'cancelled', 'closed'].includes(r.status)
  const notesValue = internalNote ?? r.internal_notes ?? ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <button onClick={() => navigate('/cb-requests')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, padding: 0 }}><ArrowLeft size={15} /> CB Requests</button>

      {/* Header */}
      <div style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Inbox size={20} color="var(--accent-purple)" />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ margin: 0, color: 'var(--accent-purple)', fontSize: 18, fontWeight: 800 }}>{r.request_number}</h1>
              <Badge status={r.status} size="sm" />
            </div>
            <div style={muted}>Created {formatDate(r.created_at)} · Updated {formatDate(r.updated_at)}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)', gap: 20, alignItems: 'start' }}>
        {/* Left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Context */}
          <div style={{ ...card, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
            <Field label="Customer">{r.customer_id?.name || r.user_id?.name || '—'}</Field>
            <Field label="Contact">{r.user_id?.email || r.customer_id?.contact?.email || '—'}</Field>
            <Field label="Phone">{r.user_id?.phone || r.customer_id?.contact?.phone || '—'}</Field>
            <Field label="Certification Body">{r.certification_body_id?.name || '—'}</Field>
            <Field label="Product">{r.product_id?.name || r.product_category || '—'}</Field>
            <Field label="Certification">{r.cert_type || '—'}</Field>
            <Field label="Market">{r.market || '—'}</Field>
            <Field label="Application">
              {r.application_id ? <button onClick={() => navigate(`/applications/${r.application_id._id || r.application_id}`)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: 'var(--accent-purple)', cursor: 'pointer', fontSize: 13, padding: 0, fontWeight: 600 }}>{r.application_id.application_number || 'View'} <ExternalLink size={12} /></button> : <span style={muted}>—</span>}
            </Field>
          </div>

          {/* Customer message */}
          {r.message && (
            <div style={card}><h3 style={sectionTitle}><MessageSquare size={15} /> Customer message</h3><p style={{ color: 'var(--text-primary)', fontSize: 13, margin: 0 }}>{r.message}</p></div>
          )}

          {/* Documents */}
          <div style={card}>
            <h3 style={sectionTitle}><FileText size={15} /> Documents</h3>
            {(r.document_ids || []).length === 0 ? <p style={muted}>No documents attached.</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(r.document_ids || []).map((d: any) => (
                  <div key={d._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--bg-body)', borderRadius: 'var(--radius)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FileText size={14} color="var(--accent-purple)" /><span style={{ color: 'var(--text-primary)', fontSize: 13 }}>{d.name}</span><span style={muted}>{d.doc_type}</span></div>
                    <button onClick={() => downloadDoc(d._id)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: 'var(--accent-purple)', cursor: 'pointer', fontSize: 12 }}><Download size={13} /> Download</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CB response (customer-visible) */}
          {r.cb_response?.summary && (
            <div style={{ ...card, borderColor: 'var(--accent-green)' }}>
              <h3 style={sectionTitle}><Receipt size={15} /> CB response (customer-visible)</h3>
              <p style={{ color: 'var(--text-primary)', fontSize: 13, margin: '0 0 8px' }}>{r.cb_response.summary}</p>
              {r.cb_response.quote_amount != null && <div style={muted}>Quote: {r.cb_response.quote_currency || 'INR'} {r.cb_response.quote_amount}{r.cb_response.valid_until ? ` · valid until ${formatDate(r.cb_response.valid_until)}` : ''}</div>}
            </div>
          )}

          {/* Status history */}
          <div style={card}>
            <h3 style={sectionTitle}><Clock size={15} /> Status history</h3>
            {(r.status_history || []).length === 0 ? <p style={muted}>No status changes yet.</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {[...r.status_history].reverse().map((h: any, i: number) => (
                  <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: 14 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-purple)', flexShrink: 0, marginTop: 3 }} />
                    <div>
                      <div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600 }}>{prettyStatus(h.from)} → {prettyStatus(h.to)}</div>
                      <div style={muted}>{formatDate(h.at)}{h.by?.name ? ` · ${h.by.name}` : ''}{h.note ? ` · ${h.note}` : ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Audit */}
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
        </div>

        {/* Right — admin actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {!canEdit ? (
            <div style={card}><p style={muted}>You have read-only access to this request.</p></div>
          ) : (
            <>
              <div style={card}>
                <h3 style={sectionTitle}><UserPlus size={15} /> Assign</h3>
                <Select value={assignee || (r.assigned_to?._id ?? '')} onChange={e => setAssignee(e.target.value)} options={[{ value: '', label: 'Unassigned' }, ...(staff || []).map((u: any) => ({ value: u._id, label: `${u.name} (${u.role})` }))]} />
                <div style={{ marginTop: 10 }}><Button size="sm" variant="secondary" loading={mut.isPending} onClick={() => mut.mutate({ assigned_to: assignee || null })}>Save assignee</Button></div>
              </div>

              <div style={card}>
                <h3 style={sectionTitle}><GitBranch size={15} /> Change status</h3>
                {terminal ? <p style={muted}>This request is {prettyStatus(r.status)} (terminal).</p> : (
                  <>
                    <Select value={statusTo} onChange={e => setStatusTo(e.target.value)} options={[{ value: '', label: 'Select status…' }, ...CB_REQUEST_STATUSES.filter(s => s !== r.status).map(s => ({ value: s, label: prettyStatus(s) }))]} />
                    <div style={{ marginTop: 10 }}><Label>Customer-visible note (optional)</Label><Input value={customerNote} onChange={e => setCustomerNote(e.target.value)} placeholder="Shown to the customer" /></div>
                    <div style={{ marginTop: 10 }}><Button size="sm" disabled={!statusTo} loading={mut.isPending} onClick={() => { if (confirm(`Change status to "${prettyStatus(statusTo)}"? The customer will be notified.`)) mut.mutate({ status: statusTo, customer_note: customerNote || undefined }) }}>Update status</Button></div>
                  </>
                )}
              </div>

              {/* Internal note — visually distinct, staff-only */}
              <div style={{ ...card, borderColor: 'var(--accent-amber, #FFB347)' }}>
                <h3 style={sectionTitle}><Lock size={15} /> Internal note (staff only)</h3>
                <p style={{ ...muted, marginTop: 0 }}>Never shown to the customer.</p>
                <Textarea rows={4} value={notesValue} onChange={e => setInternalNote(e.target.value)} placeholder="Internal notes…" />
                <div style={{ marginTop: 10 }}><Button size="sm" variant="secondary" loading={mut.isPending} disabled={notesValue === (r.internal_notes ?? '')} onClick={() => mut.mutate({ internal_notes: notesValue })}>Save internal note</Button></div>
              </div>

              <div style={card}>
                <h3 style={sectionTitle}><Receipt size={15} /> Record CB response</h3>
                <div style={{ display: 'grid', gap: 10 }}>
                  <div><Label>Summary (customer-visible)</Label><Textarea rows={2} value={resp.summary} onChange={e => setResp({ ...resp, summary: e.target.value })} /></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                    <div><Label>Quote amount</Label><Input inputMode="decimal" value={resp.quote_amount} onChange={e => setResp({ ...resp, quote_amount: e.target.value })} /></div>
                    <div><Label>Currency</Label><Select value={resp.quote_currency} onChange={e => setResp({ ...resp, quote_currency: e.target.value })} options={['INR', 'USD', 'AED', 'EUR'].map(c => ({ value: c, label: c }))} /></div>
                  </div>
                  <div><Label>Quote valid until</Label><Input type="date" value={resp.valid_until} onChange={e => setResp({ ...resp, valid_until: e.target.value })} /></div>
                  <Button size="sm" loading={mut.isPending} disabled={!resp.summary.trim()} onClick={() => mut.mutate({ cb_response: { summary: resp.summary, quote_amount: resp.quote_amount ? Number(resp.quote_amount) : undefined, quote_currency: resp.quote_currency, valid_until: resp.valid_until || undefined }, status: r.status === 'submitted' || r.status === 'sent_to_cb' || r.status === 'acknowledged' ? 'quote_received' : undefined })}>Record response</Button>
                </div>
              </div>

              {!terminal && (
                <div style={card}>
                  <Button size="sm" variant="danger" loading={cancelMut.isPending} onClick={() => confirm('Cancel this request?') && cancelMut.mutate()}>Cancel request</Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
