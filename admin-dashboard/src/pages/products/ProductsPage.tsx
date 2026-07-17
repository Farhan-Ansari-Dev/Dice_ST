import React, { useState } from 'react'
import { Search, Plus, Package, Trash2, RefreshCcw, Edit2, Filter } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Button from '../../components/common/Button'
import { apiClient } from '../../services/apiClient'

const EMPTY_PRODUCT = { name: '', brand: '', model_number: '', category: 'Electronics', hsn_code: '', description: '', is_imported: false }

const CATEGORIES = ['Electronics', 'Food', 'Wireless Device', 'Cosmetics', 'Toys', 'Textiles', 'Machinery', 'Medical Device', 'Other']

export default function ProductsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showDeleted, setShowDeleted] = useState(false)
  const [isModalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<any>(EMPTY_PRODUCT)

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', showDeleted],
    queryFn: async () => {
      const res = await apiClient.get(`/products?limit=100${showDeleted ? '&showDeleted=true' : ''}`)
      return res.data.data || []
    }
  })

  const closeModal = () => { setModalOpen(false); setEditingId(null); setFormData(EMPTY_PRODUCT) }

  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/products', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); closeModal() }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiClient.put(`/products/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); closeModal() }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/products/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] })
  })

  const restoreMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/products/${id}/restore`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] })
  })

  const openEdit = (p: any) => {
    setEditingId(p._id)
    setFormData({
      name: p.name || '', brand: p.brand || '', model_number: p.model_number || '',
      category: p.category || 'Electronics', hsn_code: p.hsn_code || '',
      description: p.description || '', is_imported: !!p.is_imported,
    })
    setModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingId) updateMutation.mutate({ id: editingId, data: formData })
    else createMutation.mutate(formData)
  }

  const filtered = (products || []).filter((p: any) =>
    (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.brand || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(search.toLowerCase())
  )

  const modalInput: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', outline: 'none' }
  const modalLabel: React.CSSProperties = { display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }

  return (
    <div>
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 'var(--radius-lg)', width: 480, maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border)' }}>
            <h3 style={{ margin: '0 0 16px', color: 'var(--text-primary)' }}>{editingId ? 'Edit Product' : 'Add Product'}</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={modalLabel}>Product Name</label>
                <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. LED Panel Light 40W" style={modalInput} />
              </div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={modalLabel}>Brand</label>
                  <input value={formData.brand} onChange={e => setFormData({ ...formData, brand: e.target.value })} placeholder="Brand" style={modalInput} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={modalLabel}>Model Number</label>
                  <input value={formData.model_number} onChange={e => setFormData({ ...formData, model_number: e.target.value })} placeholder="Model" style={modalInput} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={modalLabel}>Category</label>
                  <select required value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} style={modalInput}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={modalLabel}>HSN Code</label>
                  <input value={formData.hsn_code} onChange={e => setFormData({ ...formData, hsn_code: e.target.value })} placeholder="e.g. 9405" style={modalInput} />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={modalLabel}>Description</label>
                <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Optional product description" rows={3} style={{ ...modalInput, resize: 'vertical' }} />
              </div>
              <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
                <input id="is_imported" type="checkbox" checked={formData.is_imported} onChange={e => setFormData({ ...formData, is_imported: e.target.checked })} />
                <label htmlFor="is_imported" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Imported product</label>
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <Button type="button" variant="ghost" onClick={closeModal}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingId ? 'Save Changes' : 'Add Product'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ color: 'var(--text-primary)', fontSize: 20, fontWeight: 700, margin: 0 }}>Product Catalog</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 0' }}>{filtered.length} products — clients select these when creating applications</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" icon={<Filter size={14} />} size="sm" onClick={() => setShowDeleted(!showDeleted)}>
            {showDeleted ? 'Hide Deleted' : 'Show Deleted'}
          </Button>
          <Button icon={<Plus size={14} />} size="sm" onClick={() => { setEditingId(null); setFormData(EMPTY_PRODUCT); setModalOpen(true) }}>Add Product</Button>
        </div>
      </div>

      <div style={{ position: 'relative', marginBottom: 20, maxWidth: 360 }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products…"
          style={{ width: '100%', padding: '9px 12px 9px 36px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
              {['Product', 'Brand', 'Category', 'HSN', 'Imported', 'Actions'].map(h => (
                <th key={h} style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textAlign: 'left', padding: '12px 16px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading products...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No products yet. Add one to build the catalog.</td></tr>
            ) : filtered.map((p: any) => (
              <tr key={p._id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s', opacity: p.deleted_at ? 0.5 : 1 }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Package size={13} color="var(--accent-purple)" />
                    <span style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, textDecoration: p.deleted_at ? 'line-through' : 'none' }}>{p.name}</span>
                  </div>
                </td>
                <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: 12 }}>{p.brand || '—'}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ background: 'rgba(108,99,255,0.12)', color: 'var(--accent-purple)', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>{p.category}</span>
                </td>
                <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 12 }}>{p.hsn_code || '—'}</td>
                <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: 12 }}>{p.is_imported ? 'Yes' : 'No'}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button onClick={() => openEdit(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} title="Edit"><Edit2 size={14} /></button>
                    {p.deleted_at ? (
                      <button onClick={() => restoreMutation.mutate(p._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-green)' }} title="Restore"><RefreshCcw size={14} /></button>
                    ) : (
                      <button onClick={() => deleteMutation.mutate(p._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-coral)' }} title="Delete"><Trash2 size={14} /></button>
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
