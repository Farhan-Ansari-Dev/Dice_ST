import React, { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Settings, Rocket, Search, ToggleLeft, ToggleRight, Palette, Type, Hash,
  Bell, Shield, Smartphone, Zap, Globe, Brain, UserCheck, Eye, Clock,
  CheckCircle2, AlertTriangle, ChevronRight, Undo2, History, Sparkles,
} from 'lucide-react'
import Button from '../../components/common/Button'
import StatCard from '../../components/common/StatCard'
import Modal from '../../components/common/Modal'
import { toast } from '../../store/toastStore'
import apiClient from '../../services/apiClient'

// ─── Config Registry ────────────────────────────────────────────────────────
// Maps each backend field to a rich UI representation

interface ConfigEntry {
  key: string
  section: 'featureFlags' | 'dynamicConfig' | 'aiSettings'
  name: string
  description: string
  category: string
  type: 'boolean' | 'string' | 'number' | 'color' | 'select' | 'textarea' | 'password'
  options?: { label: string; value: string }[]
  icon: React.ReactNode
  environment: 'all' | 'mobile' | 'admin'
}

const CONFIG_REGISTRY: ConfigEntry[] = [
  // Feature Flags
  { key: 'maintenance_mode', section: 'featureFlags', name: 'Maintenance Mode', description: 'Shows maintenance screen to all mobile users. Use during deployments.', category: 'Maintenance', type: 'boolean', icon: <Shield size={16} />, environment: 'mobile' },
  { key: 'enable_ai_assistant', section: 'featureFlags', name: 'AI Assistant', description: 'Enables the AI-powered compliance assistant in the mobile app.', category: 'AI', type: 'boolean', icon: <Brain size={16} />, environment: 'mobile' },
  { key: 'enable_ocr_scanning', section: 'featureFlags', name: 'OCR Document Scanning', description: 'Allows users to scan documents using camera OCR.', category: 'Experimental', type: 'boolean', icon: <Eye size={16} />, environment: 'mobile' },
  { key: 'enable_referral_rewards', section: 'featureFlags', name: 'Referral Rewards', description: 'Enables the referral program with reward credits.', category: 'Payments', type: 'boolean', icon: <Sparkles size={16} />, environment: 'mobile' },
  { key: 'enable_promotional_banners', section: 'featureFlags', name: 'Promotional Banners', description: 'Shows promotional banners on the home screen.', category: 'Home Screen', type: 'boolean', icon: <Globe size={16} />, environment: 'mobile' },
  { key: 'enable_notifications', section: 'featureFlags', name: 'Push Notifications', description: 'Enables push notification delivery to mobile devices.', category: 'Notifications', type: 'boolean', icon: <Bell size={16} />, environment: 'mobile' },
  { key: 'consultant_verification_enabled', section: 'featureFlags', name: 'Consultant Verification', description: 'Allows consultants to submit verification applications.', category: 'Consultant', type: 'boolean', icon: <UserCheck size={16} />, environment: 'mobile' },

  // Dynamic Config
  { key: 'banner_text', section: 'dynamicConfig', name: 'Home Banner Text', description: 'Text displayed in the promotional banner on the home screen.', category: 'Home Screen', type: 'string', icon: <Type size={16} />, environment: 'mobile' },
  { key: 'banner_color', section: 'dynamicConfig', name: 'Banner Color', description: 'Background color of the home promotional banner.', category: 'Home Screen', type: 'color', icon: <Palette size={16} />, environment: 'mobile' },
  { key: 'referral_reward_value', section: 'dynamicConfig', name: 'Referral Reward Amount', description: 'Credit amount (INR) awarded per successful referral.', category: 'Payments', type: 'number', icon: <Hash size={16} />, environment: 'mobile' },
  { key: 'announcement_title', section: 'dynamicConfig', name: 'Announcement Title', description: 'Title of the in-app announcement popup.', category: 'Home Screen', type: 'string', icon: <Type size={16} />, environment: 'mobile' },
  { key: 'announcement_body', section: 'dynamicConfig', name: 'Announcement Body', description: 'Full announcement message shown in-app.', category: 'Home Screen', type: 'textarea', icon: <Type size={16} />, environment: 'mobile' },

  // AI Settings
  { key: 'provider', section: 'aiSettings', name: 'AI Provider', description: 'Backend AI inference provider for the assistant.', category: 'AI', type: 'select', options: [{ label: 'NVIDIA NIM (Llama)', value: 'nvidia' }, { label: 'OpenAI (GPT)', value: 'openai' }, { label: 'Google Gemini', value: 'gemini' }, { label: 'Anthropic Claude', value: 'claude' }, { label: 'Azure OpenAI', value: 'azure' }, { label: 'Ollama (local, dev only)', value: 'ollama' }], icon: <Brain size={16} />, environment: 'admin' },
  { key: 'model', section: 'aiSettings', name: 'AI Model', description: 'Specific model identifier used for inference calls.', category: 'AI', type: 'string', icon: <Zap size={16} />, environment: 'admin' },
  { key: 'visionModel', section: 'aiSettings', name: 'AI Vision Model', description: 'Vision-capable model for the Product Quality Analyzer. Leave blank to use the provider default.', category: 'AI', type: 'string', icon: <Zap size={16} />, environment: 'admin' },
  { key: 'baseUrl', section: 'aiSettings', name: 'AI Base URL', description: 'Only needed for Azure OpenAI (your resource endpoint) or a non-default Ollama host. Leave blank otherwise.', category: 'AI', type: 'string', icon: <Zap size={16} />, environment: 'admin' },
  { key: 'apiKey', section: 'aiSettings', name: 'AI API Key', description: 'Secret key for the AI provider. Never exposed to clients.', category: 'AI', type: 'password', icon: <Shield size={16} />, environment: 'admin' },
]

