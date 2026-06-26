import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  icon?: React.ReactNode
  loading?: boolean
}

export default function Button({ variant = 'primary', size = 'md', icon, loading, children, style, ...props }: ButtonProps) {
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    fontFamily: 'var(--font-family)', fontWeight: 600, cursor: 'pointer',
    border: 'none', borderRadius: 'var(--radius)', transition: 'var(--transition)',
    whiteSpace: 'nowrap', outline: 'none',
  }
  const sizes: Record<string, React.CSSProperties> = {
    sm: { padding: '6px 12px', fontSize: 12 },
    md: { padding: '9px 18px', fontSize: 14 },
    lg: { padding: '12px 24px', fontSize: 15 },
  }
  const variants: Record<string, React.CSSProperties> = {
    primary: { background: 'var(--gradient-purple)', color: '#fff', boxShadow: '0 4px 16px rgba(108,99,255,0.35)' },
    secondary: { background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border)' },
    ghost: { background: 'transparent', color: 'var(--text-secondary)' },
    danger: { background: 'rgba(255,107,107,0.15)', color: '#FF6B6B', border: '1px solid rgba(255,107,107,0.3)' },
    outline: { background: 'transparent', color: 'var(--accent-purple)', border: '1px solid var(--accent-purple)' },
  }
  return (
    <button {...props} style={{ ...base, ...sizes[size], ...variants[variant], opacity: props.disabled ? 0.5 : 1, ...style }}>
      {loading ? <span className="spinner-sm" /> : icon}
      {children}
    </button>
  )
}
