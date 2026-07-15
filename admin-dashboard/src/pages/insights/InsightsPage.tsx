import React, { useState } from 'react'
import { ExternalLink, RefreshCw, Plus, Edit2, Trash2, Pin, PinOff, Eye, EyeOff } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Button from '../../components/common/Button'
import { formatRelative } from '../../utils/formatters'
import { INSIGHT_CATEGORIES } from '../../utils/constants'
import { apiClient } from '../../services/apiClient'
import { toast } from '../../store/toastStore'

const CATEGORY_COLOR: Record<string, string> = {
  bis_update: '#6C63FF', customs: '#FFB347', export_import: '#00D4FF', certification: '#00C896', government: '#FF6B9D',
}

const EMPTY_FORM = {
  title: '', summary: '', content: '', category: 'bis_update', country: 'India',
  source: 'Sanyog Conformity', link: '', imageUrl: '', author: '',
  tags: '', relevanceScore: 80, published: true, featured: false,
  targetCountries: '', certifications: '',
}

const csv = (v: any): string[] => typeof v === 'string' ? v.split(',').map((t: string) => t.trim()).filter(Boolean) : (Array.isArray(v) ? v : [])

export default function InsightsPage() {
  const queryClient = useQueryClient()
  const [activeCategory, setActiveCategory] = useState('all')
  const [isModalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<any>(EMPTY_FORM)

  // includeUnpublished=true → admins manage drafts here; mobile app (same endpoint,
  // same collection) omits the flag and only ever receives published insights.
  const { data: insights = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['insights', activeCategory],
    queryFn: async () => {
      const params = new URLSearchParams({ includeUnpublished: 'true', limit: '50' })
      if (activeCategory !== 'all') params.set('category', activeCategory)
      const res = await apiClient.get(`/insights?${params}`)
      return res.data.data || []
    }
  })

  const closeModal = () => { setModalOpen(false); setEditingId(null); setFormData(EMPTY_FORM) }

  const toPayload = (f: any) => ({
    ...f,
    tags: csv(f.tags),
    targetCountries: csv(f.targetCountries),
    certifications: csv(f.certifications),
    relevanceScore: Number(f.relevanceScore) || 0,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['insights'] })

  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/insights', toPayload(data)),
    onSuccess: () => { invalidate(); closeModal(); toast.success('Insight published') },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to publish insight')
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiClient.put(`/insights/${id}`, toPayload(data)),
    onSuccess: () => { invalidate(); closeModal(); toast.success('Insight updated') },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update insight')
  })

  // Publish/unpublish and pin/unpin are partial updates — no form round-trip needed
  const patchMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: any }) => apiClient.put(`/insights/${id}`, patch),
    onSuccess: () => invalidate(),
    onError: (err: any) => toast.error(err.response?.data?.message || 'Update failed')
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/insights/${id}`),
    onSuccess: () => { invalidate(); toast.success('Insight deleted') },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to delete insight')
  })

  const openEdit = (ins: any) => {
    setEditingId(ins._id)
    setFormData({
      title: ins.title || '', summary: ins.summary || '', content: ins.content || '',
      category: ins.category || 'bis_update', country: ins.country || 'India',
      source: ins.source || '', link: ins.link || '', imageUrl: ins.imageUrl || '',
      author: ins.author || '', tags: (ins.tags || []).join(', '),
      relevanceScore: Number(ins.relevanceScore) || 0,
      published: ins.published !== false, featured: ins.featured === true,
      targetCountries: (ins.targetCountries || []).join(', '),
      certifications: (ins.certifications || []).join(', '),
    })
    setModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingId) updateMutation.mutate({ id: editingId, data: formData })
    else createMutation.mutate(formData)
  }

  const modalInput: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', outline: 'none' }
  const modalLabel: React.CSSProperties = { display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }
  const iconBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', padding: 6, display: 'flex' }

  return (
    <div>
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 'var(--radius-lg)', width: 620, maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border)' }}>
            <h3 style={{ margin: '0 0 16px', color: 'var(--text-primary)' }}>{editingId ? 'Edit Insight' : 'New Insight'}</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label style={modalLabel}>Title</label>
                <input required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. BIS Amends IS 1293 for Electrical Plugs" style={modalInput} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={modalLabel}>Short Description</label>
                <textarea required rows={2} value={formData.summary} onChange={e => setFormData({ ...formData, summary: e.target.value })} placeholder="One or two sentences shown in the feed…" style={{ ...modalInput, fontFamily: 'inherit' }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={modalLabel}>Full Content</label>
                <textarea rows={6} value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })} placeholder="Full article body shown when the reader opens the insight…" style={{ ...modalInput, fontFamily: 'inherit' }} />
              </div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <label style={modalLabel}>Category</label>
                  <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} style={modalInput}>
                    {INSIGHT_CATEGORIES.filter(c => c.key !== 'all').map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={modalLabel}>Country</label>
                  <input required value={formData.country} onChange={e => setFormData({ ...formData, country: e.target.value })} style={modalInput} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={modalLabel}>Author</label>
                  <input value={formData.author} onChange={e => setFormData({ ...formData, author: e.target.value })} placeholder="Optional" style={modalInput} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <label style={modalLabel}>Source</label>
                  <input required value={formData.source} onChange={e => setFormData({ ...formData, source: e.target.value })} placeholder="BIS Official" style={modalInput} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={modalLabel}>Relevance (0–100)</label>
                  <input type="number" min={0} max={100} value={formData.relevanceScore === 0 ? '' : String(formData.relevanceScore)}
                    onChange={e => {
                      const parsed = parseInt(e.target.value, 10)
                      setFormData({ ...formData, relevanceScore: Number.isNaN(parsed) ? 0 : Math.min(100, Math.max(0, parsed)) })
                    }} style={modalInput} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <label style={modalLabel}>Source Link (optional)</label>
                  <input value={formData.link} onChange={e => setFormData({ ...formData, link: e.target.value })} placeholder="https://…" style={modalInput} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={modalLabel}>Image URL (optional)</label>
                  <input value={formData.imageUrl} onChange={e => setFormData({ ...formData, imageUrl: e.target.value })} placeholder="https://…/cover.jpg" style={modalInput} />
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={modalLabel}>Tags (comma-separated)</label>
                <input value={formData.tags} onChange={e => setFormData({ ...formData, tags: e.target.value })} placeholder="BIS, IS 1293, Electrical" style={modalInput} />
              </div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <label style={modalLabel}>Target Countries (comma-separated)</label>
                  <input value={formData.targetCountries} onChange={e => setFormData({ ...formData, targetCountries: e.target.value })} placeholder="India, UAE, Germany" style={modalInput} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={modalLabel}>Related Certifications (comma-separated)</label>
                  <input value={formData.certifications} onChange={e => setFormData({ ...formData, certifications: e.target.value })} placeholder="BIS, CE, FSSAI" style={modalInput} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13 }}>
                  <input type="checkbox" checked={formData.published} onChange={e => setFormData({ ...formData, published: e.target.checked })} />
                  Published (visible in mobile app)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13 }}>
                  <input type="checkbox" checked={formData.featured} onChange={e => setFormData({ ...formData, featured: e.target.checked })} />
                  Featured (pinned to top)
                </label>
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <Button type="button" variant="ghost" onClick={closeModal}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingId ? 'Save Changes' : 'Create Insight'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ color: 'var(--text-primary)', fontSize: 20, fontWeight: 700, margin: 0 }}>Regulatory Insights</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 0' }}>Same collection & API the mobile app reads — publish here, live in the app instantly</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" icon={<RefreshCw size={14} />} size="sm" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? 'Refreshing…' : 'Refresh Feed'}
          </Button>
          <Button icon={<Plus size={14} />} size="sm" onClick={() => { setEditingId(null); setFormData(EMPTY_FORM); setModalOpen(true) }}>New Insight</Button>
        </div>
      </div>

      {/* Category Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {INSIGHT_CATEGORIES.map(cat => (
          <button key={cat.key} onClick={() => setActiveCategory(cat.key)} style={{
            padding: '6px 14px', borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'var(--transition)',
            background: activeCategory === cat.key ? 'var(--accent-purple)' : 'var(--bg-card)',
            color: activeCategory === cat.key ? '#fff' : 'var(--text-secondary)',
            boxShadow: activeCategory === cat.key ? '0 4px 12px rgba(108,99,255,0.3)' : 'none',
          }}>
            {cat.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {isLoading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading insights…</p>
        ) : insights.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No insights in this category yet. Publish one to feed the mobile app.</p>
        ) : insights.map((ins: any) => {
          const unpublished = ins.published === false
          return (
          <div key={ins._id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 24px', borderLeft: `3px solid ${CATEGORY_COLOR[ins.category] ?? '#6C63FF'}`, opacity: unpublished ? 0.6 : 1 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{ background: (CATEGORY_COLOR[ins.category] ?? '#6C63FF') + '20', color: CATEGORY_COLOR[ins.category] ?? '#6C63FF', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {(ins.category || '').replace('_', ' ')}
                  </span>
                  {ins.featured && (
                    <span style={{ background: 'rgba(255,179,71,0.15)', color: '#FFB347', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>📌 PINNED</span>
                  )}
                  {unpublished && (
                    <span style={{ background: 'rgba(139,146,165,0.15)', color: '#8B92A5', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>DRAFT — hidden from app</span>
                  )}
                  <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{ins.source}{ins.author ? ` · ${ins.author}` : ''} · {formatRelative(ins.publishedAt || ins.createdAt)}</span>
                  {ins.relevanceScore > 0 && (
                    <span style={{ background: 'rgba(0,200,150,0.12)', color: '#00C896', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>
                      {Math.round(ins.relevanceScore)}% relevant
                    </span>
                  )}
                </div>
                <h3 style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 700, margin: '0 0 8px', lineHeight: 1.4 }}>{ins.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '0 0 12px', lineHeight: 1.6 }}>{ins.summary}</p>

                {(ins.tags || []).length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {ins.tags.map((tag: string) => (
                      <span key={tag} style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>{tag}</span>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                <button onClick={() => patchMutation.mutate({ id: ins._id, patch: { published: unpublished } })}
                  title={unpublished ? 'Publish' : 'Unpublish'} style={{ ...iconBtn, color: unpublished ? '#00C896' : 'var(--text-muted)' }}>
                  {unpublished ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                <button onClick={() => patchMutation.mutate({ id: ins._id, patch: { featured: !ins.featured } })}
                  title={ins.featured ? 'Unpin' : 'Pin to top'} style={{ ...iconBtn, color: ins.featured ? '#FFB347' : 'var(--text-muted)' }}>
                  {ins.featured ? <PinOff size={16} /> : <Pin size={16} />}
                </button>
                <button onClick={() => openEdit(ins)} title="Edit" style={{ ...iconBtn, color: 'var(--text-muted)' }}>
                  <Edit2 size={16} />
                </button>
                <button onClick={() => { if (window.confirm(`Delete "${ins.title}"?`)) deleteMutation.mutate(ins._id) }} title="Delete" style={{ ...iconBtn, color: '#FF6B9D' }}>
                  <Trash2 size={16} />
                </button>
                {ins.link && (
                  <a href={ins.link} target="_blank" rel="noopener noreferrer" title="Open source" style={{ ...iconBtn, color: 'var(--text-muted)' }}>
                    <ExternalLink size={16} />
                  </a>
                )}
              </div>
            </div>
          </div>
        )})}
      </div>
    </div>
  )
}
