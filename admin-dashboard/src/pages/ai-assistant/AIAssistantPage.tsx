import React, { useState, useRef, useEffect } from 'react'
import { Bot, Send, User, Sparkles, ShieldCheck, RefreshCw } from 'lucide-react'
import { apiClient } from '../../services/apiClient'
import Button from '../../components/common/Button'

interface Message { id: string; role: 'user' | 'assistant'; content: string; time: Date }

const QUICK_PROMPTS = [
  'How many applications are pending?',
  'Which applications are awaiting document review?',
  'Show certification-body requests that are unresolved',
  'Give me a summary of current operational activity',
]

const INITIAL: Message[] = [
  {
    id: '0',
    role: 'assistant',
    content:
      "Hello — I'm the DICE Admin Assistant. I answer questions using your live DICE operational data (applications, documents awaiting review, certification-body requests, users, and analytics), limited to the records you're authorized to see. Ask me things like \"how many applications are pending?\" or \"which applications are waiting for documents?\".",
    time: new Date(),
  },
]

// Plain-language internal disclosure (mirrors the backend staff-AI disclosure).
const DISCLOSURE_TEXT =
  'This assistant uses OpenAI, a third-party AI service, to process the operational data you request and generate answers. It only accesses records you are authorized to see, and it is for internal operational use. Do you want to enable it?'

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>(INITIAL)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | undefined>()
  const [needsDisclosure, setNeedsDisclosure] = useState(false)
  const [ackLoading, setAckLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Check disclosure status on mount so the assistant prompts before first use.
  useEffect(() => {
    apiClient.get('/admin-ai/disclosure')
      .then(res => { if (!res.data?.data?.is_current) setNeedsDisclosure(true) })
      .catch(() => { /* 403/again handled on send */ })
  }, [])

  const acknowledge = async () => {
    setAckLoading(true)
    try {
      await apiClient.post('/admin-ai/disclosure')
      setNeedsDisclosure(false)
    } catch {
      // leave the disclosure visible; the user can retry
    } finally {
      setAckLoading(false)
    }
  }

  const errorMessageFor = (err: any): { text: string; disclosure?: boolean } => {
    const status = err?.response?.status
    const code = err?.response?.data?.error
    if (status === 401) return { text: 'Your session has expired. Please sign in again.' }
    if (status === 403 && code === 'staff_ai_disclosure_required') return { text: 'Please review and enable the Admin Assistant to continue.', disclosure: true }
    if (status === 403) return { text: "You don't have access to the Admin Assistant." }
    if (status === 429) return { text: 'Too many requests. Please wait a moment and try again.' }
    if (status === 503 || code === 'ai_unavailable') return { text: 'The AI service is temporarily unavailable. Please try again shortly.' }
    if (status === 502) return { text: 'The assistant could not complete that request. Please retry.' }
    return { text: 'Something went wrong. Please try again.' }
  }

  const send = async (text = input) => {
    if (!text.trim() || loading) return
    if (needsDisclosure) return // gated until acknowledged
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text, time: new Date() }
    setMessages(m => [...m, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await apiClient.post('/admin-ai/chat', { message: text, conversationId })
      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: res.data.data.response, time: new Date() }
      setConversationId(res.data.data.conversationId)
      setMessages(m => [...m, aiMsg])
    } catch (err) {
      const { text: errText, disclosure } = errorMessageFor(err)
      if (disclosure) setNeedsDisclosure(true)
      setMessages(m => [...m, { id: (Date.now() + 1).toString(), role: 'assistant', content: errText, time: new Date() }])
    } finally {
      setLoading(false)
    }
  }

  const handleClearChat = () => { setMessages(INITIAL); setConversationId(undefined) }

  const renderContent = (t: string) => t.split('\n').map((line, i) => {
    if (line.startsWith('**') && line.endsWith('**')) return <strong key={i} style={{ display: 'block', marginBottom: 4 }}>{line.slice(2, -2)}</strong>
    const bold = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    return <p key={i} style={{ margin: '2px 0', lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: bold || '&nbsp;' }} />
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 112px)', gap: 0 }}>
      {/* Header */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--gradient-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bot size={18} color="#fff" />
          </div>
          <div>
            <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 700 }}>DICE Admin Assistant</div>
            <div style={{ color: '#00C896', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00C896', display: 'inline-block' }} /> Grounded in your DICE data
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" icon={<RefreshCw size={12} />} onClick={handleClearChat}>Clear Chat</Button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderTop: 'none', borderBottom: 'none', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {messages.map(msg => (
          <div key={msg.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: msg.role === 'user' ? 'var(--gradient-cyan)' : 'var(--gradient-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {msg.role === 'user' ? <User size={14} color="#fff" /> : <Bot size={14} color="#fff" />}
            </div>
            <div style={{ maxWidth: '72%', background: msg.role === 'user' ? 'rgba(108,99,255,0.12)' : 'var(--bg-card)', border: `1px solid ${msg.role === 'user' ? 'rgba(108,99,255,0.25)' : 'var(--border)'}`, borderRadius: msg.role === 'user' ? '12px 2px 12px 12px' : '2px 12px 12px 12px', padding: '12px 16px' }}>
              <div style={{ color: 'var(--text-primary)', fontSize: 13, lineHeight: 1.6 }}>{renderContent(msg.content)}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 6 }}>{msg.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gradient-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={14} color="#fff" />
            </div>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '2px 12px 12px 12px', padding: '14px 16px', display: 'flex', gap: 5, alignItems: 'center' }}>
              {[0,1,2].map(i => <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent-purple)', display: 'inline-block', animation: `bounce 1.2s ${i * 0.2}s infinite` }} />)}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Disclosure gate */}
      {needsDisclosure && (
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderTop: 'none', padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <ShieldCheck size={18} color="var(--accent-purple)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <div style={{ color: 'var(--text-primary)', fontSize: 12.5, lineHeight: 1.6, marginBottom: 8 }}>{DISCLOSURE_TEXT}</div>
            <Button size="sm" onClick={acknowledge} disabled={ackLoading}>{ackLoading ? 'Enabling…' : 'Enable Admin Assistant'}</Button>
          </div>
        </div>
      )}

      {/* Quick Prompts */}
      {!needsDisclosure && (
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderTop: 'none', padding: '10px 16px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {QUICK_PROMPTS.map(p => (
            <button key={p} onClick={() => send(p)} style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '5px 12px', borderRadius: 'var(--radius-full)', fontSize: 11, cursor: 'pointer', transition: 'var(--transition)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Sparkles size={10} />{p}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)', padding: '12px 16px', display: 'flex', gap: 10 }}>
        <input
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder={needsDisclosure ? 'Enable the assistant above to start…' : 'Ask about applications, documents, CB requests, analytics…'}
          disabled={needsDisclosure}
          style={{ flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px', color: 'var(--text-primary)', fontSize: 13, outline: 'none', opacity: needsDisclosure ? 0.6 : 1 }}
        />
        <Button onClick={() => send()} disabled={!input.trim() || loading || needsDisclosure} icon={<Send size={14} />}>Send</Button>
      </div>
    </div>
  )
}
