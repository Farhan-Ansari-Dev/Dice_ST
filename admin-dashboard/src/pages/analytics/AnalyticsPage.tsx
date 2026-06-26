import React from 'react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import StatCard from '../../components/common/StatCard'
import { IndianRupee, TrendingUp, Award, Users } from 'lucide-react'
import { formatCurrency } from '../../utils/formatters'


const tip = ({ active, payload, label }: any) => active && payload?.length ? (
  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
    <p style={{ color: 'var(--text-secondary)', fontSize: 12, margin: '0 0 4px' }}>{label}</p>
    {payload.map((p: any, i: number) => <p key={i} style={{ color: p.color, fontSize: 13, fontWeight: 600, margin: 0 }}>{p.name}: {p.value > 1000 ? formatCurrency(p.value) : p.value}</p>)}
  </div>
) : null
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../services/apiClient'

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics_overview'],
    queryFn: async () => {
      const res = await apiClient.get('/analytics/overview')
      return res.data.data
    }
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <StatCard title="Total Revenue" value={isLoading ? '...' : `₹${(data?.total_revenue || 0).toLocaleString()}`} change="Live from Stripe/Razorpay" changeType="up" icon={<IndianRupee size={16} />} gradient="var(--gradient-purple)" />
        <StatCard title="Total Certifications" value={isLoading ? '...' : data?.total_certifications || '0'} change={`${data?.active_certifications || 0} active, ${data?.expiring_soon || 0} expiring`} changeType="up" icon={<Award size={16} />} gradient="var(--gradient-cyan)" />
        <StatCard title="Pending Applications" value={isLoading ? '...' : data?.pending_applications || '0'} change="Currently tracking" changeType="up" icon={<TrendingUp size={16} />} gradient="var(--gradient-green)" />
        <StatCard title="Active Users" value={isLoading ? '...' : data?.active_users || '0'} change="Platform wide" changeType="up" icon={<Users size={16} />} gradient="var(--gradient-amber)" />
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
        <h3 style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 600, margin: '0 0 20px' }}>Revenue & Certifications Trend — 2025</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data?.monthly_trend || []} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="r2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6C63FF" stopOpacity={0.3} /><stop offset="95%" stopColor="#6C63FF" stopOpacity={0} /></linearGradient>
              <linearGradient id="c2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00C896" stopOpacity={0.25} /><stop offset="95%" stopColor="#00C896" stopOpacity={0} /></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="month" tick={{ fill: '#8B92A5', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left" tick={{ fill: '#8B92A5', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/100000).toFixed(1)}L`} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: '#8B92A5', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={tip} />
            <Area yAxisId="left" type="monotone" dataKey="revenue" name="Revenue" stroke="#6C63FF" fill="url(#r2)" strokeWidth={2} dot={false} />
            <Area yAxisId="right" type="monotone" dataKey="certificates" name="Certificates" stroke="#00C896" fill="url(#c2)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
          <h3 style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 600, margin: '0 0 20px' }}>Certifications by Country</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data?.country_data || []} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis type="number" tick={{ fill: '#8B92A5', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="country" type="category" tick={{ fill: '#8B92A5', fontSize: 12 }} axisLine={false} tickLine={false} width={50} />
              <Tooltip content={tip} />
              <Bar dataKey="certs" name="Certificates" radius={[0, 6, 6, 0]}>
                {data?.country_data?.map((e: any, i: number) => <Cell key={i} fill={e.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
          <h3 style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 600, margin: '0 0 20px' }}>Certification Type Mix</h3>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ flex: 1, height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data?.certification_mix || []} innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                    {data?.certification_mix?.map((e: any, i: number) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {data?.certification_mix?.map((p: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', minWidth: 120 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} /><span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{p.name}</span></div>
                  <span style={{ color: 'var(--text-primary)', fontSize: 12, fontWeight: 600 }}>{p.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
