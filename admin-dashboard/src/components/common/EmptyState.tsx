import React from 'react'

interface EmptyStateProps { icon?: string; title: string; subtitle?: string; action?: React.ReactNode }

export default function EmptyState({ icon = '📭', title, subtitle, action }: EmptyStateProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: 12 }}>
      <div style={{ fontSize: 48 }}>{icon}</div>
      <h3 style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 600, margin: 0 }}>{title}</h3>
      {subtitle && <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0, textAlign: 'center', maxWidth: 300 }}>{subtitle}</p>}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  )
}
