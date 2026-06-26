import React from 'react'

interface StatCardProps {
  title: string
  value: string | number
  change?: string
  changeType?: 'up' | 'down' | 'neutral'
  icon: React.ReactNode
  gradient?: string
  suffix?: string
}

export default function StatCard({ title, value, change, changeType = 'up', icon, gradient, suffix }: StatCardProps) {
  const changeColor = changeType === 'up' ? '#00C896' : changeType === 'down' ? '#FF6B6B' : '#8B92A5'
  return (
    <div className="glass-card hover-lift hover-glow animate-fadeInUp" style={{
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      position: 'relative',
      overflow: 'hidden',
      transition: 'var(--transition)',
      cursor: 'default',
    }}
    >
      {gradient && (
        <div style={{
          position: 'absolute', top: 0, right: 0, width: 140, height: 140,
          background: gradient, borderRadius: '50%',
          transform: 'translate(30%, -30%)', opacity: 0.15,
          pointerEvents: 'none',
          filter: 'blur(20px)',
        }} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase' }}>{title}</span>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: gradient ?? 'var(--bg-hover)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 18,
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        }}>
          {icon}
        </div>
      </div>
      <div style={{ zIndex: 1 }}>
        <div style={{ color: 'var(--text-primary)', fontSize: 32, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.02em' }}>
          {value}{suffix && <span style={{ fontSize: 16, fontWeight: 600, marginLeft: 4, color: 'var(--text-secondary)' }}>{suffix}</span>}
        </div>
        {change && (
          <div style={{ marginTop: 8, fontSize: 13, color: changeColor, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ background: `${changeColor}20`, padding: '2px 6px', borderRadius: 4 }}>
              {changeType === 'up' ? '↑' : changeType === 'down' ? '↓' : '→'} {change}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
