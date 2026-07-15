import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Award, ClipboardList, FileText, TrendingUp,
  CreditCard, Truck, FlaskConical, Briefcase, Bot, BarChart3, Settings,
  ChevronLeft, ChevronRight, LogOut, Shield, Sliders,
  Globe2, Building2, CalendarClock,
} from 'lucide-react'
import { useUIStore } from '../../store/uiStore'
import { useAuthStore } from '../../store/authStore'
import Avatar from '../common/Avatar'
import logo from '../../assets/logo.png'

const NAV = [
  { to: '/dashboard',                    icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/clients',                      icon: Users,           label: 'Clients' },
  { to: '/certifications',               icon: Award,           label: 'Certifications' },
  { to: '/applications',                 icon: ClipboardList,   label: 'Applications' },
  { to: '/documents',                    icon: FileText,        label: 'Documents' },
  { to: '/inspections',                  icon: Shield,          label: 'Inspections' },
  { to: '/shipments',                    icon: Truck,           label: 'Shipments' },
  { to: '/testing',                      icon: FlaskConical,    label: 'Testing' },
  { to: '/market-access/countries',      icon: Globe2,          label: 'Countries' },
  { to: '/market-access/opportunities',  icon: Building2,       label: 'Opportunities' },
  { to: '/consultants/meetings',         icon: CalendarClock,   label: 'Meetings' },
  { to: '/insights',                     icon: TrendingUp,      label: 'Insights' },
  { to: '/payments',                     icon: CreditCard,      label: 'Payments' },
  { to: '/employees',                    icon: Briefcase,       label: 'Employees' },
  { to: '/ai-assistant',                 icon: Bot,             label: 'AI Assistant' },
  { to: '/analytics',                    icon: BarChart3,       label: 'Analytics' },
  { to: '/remote-config',                icon: Sliders,         label: 'Remote Config' },
  { to: '/settings',                     icon: Settings,        label: 'Settings' },
]

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const w = sidebarCollapsed ? 68 : 260

  return (
    <aside className="glass" style={{
      width: w, minWidth: w, height: '100vh',
      borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column',
      transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)', overflow: 'hidden',
      position: 'fixed', left: 0, top: 0, zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ padding: sidebarCollapsed ? '20px 16px' : '20px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', height: 80, flexShrink: 0 }}>
        {!sidebarCollapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
            <img src={logo} alt="Sanyog Conformity Solutions" style={{ height: 48, width: 'auto', objectFit: 'contain' }} />
          </div>
        )}
        {sidebarCollapsed && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
            <img src={logo} alt="Sanyog" style={{ height: 32, maxWidth: 44, objectFit: 'contain' }} />
          </div>
        )}
        {!sidebarCollapsed && (
          <button onClick={toggleSidebar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 6, display: 'flex' }}>
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 8px' }}>
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 12,
            padding: sidebarCollapsed ? '10px 0' : '10px 12px',
            justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
            borderRadius: 'var(--radius)', marginBottom: 2,
            textDecoration: 'none', transition: 'var(--transition)',
            background: isActive ? 'rgba(108,99,255,0.12)' : 'transparent',
            color: isActive ? 'var(--accent-purple)' : 'var(--text-secondary)',
            borderLeft: isActive && !sidebarCollapsed ? '2px solid var(--accent-purple)' : '2px solid transparent',
          })}>
            <Icon size={18} style={{ flexShrink: 0 }} />
            {!sidebarCollapsed && <span style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Expand button when collapsed */}
      {sidebarCollapsed && (
        <button onClick={toggleSidebar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '12px 0', display: 'flex', justifyContent: 'center', borderTop: '1px solid var(--border)' }}>
          <ChevronRight size={16} />
        </button>
      )}

      {/* User */}
      <div style={{ padding: sidebarCollapsed ? '12px 8px' : '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        {user && <Avatar name={user.name} size={32} />}
        {!sidebarCollapsed && user && (
          <>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.role}</div>
            </div>
            <button onClick={() => { logout(); navigate('/login') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex' }}>
              <LogOut size={15} />
            </button>
          </>
        )}
      </div>
    </aside>
  )
}