const CATEGORIES = ['All', 'Home Screen', 'AI', 'Payments', 'Notifications', 'Consultant', 'Maintenance', 'Experimental']
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'All': <Settings size={14} />,
  'Home Screen': <Smartphone size={14} />,
  'AI': <Brain size={14} />,
  'Payments': <Hash size={14} />,
  'Notifications': <Bell size={14} />,
  'Consultant': <UserCheck size={14} />,
  'Maintenance': <Shield size={14} />,
  'Experimental': <Zap size={14} />,
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface RemoteConfigData {
  featureFlags: Record<string, boolean>
  dynamicConfig: Record<string, any>
  aiSettings: Record<string, string>
}

interface Change {
  entry: ConfigEntry
  oldValue: any
  newValue: any
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function RemoteConfigPage() {
  const [savedConfig, setSavedConfig] = useState<RemoteConfigData | null>(null)
  const [draftConfig, setDraftConfig] = useState<RemoteConfigData | null>(null)
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [lastPublished, setLastPublished] = useState<string | null>(null)

  useEffect(() => { fetchConfig() }, [])

  const fetchConfig = async () => {
    try {
      const response = await apiClient.get('/remote-config/admin')
      const data = response.data.data
      setSavedConfig(JSON.parse(JSON.stringify(data)))
      setDraftConfig(JSON.parse(JSON.stringify(data)))
      if (data.updatedAt) setLastPublished(data.updatedAt)
    } catch {
      toast.error('Failed to fetch remote config')
    } finally {
      setLoading(false)
    }
  }

  const getValue = useCallback((entry: ConfigEntry): any => {
    if (!draftConfig) return ''
    return (draftConfig[entry.section] as any)?.[entry.key] ?? ''
  }, [draftConfig])

  const setValue = useCallback((entry: ConfigEntry, value: any) => {
    setDraftConfig(prev => {
      if (!prev) return prev
      return {
        ...prev,
        [entry.section]: { ...prev[entry.section], [entry.key]: value }
      }
    })
  }, [])

  const pendingChanges: Change[] = useMemo(() => {
    if (!savedConfig || !draftConfig) return []
    const changes: Change[] = []
    CONFIG_REGISTRY.forEach(entry => {
      const oldVal = (savedConfig[entry.section] as any)?.[entry.key]
      const newVal = (draftConfig[entry.section] as any)?.[entry.key]
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes.push({ entry, oldValue: oldVal, newValue: newVal })
      }
    })
    return changes
  }, [savedConfig, draftConfig])

