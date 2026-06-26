import React, { useState } from 'react'
import { TrendingUp, Bookmark, ExternalLink, Bot, RefreshCw } from 'lucide-react'
import Button from '../../components/common/Button'
import { formatRelative } from '../../utils/formatters'
import { INSIGHT_CATEGORIES } from '../../utils/constants'

const INSIGHTS = [
  { id: '1', category: 'bis_update', title: 'BIS Amends IS 1293:2025 for Electrical Plugs & Sockets', summary: 'The Bureau of Indian Standards has released Amendment No. 3 to IS 1293:2025, affecting all plug and socket certifications issued before March 2025. Manufacturers must comply by September 2025.', source: 'BIS Official', date: '2025-05-24T09:30:00Z', tags: ['BIS', 'IS 1293', 'Electrical'], aiSummary: 'Critical update for electronics manufacturers. 23 of your active certifications may need review. Recommend initiating amendment compliance check immediately.', relevance: 0.95 },
  { id: '2', category: 'customs', title: 'CBIC Issues Circular on Import Duty for Electronic Goods', summary: 'The Central Board of Indirect Taxes & Customs has revised import duty structure for consumer electronics under HS Code 8501-8543. New duty rates effective from June 1, 2025.', source: 'CBIC', date: '2025-05-23T14:00:00Z', tags: ['Customs', 'CBIC', 'Electronics', 'Import Duty'], aiSummary: 'Import duty changes affect cost structures for imported components. Clients in electronics sector should review their supply chains.', relevance: 0.88 },
  { id: '3', category: 'export_import', title: 'DGFT Updates SCOMET Policy for Dual-Use Goods', summary: 'Directorate General of Foreign Trade has updated the Special Chemicals, Organisms, Materials, Equipment and Technologies (SCOMET) policy with 12 new items added to the controlled list.', source: 'DGFT', date: '2025-05-22T11:00:00Z', tags: ['DGFT', 'SCOMET', 'Export Control'], aiSummary: 'SCOMET list expansion affects exporters of specialized chemicals and advanced materials. License applications required for new controlled items.', relevance: 0.76 },
  { id: '4', category: 'certification', title: 'FSSAI Mandates QR Code on All Packaged Food Products', summary: 'Food Safety and Standards Authority of India has made it mandatory for all packaged food manufacturers to include QR codes linking to product batch information, manufacturing date, and safety certifications from July 1, 2025.', source: 'FSSAI', date: '2025-05-21T10:00:00Z', tags: ['FSSAI', 'QR Code', 'Food Safety', 'Labelling'], aiSummary: 'FSSAI mandate impacts all food-sector clients. Packaging changes needed within 6 weeks. Proactively notify relevant clients.', relevance: 0.92 },
  { id: '5', category: 'government', title: 'Government Launches PLI Scheme for Specialty Chemicals', summary: 'Ministry of Chemicals and Fertilizers announces Production Linked Incentive scheme offering 10% incentive on incremental sales for specialty chemical manufacturers, requiring IS certification.', source: 'Ministry of Chemicals', date: '2025-05-20T15:00:00Z', tags: ['PLI', 'Specialty Chemicals', 'Government Scheme'], aiSummary: 'Excellent business opportunity for BIS certification in specialty chemicals segment. Recommend proactively outreach to chemical manufacturers.', relevance: 0.73 },
]

const CATEGORY_COLOR: Record<string, string> = {
  bis_update: '#6C63FF', customs: '#FFB347', export_import: '#00D4FF', certification: '#00C896', government: '#FF6B9D',
}

export default function InsightsPage() {
  const [activeCategory, setActiveCategory] = useState('all')
  const [bookmarked, setBookmarked] = useState<string[]>([])
  const filtered = activeCategory === 'all' ? INSIGHTS : INSIGHTS.filter(i => i.category === activeCategory)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ color: 'var(--text-primary)', fontSize: 20, fontWeight: 700, margin: 0 }}>Regulatory Insights</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 0' }}>AI-powered compliance intelligence — updated continuously</p>
        </div>
        <Button variant="secondary" icon={<RefreshCw size={14} />} size="sm">Refresh Feed</Button>
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
        {filtered.map(ins => (
          <div key={ins.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 24px', borderLeft: `3px solid ${CATEGORY_COLOR[ins.category] ?? '#6C63FF'}` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ background: (CATEGORY_COLOR[ins.category] ?? '#6C63FF') + '20', color: CATEGORY_COLOR[ins.category] ?? '#6C63FF', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {ins.category.replace('_', ' ')}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{ins.source} · {formatRelative(ins.date)}</span>
                  <span style={{ background: 'rgba(0,200,150,0.12)', color: '#00C896', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>
                    {Math.round(ins.relevance * 100)}% relevant
                  </span>
                </div>
                <h3 style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 700, margin: '0 0 8px', lineHeight: 1.4 }}>{ins.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '0 0 12px', lineHeight: 1.6 }}>{ins.summary}</p>

                {/* AI Summary */}
                <div style={{ background: 'rgba(108,99,255,0.06)', border: '1px solid rgba(108,99,255,0.15)', borderRadius: 8, padding: '10px 14px', display: 'flex', gap: 10 }}>
                  <Bot size={14} color="var(--accent-purple)" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ color: 'var(--text-secondary)', fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                    <strong style={{ color: 'var(--accent-purple)' }}>AI Summary: </strong>{ins.aiSummary}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                  {ins.tags.map(tag => (
                    <span key={tag} style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>{tag}</span>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                <button onClick={() => setBookmarked(b => b.includes(ins.id) ? b.filter(x => x !== ins.id) : [...b, ins.id])} style={{ background: 'none', border: 'none', cursor: 'pointer', color: bookmarked.includes(ins.id) ? 'var(--accent-amber)' : 'var(--text-muted)', padding: 6, display: 'flex' }}>
                  <Bookmark size={16} fill={bookmarked.includes(ins.id) ? 'currentColor' : 'none'} />
                </button>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 6, display: 'flex' }}>
                  <ExternalLink size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
