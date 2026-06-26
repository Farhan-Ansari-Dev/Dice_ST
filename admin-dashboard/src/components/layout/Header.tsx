import React, { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Bell, Search, Menu, Sun, Moon } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useUIStore } from '../../store/uiStore'
import Avatar from '../common/Avatar'

const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Dashboard', clients: 'Clients', certifications: 'Certifications',
  applications: 'Applications', documents: 'Documents', insights: 'Insights',
  payments: 'Payments', shipments: 'Shipments', testing: 'Testing & Inspection',
  employees: 'Employees', 'ai-assistant': 'AI Assistant', analytics: 'Analytics', settings: 'Settings',
}

export default function Header() {
  const { user } = useAuthStore()
  const { toggleSidebar, theme, toggleTheme } = useUIStore()
  const location = useLocation()
  const page = location.pathname.split('/')[1] || 'dashboard'
  const title = PAGE_TITLES[page] ?? 'Dashboard'
  const [search, setSearch] = useState('')

  return (
    <header style={{
      height: 64, background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16,
      position: 'sticky', top: 0, zIndex: 50,
    }}>
      <button onClick={toggleSidebar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 6, display: 'flex', borderRadius: 8 }}>
        <Menu size={20} />
      </button>

      <h1 style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 700, margin: 0, flex: 'none' }}>{title}</h1>

      <div style={{ flex: 1, maxWidth: 400, position: 'relative' }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search anything…"
          style={{
            width: '100%', padding: '8px 12px 8px 36px', background: 'var(--bg-input)',
            border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)',
            fontSize: 13, outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{
            background: 'var(--bg-input)', border: '1px solid var(--border)', cursor: 'pointer',
            color: 'var(--text-secondary)', padding: '6px 10px', display: 'flex', alignItems: 'center',
            gap: 6, borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 500,
            transition: 'var(--transition)',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent-purple)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-purple)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)' }}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          <span style={{ fontSize: 12 }}>{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>

        <button style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 6, display: 'flex', borderRadius: 8 }}>
          <Bell size={20} />
          <span style={{
            position: 'absolute', top: 4, right: 4, width: 8, height: 8,
            borderRadius: '50%', background: 'var(--accent-coral)', border: '2px solid var(--bg-secondary)',
          }} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '4px 8px', borderRadius: 'var(--radius)', transition: 'var(--transition)' }}>
          {user && <Avatar name={user.name} size={32} />}
          {user && (
            <div>
              <div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600 }}>{user.name}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{user.role}</div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
