import React from 'react'
import { getInitials } from '../../utils/formatters'

const COLORS = ['#6C63FF','#00D4FF','#FF6B6B','#00C896','#FFB347','#FF6B9D','#9B59B6']

interface AvatarProps { name: string; src?: string; size?: number }

export default function Avatar({ name, src, size = 40 }: AvatarProps) {
  const safeName = name || 'User'
  const color = COLORS[safeName.charCodeAt(0) % COLORS.length]
  if (src) return <img src={src} alt={safeName} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: color + '15', color: color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 600, flexShrink: 0
    }}>
      {safeName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
    </div>
  )
}
