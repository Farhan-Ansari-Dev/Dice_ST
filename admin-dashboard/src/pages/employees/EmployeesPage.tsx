import React, { useState } from 'react'
import { Plus, Mail, Phone, Loader2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Avatar from '../../components/common/Avatar'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import { toast } from '../../store/toastStore'
import apiClient from '../../services/apiClient'

const ROLE_COLOR: Record<string, string> = { 
  'admin': '#6C63FF', 
  'consultant': '#00D4FF', 
  'cb': '#00C896', 
  'lab': '#FFB347', 
  'ib': '#FF6B9D',
  'viewer': '#8B92A5',
  'client': '#A178DF'
}

export default function EmployeesPage() {
  const queryClient = useQueryClient()
  const [isModalOpen, setModalOpen] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', role: 'consultant' })

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin_users'],
    queryFn: async () => {
      const res = await apiClient.get('/users')
      return res.data.data
    }
  })

  const createMutation = useMutation({
    mutationFn: (newUser: any) => apiClient.post('/users', newUser),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_users'] })
      setModalOpen(false)
      setFormData({ name: '', email: '', phone: '', role: 'consultant' })
      toast.success('User added successfully!')
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to add user')
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(formData)
  }

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}><Loader2 className="animate-spin" size={24} color="var(--text-muted)" /></div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div><h2 style={{ color: 'var(--text-primary)', fontSize: 20, fontWeight: 700, margin: 0 }}>Portal Access</h2><p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 0' }}>{(users || []).length} registered users</p></div>
        <Button icon={<Plus size={14} />} size="sm" onClick={() => setModalOpen(true)}>Add User / Partner</Button>
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 'var(--radius-lg)', width: 400, border: '1px solid var(--border)' }}>
            <h3 style={{ margin: '0 0 16px', color: 'var(--text-primary)' }}>Give Portal Access</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>Invite an employee, Certification Body (CB), Lab, or Inspection Body (IB).</p>
            
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Full Name</label>
                <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', outline: 'none' }} placeholder="e.g. John Doe" />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Email</label>
                <input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', outline: 'none' }} placeholder="john@example.com" />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Phone (Optional)</label>
                <input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', outline: 'none' }} placeholder="+91 9876543210" />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Role / Access Type</label>
                <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', outline: 'none' }}>
                  <option value="admin">Admin</option>
                  <option value="employee">Employee</option>
                  <option value="consultant">Consultant</option>
                  <option value="cb">Certification Body (CB)</option>
                  <option value="lab">Testing Lab</option>
                  <option value="ib">Inspection Body (IB)</option>
                  <option value="viewer">Read-Only Viewer</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'Sending...' : 'Give Access'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {(users || []).map((emp: any) => (
          <div key={emp._id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', transition: 'var(--transition)', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-light)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <Avatar name={emp.name} size={48} />
              <div>
                <div style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 700 }}>{emp.name}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 12, textTransform: 'capitalize' }}>{emp.role}</div>
                <span style={{ display: 'inline-block', marginTop: 4, background: (ROLE_COLOR[emp.role] ?? '#6C63FF') + '18', color: ROLE_COLOR[emp.role] ?? '#6C63FF', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>{emp.role}</span>
              </div>
              <div style={{ marginLeft: 'auto' }}><Badge status={emp.deleted_at ? 'inactive' : 'active'} size="sm" /></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Mail size={12} color="var(--text-muted)" /><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{emp.email}</span></div>
              {emp.phone && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Phone size={12} color="var(--text-muted)" /><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{emp.phone}</span></div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
