import React from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { useUIStore } from '../../store/uiStore'

export default function AppLayout() {
  const { sidebarCollapsed } = useUIStore()
  const sidebarW = sidebarCollapsed ? 68 : 260

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Sidebar />
      <div style={{ flex: 1, marginLeft: sidebarW, transition: 'margin 0.25s cubic-bezier(0.4,0,0.2,1)', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Header />
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          <React.Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}><span className="spinner-md" /></div>}>
            <Outlet />
          </React.Suspense>
        </main>
      </div>
    </div>
  )
}
