import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Building2, User as UserIcon, Briefcase, FileText, Award, FolderOpen, CreditCard, RefreshCcw, Clock, Users, Sparkles, StickyNote } from 'lucide-react'
import Avatar from '../../components/common/Avatar'
import Badge from '../../components/common/Badge'
import { formatDate } from '../../utils/formatters'
import { apiClient } from '../../services/apiClient'

// Human labels for audit actions surfaced in the customer timeline.
const ACTION_LABEL: Record<string, string> = {
  logged_in: 'Signed in',
  logged_out: 'Signed out',
  created: 'Created',
  updated: 'Updated profile',
  deleted: 'Deleted',
  document_uploaded: 'Uploaded a document',
  document_replaced: 'Replaced a document',
  status_changed: 'Application status changed',
  cert_issued: 'Certificate issued',
  payment_received: 'Payment received',
  onboarding_completed: 'Onboarding completed',
  testing_started: 'Testing started',
  inspection_scheduled: 'Inspection scheduled',
  renewal_created: 'Renewal created',
  assign: 'Assigned',
  assigned: 'Assigned',
  accept: 'CB choice accepted',
  override: 'CB choice overridden',
}

const HEALTH_COLOR: Record<string, string> = {
  excellent: '#22c55e', good: '#6C63FF', fair: '#FFB347', at_risk: '#ef4444',
}

const card: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20, marginBottom: 16 }
const sectionTitle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)', fontSize: 14, fontWeight: 700, margin: '0 0 14px' }
const rowStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 16, padding: '7px 0', borderBottom: '1px solid var(--border)' }

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div style={rowStyle}>
      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{label}</span>
      <span style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 500, textAlign: 'right' }}>{value ?? '—'}</span>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div style={{ background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 14px' }}>
      <div style={{ color: 'var(--text-primary)', fontSize: 20, fontWeight: 700 }}>{value}</div>
      <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>{label}</div>
    </div>
  )
}

