import React from 'react'
import { FlaskConical, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import Badge from '../../components/common/Badge'
import { formatDate } from '../../utils/formatters'
import apiClient from '../../services/apiClient'

export default function TestingPage() {
  const { data: tests = [], isLoading } = useQuery({
    queryKey: ['testing'],
    queryFn: async () => {
      const res = await apiClient.get('/testing')
      return res.data.data
    }
  })

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ color: 'var(--text-primary)', fontSize: 20, fontWeight: 700, margin: 0 }}>Testing & Inspection</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 0' }}>Lab test management and results tracking</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {isLoading ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>Loading tests...</p>
        ) : tests.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <FlaskConical size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
            <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>No tests found</div>
          </div>
        ) : tests.map((t: any) => (
          <div key={t._id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(0,212,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><FlaskConical size={18} color="var(--accent-cyan)" /></div>
                <div>
                  <div style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 700 }}>{t.product_name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t.sample_id} · {t.lab_name}</div>
                </div>
              </div>
              <Badge status={t.status} size="sm" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Progress</span>
                <span style={{ color: 'var(--text-primary)', fontSize: 12, fontWeight: 700 }}>{t.status === 'completed' ? 100 : (t.status === 'in_progress' ? 50 : 10)}%</span>
              </div>
              <div style={{ height: 6, background: 'var(--bg-hover)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${t.status === 'completed' ? 100 : (t.status === 'in_progress' ? 50 : 10)}%`, background: 'var(--gradient-cyan)', borderRadius: 3, transition: 'width 0.5s ease' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 20 }}>
              <div><span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Client: </span><span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{t.client_id?.name || 'N/A'}</span></div>
              <div><span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Expected: </span><span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{t.expected_completion ? formatDate(t.expected_completion) : 'TBD'}</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
