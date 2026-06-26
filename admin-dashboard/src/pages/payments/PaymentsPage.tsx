import React, { useState, useEffect } from 'react'
import { CreditCard, Search, Download, IndianRupee } from 'lucide-react'
import Badge from '../../components/common/Badge'
import Avatar from '../../components/common/Avatar'
import Button from '../../components/common/Button'
import StatCard from '../../components/common/StatCard'
import { formatDate, formatCurrency } from '../../utils/formatters'
import { apiClient } from '../../services/apiClient'
import { toast } from '../../store/toastStore'

export default function PaymentsPage() {
  const [search, setSearch] = useState('')
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Export payments as CSV
  const handleExport = () => {
    const headers = ['Invoice', 'Client', 'Description', 'Amount', 'Status', 'Method', 'Date'];
    const rows = payments.map(p => [
      p.invoice_number || p._id,
      p.org_id?.name || p.user_id?.name || 'Unknown',
      p.description || '',
      (p.total_paise / 100).toFixed(2),
      p.status,
      p.method || '-',
      formatDate(p.created_at)
    ]);
    console.log('Export CSV triggered');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'payments_export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const response = await apiClient.get('/payments')
        setPayments(response.data.data || [])
      } catch (err) {
        console.error('Failed to fetch payments', err)
      } finally {
        setLoading(false)
      }
    }
    fetchPayments()
  }, [])

  const filtered = payments.filter(p => {
    const clientName = p.org_id?.name || p.user_id?.name || 'Unknown'
    const idMatches = p.invoice_number?.toLowerCase().includes(search.toLowerCase()) || p._id.toLowerCase().includes(search.toLowerCase())
    const clientMatches = clientName.toLowerCase().includes(search.toLowerCase())
    return idMatches || clientMatches
  })

  const totalPaid = payments.filter(p => p.status === 'paid' || p.status === 'captured').reduce((s, p) => s + (p.total_paise / 100), 0)
  const totalPending = payments.filter(p => p.status === 'pending').reduce((s, p) => s + (p.total_paise / 100), 0)
  const pendingCount = payments.filter(p => p.status === 'pending').length
  const failedCount = payments.filter(p => p.status === 'failed').length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div><h2 style={{ color: 'var(--text-primary)', fontSize: 20, fontWeight: 700, margin: 0 }}>Payments & Billing</h2><p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 0' }}>Invoices and transaction history</p></div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button icon={<Download size={14} />} variant="secondary" size="sm" onClick={handleExport}>Export</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard title="Total Collected" value={formatCurrency(totalPaid)} change="All time" changeType="up" icon={<IndianRupee size={16} />} gradient="var(--gradient-green)" />
        <StatCard title="Pending Amount" value={formatCurrency(totalPending)} change={`${pendingCount} invoices`} changeType="neutral" icon={<CreditCard size={16} />} gradient="var(--gradient-amber)" />
        <StatCard title="Failed Payments" value={`${failedCount}`} change="Need follow-up" changeType={failedCount > 0 ? "down" : "neutral"} icon={<IndianRupee size={16} />} gradient="var(--gradient-coral)" />
      </div>

      <div style={{ position: 'relative', marginBottom: 20, maxWidth: 360 }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoices…" style={{ width: '100%', padding: '9px 12px 9px 36px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
            {['Invoice', 'Client', 'Description', 'Amount', 'Status', 'Method', 'Date', ''].map(h => <th key={h} style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textAlign: 'left', padding: '12px 16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {loading ? (
               <tr><td colSpan={8} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading payments...</td></tr>
            ) : filtered.length === 0 ? (
               <tr><td colSpan={8} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No payments found.</td></tr>
            ) : (
              filtered.map(p => {
                const clientName = p.org_id?.name || p.user_id?.name || 'Unknown Client'
                return (
                  <tr key={p._id} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 16px', color: 'var(--accent-purple)', fontSize: 12, fontWeight: 600 }}>{p.invoice_number || p._id.substring(0, 8)}</td>
                    <td style={{ padding: '12px 16px' }}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar name={clientName} size={24} /><span style={{ color: 'var(--text-primary)', fontSize: 13 }}>{clientName}</span></div></td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: 12, maxWidth: 200 }}>{p.description}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontSize: 13, fontWeight: 700 }}>{formatCurrency(p.total_paise / 100, p.currency)}</td>
                    <td style={{ padding: '12px 16px' }}><Badge status={p.status === 'captured' ? 'paid' : p.status} size="sm" /></td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 12 }}>{p.method ?? '—'}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 12 }}>{formatDate(p.created_at)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {p.invoice_url ? (
                        <a href={p.invoice_url} target="_blank" rel="noopener noreferrer" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-purple)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                          <Download size={14} /> PDF
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>No invoice</span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