  const filteredEntries = useMemo(() => {
    return CONFIG_REGISTRY.filter(entry => {
      const matchCategory = activeCategory === 'All' || entry.category === activeCategory
      const matchSearch = !search.trim() || entry.name.toLowerCase().includes(search.toLowerCase()) || entry.key.toLowerCase().includes(search.toLowerCase()) || entry.description.toLowerCase().includes(search.toLowerCase())
      return matchCategory && matchSearch
    })
  }, [activeCategory, search])

  const activeFeatureCount = useMemo(() => {
    if (!draftConfig) return 0
    return Object.values(draftConfig.featureFlags).filter(Boolean).length
  }, [draftConfig])

  const handlePublish = async () => {
    if (!draftConfig) return
    setPublishing(true)
    try {
      await apiClient.put('/remote-config/admin', draftConfig)
      setSavedConfig(JSON.parse(JSON.stringify(draftConfig)))
      setLastPublished(new Date().toISOString())
      setShowPublishModal(false)
      toast.success('Configuration published successfully')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to publish')
    } finally {
      setPublishing(false)
    }
  }

  const handleDiscard = () => {
    if (savedConfig) {
      setDraftConfig(JSON.parse(JSON.stringify(savedConfig)))
      toast.success('Changes discarded')
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--accent-purple)', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
        Loading configuration...
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (!draftConfig) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <AlertTriangle size={40} color="var(--accent-coral)" style={{ margin: '0 auto 12px' }} />
        <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 8 }}>Failed to load configuration</div>
        <Button onClick={() => { setLoading(true); fetchConfig() }}>Retry</Button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 24, maxWidth: 1400 }}>
      {/* Main Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ color: 'var(--accent-purple)', fontSize: 11, fontWeight: 800, letterSpacing: 1.5, marginBottom: 4 }}>FEATURE MANAGEMENT</div>
            <h2 style={{ color: 'var(--text-primary)', fontSize: 24, fontWeight: 800, margin: '0 0 6px', letterSpacing: -0.5 }}>Remote Config</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>Control mobile app features and content without app store releases</p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {pendingChanges.length > 0 && (
              <Button variant="ghost" onClick={handleDiscard} icon={<Undo2 size={14} />}>Discard</Button>
            )}
            <Button variant="secondary" onClick={() => setShowHistoryModal(true)} icon={<History size={14} />}>History</Button>
            <Button
              onClick={() => pendingChanges.length > 0 ? setShowPublishModal(true) : null}
              disabled={pendingChanges.length === 0}
              icon={<Rocket size={14} />}
            >
              Publish{pendingChanges.length > 0 ? ` (${pendingChanges.length})` : ''}
            </Button>
          </div>
        </div>

        {/* KPI Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
          <StatCard title="Total Keys" value={CONFIG_REGISTRY.length} icon={<Settings size={18} />} gradient="var(--gradient-purple)" />
          <StatCard title="Active Features" value={activeFeatureCount} suffix={`/ ${Object.keys(draftConfig.featureFlags).length}`} icon={<ToggleRight size={18} />} gradient="var(--gradient-green)" />
          <StatCard title="Pending Changes" value={pendingChanges.length} icon={<Clock size={18} />} gradient={pendingChanges.length > 0 ? 'var(--gradient-amber)' : 'var(--gradient-cyan)'} />
          <StatCard title="Last Published" value={lastPublished ? timeAgo(lastPublished) : 'Never'} icon={<CheckCircle2 size={18} />} gradient="var(--gradient-cyan)" />
        </div>

        {/* Search & Category Filter */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 360 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              placeholder="Search configuration..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '10px 12px 10px 36px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid',
                borderColor: activeCategory === cat ? 'var(--accent-purple)' : 'var(--border)',
                background: activeCategory === cat ? 'rgba(108,99,255,0.15)' : 'var(--bg-card)',
                color: activeCategory === cat ? 'var(--accent-purple)' : 'var(--text-secondary)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'var(--transition)',
              }}
            >
              {CATEGORY_ICONS[cat]}
              {cat}
              {cat !== 'All' && (
                <span style={{ fontSize: 10, opacity: 0.7 }}>
                  {CONFIG_REGISTRY.filter(e => e.category === cat).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Config Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredEntries.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
              No configuration matches your search
            </div>
          ) : (
            filteredEntries.map(entry => (
              <ConfigCard
                key={`${entry.section}.${entry.key}`}
                entry={entry}
                value={getValue(entry)}
                onChange={(val) => setValue(entry, val)}
                hasChange={pendingChanges.some(c => c.entry.key === entry.key && c.entry.section === entry.section)}
              />
            ))
          )}
        </div>
      </div>

      {/* Mobile Preview Sidebar */}
      <div style={{ width: 280, flexShrink: 0, position: 'sticky', top: 20, alignSelf: 'flex-start' }} className="hide-mobile">
        <MobilePreview config={draftConfig} />
      </div>

      {/* Publish Confirmation Modal */}
      <Modal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        title="Publish Configuration"
        subtitle={`${pendingChanges.length} change${pendingChanges.length !== 1 ? 's' : ''} will go live immediately`}
        icon={<Rocket size={18} />}
        maxWidth={640}
        footer={
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="ghost" onClick={() => setShowPublishModal(false)}>Cancel</Button>
            <Button onClick={handlePublish} disabled={publishing} icon={<Rocket size={14} />}>
              {publishing ? 'Publishing...' : 'Publish Configuration'}
            </Button>
          </div>
        }
      >
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
          These changes will be pushed to all mobile app users instantly via cache bust.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {pendingChanges.map(change => (
            <div key={`${change.entry.section}.${change.entry.key}`} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '12px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 13 }}>{change.entry.name}</span>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'rgba(108,99,255,0.12)', color: 'var(--accent-purple)', fontWeight: 700 }}>{change.entry.category}</span>
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Before</div>
                  <div style={{ color: 'var(--accent-coral)', fontFamily: 'var(--font-mono)', padding: '4px 8px', background: 'rgba(255,107,107,0.08)', borderRadius: 4, wordBreak: 'break-all' }}>
                    {formatValue(change.oldValue)}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
                  <ChevronRight size={14} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>After</div>
                  <div style={{ color: 'var(--accent-green)', fontFamily: 'var(--font-mono)', padding: '4px 8px', background: 'rgba(0,200,150,0.08)', borderRadius: 4, wordBreak: 'break-all' }}>
                    {formatValue(change.newValue)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* History Modal */}
      <Modal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        title="Version History"
        subtitle="Configuration change log"
        icon={<History size={18} />}
        maxWidth={500}
      >
        <div style={{ color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
          <Clock size={32} color="var(--text-muted)" style={{ margin: '0 auto 12px', display: 'block' }} />
          Version history is tracked via audit logs.<br />
          View detailed change history in the Audit Logs section.
        </div>
      </Modal>

      <style>{`
        @media (max-width: 1100px) {
          .hide-mobile { display: none !important; }
        }
      `}</style>
    </div>
  )
}

// ─── Config Card Component ──────────────────────────────────────────────────

function ConfigCard({ entry, value, onChange, hasChange }: { entry: ConfigEntry; value: any; onChange: (v: any) => void; hasChange: boolean }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: `1px solid ${hasChange ? 'var(--accent-purple)' : 'var(--border)'}`,
      borderRadius: 'var(--radius)',
      padding: '16px 20px',
      transition: 'var(--transition)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {hasChange && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: 'var(--accent-purple)', borderRadius: '0 4px 4px 0' }} />
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        {/* Icon */}
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: entry.type === 'boolean' && value ? 'rgba(0,200,150,0.12)' : 'var(--bg-hover)',
          border: `1px solid ${entry.type === 'boolean' && value ? 'rgba(0,200,150,0.2)' : 'var(--border)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: entry.type === 'boolean' && value ? 'var(--accent-green)' : 'var(--text-muted)',
          flexShrink: 0,
        }}>
          {entry.icon}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 14 }}>{entry.name}</span>
            {hasChange && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 'var(--radius-full)', background: 'rgba(108,99,255,0.15)', color: 'var(--accent-purple)', fontWeight: 800 }}>MODIFIED</span>}
            <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 'var(--radius-full)', background: entry.environment === 'mobile' ? 'rgba(0,212,255,0.1)' : 'rgba(255,179,71,0.1)', color: entry.environment === 'mobile' ? 'var(--accent-cyan)' : 'var(--accent-amber)', fontWeight: 700, marginLeft: 'auto', flexShrink: 0 }}>
              {entry.environment === 'mobile' ? 'MOBILE' : 'BACKEND'}
            </span>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 10, lineHeight: 1.4 }}>{entry.description}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{entry.section}.{entry.key}</span>
          </div>
        </div>

        {/* Editor */}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          <ConfigEditor entry={entry} value={value} onChange={onChange} />
        </div>
      </div>
    </div>
  )
}

// ─── Type-Specific Editors ──────────────────────────────────────────────────

function ConfigEditor({ entry, value, onChange }: { entry: ConfigEntry; value: any; onChange: (v: any) => void }) {
  switch (entry.type) {
    case 'boolean':
      return (
        <button
          onClick={() => onChange(!value)}
          style={{
            width: 48, height: 26, borderRadius: 13, border: 'none',
            background: value ? 'var(--accent-green)' : 'var(--bg-hover)',
            position: 'relative', cursor: 'pointer', transition: 'var(--transition)',
            boxShadow: value ? '0 2px 8px rgba(0,200,150,0.3)' : 'inset 0 1px 3px rgba(0,0,0,0.2)',
          }}
        >
          <div style={{
            width: 20, height: 20, borderRadius: '50%', background: '#fff',
            position: 'absolute', top: 3, left: value ? 25 : 3,
            transition: 'left 0.2s ease',
            boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
          }} />
        </button>
      )

    case 'number':
      return (
        <input
          type="number"
          value={value}
          onChange={e => onChange(Number(e.target.value) || 0)}
          style={{
            width: 100, padding: '7px 10px', background: 'var(--bg-input)',
            border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)', fontSize: 13, fontFamily: 'var(--font-mono)',
            textAlign: 'right', outline: 'none',
          }}
        />
      )

    case 'color':
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="color"
            value={value || '#6C63FF'}
            onChange={e => onChange(e.target.value)}
            style={{ width: 32, height: 32, border: 'none', borderRadius: 6, cursor: 'pointer', background: 'none' }}
          />
          <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            style={{
              width: 90, padding: '7px 10px', background: 'var(--bg-input)',
              border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)', fontSize: 12, fontFamily: 'var(--font-mono)',
              outline: 'none',
            }}
          />
        </div>
      )

    case 'select':
      return (
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{
            padding: '7px 28px 7px 10px', background: 'var(--bg-input)',
            border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)', fontSize: 13, outline: 'none',
            appearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238B92A5' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 8px center',
          }}
        >
          {entry.options?.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )

    case 'textarea':
      return (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={2}
          style={{
            width: 220, padding: '7px 10px', background: 'var(--bg-input)',
            border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)', fontSize: 13, outline: 'none', resize: 'vertical',
            fontFamily: 'var(--font-family)',
          }}
        />
      )

    case 'password':
      return (
        <input
          type="password"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="••••••••"
          style={{
            width: 160, padding: '7px 10px', background: 'var(--bg-input)',
            border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)', fontSize: 13, fontFamily: 'var(--font-mono)',
            outline: 'none',
          }}
        />
      )

    default:
      return (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{
            width: 200, padding: '7px 10px', background: 'var(--bg-input)',
            border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)', fontSize: 13, outline: 'none',
          }}
        />
      )
  }
}

// ─── Mobile Preview ─────────────────────────────────────────────────────────

function MobilePreview({ config }: { config: RemoteConfigData }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
    }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Smartphone size={14} color="var(--accent-cyan)" />
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Mobile Preview</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--accent-green)', fontWeight: 600 }}>LIVE</span>
      </div>

      {/* Phone Frame */}
      <div style={{ padding: 16 }}>
        <div style={{
          width: '100%', aspectRatio: '9/16', maxHeight: 420,
          background: '#0A0B0F', borderRadius: 24, border: '3px solid #2A2D3E',
          overflow: 'hidden', position: 'relative',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Status Bar */}
          <div style={{ height: 28, background: '#12141A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 60, height: 4, borderRadius: 2, background: '#2A2D3E' }} />
          </div>

          {/* Maintenance Overlay */}
          {config.featureFlags.maintenance_mode && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,11,15,0.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
              <Shield size={28} color="#FF6B6B" />
              <div style={{ color: '#fff', fontSize: 12, fontWeight: 700, marginTop: 8 }}>Maintenance Mode</div>
              <div style={{ color: '#8B92A5', fontSize: 9, marginTop: 4 }}>App is temporarily unavailable</div>
            </div>
          )}

          {/* Banner */}
          {config.featureFlags.enable_promotional_banners && config.dynamicConfig.banner_text && (
            <div style={{
              padding: '6px 10px', fontSize: 8, fontWeight: 600,
              background: config.dynamicConfig.banner_color || '#6C63FF',
              color: '#fff', textAlign: 'center', letterSpacing: 0.3,
            }}>
              {config.dynamicConfig.banner_text}
            </div>
          )}

          {/* App Content */}
          <div style={{ flex: 1, padding: 10, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>DICE</div>
                <div style={{ color: '#8B92A5', fontSize: 7 }}>by Sanyog</div>
              </div>
              {config.featureFlags.enable_notifications && (
                <div style={{ width: 18, height: 18, borderRadius: 5, background: '#1A1D2E', display: 'grid', placeItems: 'center' }}>
                  <Bell size={9} color="#6C63FF" />
                </div>
              )}
            </div>

            {/* Announcement */}
            {config.dynamicConfig.announcement_title && (
              <div style={{ padding: '6px 8px', background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: 6, marginBottom: 8 }}>
                <div style={{ color: '#fff', fontSize: 8, fontWeight: 700 }}>{config.dynamicConfig.announcement_title}</div>
                {config.dynamicConfig.announcement_body && (
                  <div style={{ color: '#8B92A5', fontSize: 7, marginTop: 2, lineHeight: 1.3 }}>
                    {config.dynamicConfig.announcement_body.slice(0, 60)}{config.dynamicConfig.announcement_body.length > 60 ? '...' : ''}
                  </div>
                )}
              </div>
            )}

            {/* Feature Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {config.featureFlags.enable_ai_assistant && (
                <MiniFeatureCard icon={<Brain size={9} />} label="AI Assistant" color="#6C63FF" />
              )}
              {config.featureFlags.enable_ocr_scanning && (
                <MiniFeatureCard icon={<Eye size={9} />} label="OCR Scan" color="#00D4FF" />
              )}
              {config.featureFlags.enable_referral_rewards && (
                <MiniFeatureCard icon={<Sparkles size={9} />} label={`Refer ₹${config.dynamicConfig.referral_reward_value}`} color="#FFB347" />
              )}
              {config.featureFlags.consultant_verification_enabled && (
                <MiniFeatureCard icon={<UserCheck size={9} />} label="Verification" color="#00C896" />
              )}
            </div>
          </div>

          {/* Bottom Nav */}
          <div style={{ height: 32, background: '#12141A', borderTop: '1px solid #2A2D3E', display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 10px' }}>
            <div style={{ width: 4, height: 4, borderRadius: 2, background: '#6C63FF' }} />
            <div style={{ width: 4, height: 4, borderRadius: 2, background: '#3A3D4E' }} />
            <div style={{ width: 4, height: 4, borderRadius: 2, background: '#3A3D4E' }} />
            <div style={{ width: 4, height: 4, borderRadius: 2, background: '#3A3D4E' }} />
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.6 }}>
        Preview updates live as you change config values above.
      </div>
    </div>
  )
}

function MiniFeatureCard({ icon, label, color }: { icon: React.ReactNode; label: string; color: string }) {
  return (
    <div style={{ padding: '6px 8px', background: `${color}12`, border: `1px solid ${color}30`, borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ color }}>{icon}</span>
      <span style={{ color: '#fff', fontSize: 7, fontWeight: 600 }}>{label}</span>
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatValue(val: any): string {
  if (val === true) return 'ON'
  if (val === false) return 'OFF'
  if (val === '' || val === undefined || val === null) return '(empty)'
  return String(val)
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
