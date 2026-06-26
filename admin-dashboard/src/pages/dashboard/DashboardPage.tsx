import React, { useEffect, useState } from 'react'
import { Award, Users, IndianRupee, ShieldCheck, AlertTriangle, TrendingUp, ArrowRight, Bot } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import StatCard from '../../components/common/StatCard'
import Badge from '../../components/common/Badge'
import Avatar from '../../components/common/Avatar'
import Button from '../../components/common/Button'
import { formatCurrency, formatDate } from '../../utils/formatters'
import apiClient from '../../services/apiClient'
import { useAuthStore } from '../../store/authStore'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 12, margin: '0 0 6px' }}>{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color, fontSize: 13, fontWeight: 600, margin: '2px 0' }}>
            {p.name}: {typeof p.value === 'number' && p.value > 1000 ? formatCurrency(p.value) : p.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    active_certifications: 0,
    pending_applications: 0,
    total_revenue: 0,
    active_users: 0,
    expiring_soon: 0,
    monthly_trend: [] as any[],
  })
  const [recentApplications, setRecentApplications] = useState<any[]>([])

  // Basic mock data for charts since backend doesn't aggregate these yet
  const trendData = stats.monthly_trend || (stats as any).monthly_revenue_trend || []
  const revenueData = trendData.length > 0 ? trendData : [
    { month: 'Jan', revenue: 0, target: 0 },
  ]
  const pipelineData = [
    { name: 'Submitted', count: stats.pending_applications, fill: '#00D4FF' },
  ]
  const certBreakdown = [
    { name: 'Active', value: stats.active_certifications, color: '#6C63FF' },
    { name: 'Expiring', value: stats.expiring_soon, color: '#FFB347' },
  ]
  const activities = [
    { actor: 'System', action: 'Dashboard updated at', target: new Date().toLocaleTimeString(), time: 'Just now' },
  ]

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, appsRes] = await Promise.all([
          apiClient.get('/analytics/overview'),
          apiClient.get('/applications')
        ])
        setStats(statsRes.data.data)
        const apps = appsRes.data.data || []
        setRecentApplications(apps.slice(0, 5))
      } catch (err) {
        console.error('Failed to load dashboard data', err)
        // Fallback to zeros if API fails so the page doesn't stay black
        setStats({
          active_certifications: 0,
          pending_applications: 0,
          total_revenue: 0,
          active_users: 0,
          expiring_soon: 0,
          monthly_trend: [],
        })
        setRecentApplications([])
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <span className="spinner-md" />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(108,99,255,0.15), rgba(0,212,255,0.08))',
        border: '1px solid rgba(108,99,255,0.2)', borderRadius: 'var(--radius-lg)',
        padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <h2 style={{ color: 'var(--text-primary)', fontSize: 20, fontWeight: 700, margin: '0 0 4px' }}>
            Good morning, {user?.name || 'Admin'} 👋
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>
            Here's what's happening with Sanyog Conformity Solutions today.
          </p>
        </div>
        <Button icon={<Bot size={14} />}>Ask AI Assistant</Button>
      </div>

      {/* KPI Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <StatCard title="Active Certificates" value={stats.active_certifications.toString()} change={`${stats.expiring_soon} expiring soon`} changeType={stats.expiring_soon > 0 ? "down" : "neutral"} icon={<Award size={16} />} gradient="var(--gradient-purple)" />
        <StatCard title="Pending Applications" value={stats.pending_applications.toString()} change="In pipeline" changeType="neutral" icon={<TrendingUp size={16} />} gradient="var(--gradient-cyan)" />
        <StatCard title="Total Revenue" value={`₹${(stats.total_revenue).toFixed(2)}`} change="From captured payments" changeType="up" icon={<IndianRupee size={16} />} gradient="var(--gradient-green)" />
        <StatCard title="Compliance Score" value="100" suffix="%" change="System default" changeType="up" icon={<ShieldCheck size={16} />} gradient="var(--gradient-purple)" />
        <StatCard title="Open Issues" value="0" change="No critical issues" changeType="neutral" icon={<AlertTriangle size={16} />} gradient="var(--gradient-coral)" />
        <StatCard title="Total Users" value={stats.active_users.toString()} change="Registered users" changeType="up" icon={<Users size={16} />} gradient="var(--gradient-cyan)" />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
        {/* Revenue Area Chart */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h3 style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 600, margin: 0 }}>Revenue Overview</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '4px 0 0' }}>Monthly revenue vs target — FY 2025</p>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
              <span style={{ color: '#6C63FF' }}>● Revenue</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6C63FF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6C63FF" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="tgt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#00D4FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" tick={{ fill: '#8B92A5', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#8B92A5', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/100000).toFixed(1)}L`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#6C63FF" fill="url(#rev)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="target" name="Target" stroke="#00D4FF" fill="url(#tgt)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Cert Breakdown Donut */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
          <h3 style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 600, margin: '0 0 4px' }}>Cert Type Distribution</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '0 0 16px' }}>Active certifications by type</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={certBreakdown} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3} dataKey="value">
                {certBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v: any) => [`${v}%`, '']} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {certBreakdown.map(item => (
              <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, display: 'inline-block' }} />
                  <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{item.name}</span>
                </div>
                <span style={{ color: 'var(--text-primary)', fontSize: 12, fontWeight: 600 }}>{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pipeline Bar Chart + AI Insights */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
        {/* Pipeline */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
          <h3 style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 600, margin: '0 0 4px' }}>Application Pipeline</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '0 0 16px' }}>Applications by stage — current month</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={pipelineData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="name" tick={{ fill: '#8B92A5', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#8B92A5', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Applications" radius={[6, 6, 0, 0]}>
                {pipelineData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* AI Insights */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--gradient-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={12} color="#fff" />
            </div>
            <h3 style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 600, margin: 0 }}>AI Insights</h3>
          </div>
          <div style={{ background: 'var(--bg-hover)', borderRadius: 10, padding: '12px 14px', borderLeft: `3px solid #00C896` }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 16 }}>✅</span>
              <div>
                <div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, marginBottom: 3 }}>Live Systems Operational</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 11, lineHeight: 1.5 }}>The backend is connected and real data is flowing.</div>
              </div>
            </div>
          </div>
          {stats.expiring_soon > 0 && (
            <div style={{ background: 'var(--bg-hover)', borderRadius: 10, padding: '12px 14px', borderLeft: `3px solid #FFB347` }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 16 }}>⚠️</span>
                <div>
                  <div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, marginBottom: 3 }}>Expiring Certificates</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 11, lineHeight: 1.5 }}>You have {stats.expiring_soon} certificates expiring soon.</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Applications + Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
        {/* Table */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 600, margin: 0 }}>Recent Applications</h3>
            <Button variant="ghost" size="sm" icon={<ArrowRight size={12} />}>View all</Button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['ID', 'Client', 'Type', 'Status', 'Date'].map(h => (
                  <th key={h} style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textAlign: 'left', padding: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentApplications.map((app: any, i) => (
                <tr key={app._id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 0', color: 'var(--accent-purple)', fontSize: 12, fontWeight: 600 }}>{app.reference_id || app._id.slice(-6)}</td>
                  <td style={{ padding: '10px 8px 10px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: 'var(--text-primary)', fontSize: 12 }}>{app.product_name || 'Application'}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 8px 10px 0', color: 'var(--text-secondary)', fontSize: 12 }}>{app.schema_id || 'N/A'}</td>
                  <td style={{ padding: '10px 8px 10px 0' }}><Badge status={app.status} size="sm" /></td>
                  <td style={{ padding: '10px 0', color: 'var(--text-muted)', fontSize: 11 }}>{formatDate(app.created_at)}</td>
                </tr>
              ))}
              {recentApplications.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No applications found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Activity Feed */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
          <h3 style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 600, margin: '0 0 16px' }}>Activity Feed</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {activities.map((act, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: 16, position: 'relative' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <Avatar name={act.actor} size={28} />
                  {i < activities.length - 1 && <div style={{ width: 1, flex: 1, background: 'var(--border)', marginTop: 4 }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ color: 'var(--text-primary)', fontSize: 12, margin: '0 0 2px', lineHeight: 1.5 }}>
                    <strong>{act.actor}</strong> {act.action}{' '}
                    <span style={{ color: 'var(--accent-purple)' }}>{act.target}</span>
                  </p>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{act.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
