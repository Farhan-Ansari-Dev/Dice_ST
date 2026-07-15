import React, { useState } from 'react'
import { Search, Plus, Filter, MoreHorizontal, Award, Trash2, RefreshCcw, Edit2, Download } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Avatar from '../../components/common/Avatar'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import { formatDate } from '../../utils/formatters'
import { apiClient } from '../../services/apiClient'

const STATUS_MAP: Record<string, string> = { active: 'active', pending: 'pending', suspended: 'rejected' }

export default function ClientsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showDeleted, setShowDeleted] = useState(true)
  const [isModalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' })

  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients', showDeleted],
    queryFn: async () => {
      const res = await apiClient.get(`/users?role=client${showDeleted ? '&showDeleted=true' : ''}`)
      return res.data.data || []
    }
  })

  const closeModal = () => {
    setModalOpen(false)
    setEditingId(null)
    setFormData({ name: '', email: '', phone: '' })
  }

  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/users', { ...data, role: 'client' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['clients'] }); closeModal() }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiClient.put(`/users/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['clients'] }); closeModal() }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/users/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] })
  })

  const restoreMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/users/${id}/restore`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] })
  })

  const openEdit = (client: any) => {
    setEditingId(client._id)
    setFormData({ name: client.name || '', email: client.email || '', phone: client.phone || '' })
    setModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const filtered = (clients || []).filter((c: any) =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  )

  const handleExportCSV = () => {
    if (!filtered || filtered.length === 0) return;
    const headers = ['Name', 'Email', 'Company', 'Status', 'Updated At'];
    const rows = filtered.map((c: any) => [
      `"${c.name || ''}"`,
      `"${c.email || ''}"`,
      `"${c.org_id?.name || ''}"`,
      `"${c.deleted_at ? 'Suspended' : 'Active'}"`,
      `"${c.updated_at || ''}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map((r: string[]) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `clients_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const modalInput: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', outline: 'none' }

  return (
    <div>
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 'var(--radius-lg)', width: 400, border: '1px solid var(--border)' }}>
            <h3 style={{ margin: '0 0 16px', color: 'var(--text-primary)' }}>{editingId ? 'Edit Client' : 'Add Client'}</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Full Name</label>
                <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Acme Industries" style={modalInput} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Email</label>
                <input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="client@example.com" style={modalInput} />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Phone (Optional)</label>
                <input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="+91 9876543210" style={modalInput} />
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <Button type="button" variant="ghost" onClick={closeModal}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingId ? 'Save Changes' : 'Add Client'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ color: 'var(--text-primary)', fontSize: 20, fontWeight: 700, margin: 0 }}>Clients</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 0' }}>{filtered.length} total clients</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" icon={<Download size={14} />} size="sm" onClick={handleExportCSV}>
            Export CSV
          </Button>
          <Button variant="secondary" icon={<Filter size={14} />} size="sm" onClick={() => setShowDeleted(!showDeleted)}>
            {showDeleted ? 'Hide Deleted' : 'Show Deleted'}
          </Button>
          <Button icon={<Plus size={14} />} size="sm" onClick={() => { setEditingId(null); setFormData({ name: '', email: '', phone: '' }); setModalOpen(true) }}>Add Client</Button>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 20, maxWidth: 360 }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients…"
          style={{ width: '100%', padding: '9px 12px 9px 36px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
              {['Client', 'Company', 'Status', 'Certificates', 'Open Apps', 'Last Activity', 'Actions'].map(h => (
                <th key={h} style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textAlign: 'left', padding: '12px 16px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
               <tr><td colSpan={7} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading clients...</td></tr>
            ) : filtered.length === 0 ? (
               <tr><td colSpan={7} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No clients found.</td></tr>
            ) : filtered.map((client: any) => (
              <tr key={client._id} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.15s', opacity: client.deleted_at ? 0.5 : 1 }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar name={client.name} size={34} />
                    <div>
                      <div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, textDecoration: client.deleted_at ? 'line-through' : 'none' }}>{client.name}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{client.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontSize: 13 }}>{client.org_id?.name || '—'}</td>
                <td style={{ padding: '14px 16px' }}><Badge status={client.deleted_at ? 'suspended' : 'active'} size="sm" /></td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Award size={13} color="var(--accent-purple)" />
                    <span style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600 }}>0</span>
                  </div>
                </td>
                <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: 13, fontWeight: 400 }}>0</td>
                <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: 12 }}>{formatDate(client.updated_at)}</td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button onClick={() => openEdit(client)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} title="Edit">
                      <Edit2 size={14} />
                    </button>
                    {client.deleted_at ? (
                      <button onClick={() => restoreMutation.mutate(client._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-green)' }} title="Restore">
                        <RefreshCcw size={14} />
                      </button>
                    ) : (
                      <button onClick={() => deleteMutation.mutate(client._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-coral)' }} title="Delete">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
