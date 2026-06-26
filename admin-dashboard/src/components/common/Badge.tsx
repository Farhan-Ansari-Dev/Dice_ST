import React from 'react'
import { STATUS_COLORS, STATUS_LABELS } from '../../utils/constants'

interface BadgeProps {
  status: string
  size?: 'sm' | 'md'
}

export default function Badge({ status, size = 'md' }: BadgeProps) {
  const color = STATUS_COLORS[status] ?? '#8B92A5'
  const label = STATUS_LABELS[status] ?? status
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: size === 'sm' ? '2px 8px' : '4px 10px',
      borderRadius: 'var(--radius-full)',
      background: color + '18',
      border: `1px solid ${color}40`,
      color: color,
      fontSize: size === 'sm' ? 11 : 12,
      fontWeight: 600,
      letterSpacing: '0.02em',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
      {label}
    </span>
  )
}