const list = (v?: string[]) => (v && v.length ? v.join(', ') : '—')

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['client-overview', id],
    queryFn: async () => (await apiClient.get(`/users/${id}/overview`)).data.data,
    enabled: !!id,
  })

  if (isLoading) return <div style={{ padding: 24, color: 'var(--text-muted)' }}>Loading customer…</div>
  if (isError || !data) return <div style={{ padding: 24, color: 'var(--text-muted)' }}>Could not load this customer.</div>

  const c = data.customer
  const counts = data.counts || {}
  const addr = [c.address?.line1, c.address?.city, c.address?.state, c.address?.pincode].filter(Boolean).join(', ')
  const renewals = (data.recentCertifications || []).filter((x: any) => x.status === 'expiring_soon')

  return (
    <div>
      <button onClick={() => navigate('/clients')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: 16, fontSize: 13 }}>
        <ArrowLeft size={15} /> Back to Clients
      </button>

      {/* Overview header */}
      <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 16 }}>
        <Avatar name={c.name} size={56} />
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 20 }}>{c.name}</h2>
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{c.email}{c.companyName ? ` · ${c.companyName}` : ''}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
            <Badge status={c.isOnboardingComplete ? 'active' : 'pending'} size="sm" />
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Profile {c.profileCompletion ?? 0}% complete</span>
          </div>
        </div>
        {data.health && (
          <div style={{ textAlign: 'center', minWidth: 96 }}>
            <div style={{ fontSize: 30, fontWeight: 800, color: HEALTH_COLOR[data.health.band] || 'var(--text-primary)' }}>{data.health.score}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>Health · {String(data.health.band).replace('_', ' ')}</div>
          </div>
        )}
      </div>

      {/* Overview stats */}
      <div style={card}>
        <div style={sectionTitle}><Briefcase size={15} /> Overview</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12 }}>
          <Stat label="Applications" value={counts.applications ?? 0} />
          <Stat label="Open Applications" value={counts.pendingApplications ?? 0} />
          <Stat label="Certificates" value={counts.certifications ?? 0} />
          <Stat label="Documents" value={counts.documents ?? 0} />
          <Stat label="Payments" value={counts.payments ?? 0} />
          <Stat label="Renewals Due" value={counts.renewalsDue ?? 0} />
          <Stat label="Total Paid" value={`₹${((data.totalPaidPaise ?? 0) / 100).toLocaleString()}`} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {/* Profile */}
        <div style={card}>
          <div style={sectionTitle}><UserIcon size={15} /> Profile</div>
          <Row label="Phone" value={c.phone} />
          <Row label="Role" value={c.role} />
          <Row label="Country" value={c.country_code} />
          <Row label="Onboarding" value={c.onboardingCompletedAt ? `Complete (${formatDate(c.onboardingCompletedAt)})` : 'Pending'} />
        </div>

        {/* Company */}
        <div style={card}>
          <div style={sectionTitle}><Building2 size={15} /> Company</div>
          <Row label="Company Name" value={c.companyName} />
          <Row label="GST" value={c.gstNumber} />
          <Row label="CIN" value={c.cin} />
          <Row label="IEC" value={c.iec} />
          <Row label="Address" value={addr || '—'} />
        </div>

        {/* Business */}
        <div style={card}>
          <div style={sectionTitle}><Briefcase size={15} /> Business</div>
          <Row label="Business Role" value={c.businessRole} />
          <Row label="Company Size" value={c.companySize} />
          <Row label="Industries" value={list(c.industries)} />
          <Row label="Target Markets" value={list(c.targetMarkets)} />
          <Row label="Business Goals" value={list(c.businessGoals)} />
          <Row label="Interested Certifications" value={list(c.interestedCertifications)} />
        </div>

        {/* Assigned Manager */}
        <div style={card}>
          <div style={sectionTitle}><Users size={15} /> Assigned Manager</div>
          {(data.assignedManagers || []).length === 0
            ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No manager assigned yet.</div>
            : data.assignedManagers.map((m: any) => <Row key={m._id} label={m.name || m.email} value={m.role} />)}
        </div>
      </div>

      {/* Applications */}
      <div style={card}>
        <div style={sectionTitle}><FileText size={15} /> Applications ({counts.applications ?? 0})</div>
        {(data.recentApplications || []).length === 0
          ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No applications yet.</div>
          : data.recentApplications.map((a: any) => (
            <div key={a._id} style={rowStyle}>
              <span style={{ color: 'var(--text-primary)', fontSize: 13 }}>{a.application_number || a.cert_type} <span style={{ color: 'var(--text-muted)' }}>· {a.product_id?.name || '—'}</span></span>
              <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Badge status={a.status} size="sm" /><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{formatDate(a.created_at)}</span></span>
            </div>
          ))}
      </div>

      {/* Certificates + Renewals */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        <div style={card}>
          <div style={sectionTitle}><Award size={15} /> Certificates ({counts.certifications ?? 0})</div>
          {(data.recentCertifications || []).length === 0
            ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No certificates yet.</div>
            : data.recentCertifications.map((cert: any) => (
              <div key={cert._id} style={rowStyle}>
                <span style={{ color: 'var(--text-primary)', fontSize: 13 }}>{cert.cert_number || cert.cert_type}</span>
                <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Badge status={cert.status} size="sm" /><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>exp {formatDate(cert.expiry_date)}</span></span>
              </div>
            ))}
        </div>
        <div style={card}>
          <div style={sectionTitle}><RefreshCcw size={15} /> Renewals Due ({counts.renewalsDue ?? 0})</div>
          {renewals.length === 0
            ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Nothing due for renewal.</div>
            : renewals.map((cert: any) => <Row key={cert._id} label={cert.cert_number || cert.cert_type} value={`exp ${formatDate(cert.expiry_date)}`} />)}
        </div>
      </div>

      {/* Documents + Payments */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        <div style={card}>
          <div style={sectionTitle}><FolderOpen size={15} /> Documents ({counts.documents ?? 0})</div>
          {(data.documents || []).length === 0
            ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No documents uploaded.</div>
            : data.documents.map((d: any) => <Row key={d._id} label={d.original_name || d.doc_type || 'Document'} value={formatDate(d.created_at)} />)}
        </div>
        <div style={card}>
          <div style={sectionTitle}><CreditCard size={15} /> Payments ({counts.payments ?? 0})</div>
          {(data.recentPayments || []).length === 0
            ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No payments yet.</div>
            : data.recentPayments.map((p: any) => (
              <div key={p._id} style={rowStyle}>
                <span style={{ color: 'var(--text-primary)', fontSize: 13 }}>₹{((p.total_paise ?? 0) / 100).toLocaleString()} <span style={{ color: 'var(--text-muted)' }}>· {p.purpose}</span></span>
                <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Badge status={p.status} size="sm" /><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{formatDate(p.created_at)}</span></span>
              </div>
            ))}
        </div>
      </div>

      {/* AI */}
      <div style={card}>
        <div style={sectionTitle}><Sparkles size={15} /> AI</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          AI recommendations are generated on demand from this customer's profile (industries, target markets, certifications of interest) and certification portfolio. Interested certifications: <strong>{list(c.interestedCertifications)}</strong>.
        </div>
      </div>

      {/* Timeline */}
      <div style={card}>
        <div style={sectionTitle}><Clock size={15} /> Timeline / Recent Activity</div>
        {(data.timeline || []).length === 0
          ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No recorded activity.</div>
          : data.timeline.map((t: any) => (
            <div key={t.id} style={rowStyle}>
              <span style={{ color: 'var(--text-primary)', fontSize: 13 }}>
                {ACTION_LABEL[t.action] || t.action || 'Activity'}
                <span style={{ color: 'var(--text-muted)' }}> · {t.resourceType}</span>
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{formatDate(t.ts)}</span>
            </div>
          ))}
      </div>

      {/* Notes */}
      <div style={card}>
        <div style={sectionTitle}><StickyNote size={15} /> Notes</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No notes recorded. (Customer notes persistence is not yet implemented.)</div>
      </div>
    </div>
  )
}
