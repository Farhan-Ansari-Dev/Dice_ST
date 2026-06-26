import React from 'react';
import { useToastStore } from '../../store/toastStore';

export default function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts);

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 24,
      right: 24,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }}>
      {toasts.map((toast) => (
        <div key={toast.id} style={{
          background: toast.type === 'error' ? 'var(--gradient-coral)' : toast.type === 'success' ? 'var(--gradient-green)' : 'var(--bg-card)',
          color: toast.type === 'info' ? 'var(--text-primary)' : '#fff',
          padding: '12px 20px',
          borderRadius: 'var(--radius)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          fontSize: 14,
          fontWeight: 500,
          border: toast.type === 'info' ? '1px solid var(--border)' : 'none',
          animation: 'slideIn 0.2s ease-out'
        }}>
          {toast.message}
        </div>
      ))}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
