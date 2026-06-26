import React, { useState, useRef, useEffect } from 'react'
import { Bot, Send, User, ChevronRight, X, Loader2, Sparkles, AlertCircle, FileText, Download, RefreshCw } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { apiClient } from '../../services/apiClient'
import Button from '../../components/common/Button'

interface Message { id: string; role: 'user' | 'assistant'; content: string; time: Date }

const QUICK_PROMPTS = [
  'Which certifications are expiring soon?',
  'Summarize BIS updates this week',
  'What documents are pending for APP-2401?',
  'Show me clients with most compliance issues',
]

const INITIAL: Message[] = [
  {
    id: '0',
    role: 'assistant',
    content: "Hello! I'm Sanyog AI, your compliance intelligence assistant. I have real-time access to your certifications, applications, regulatory updates, and client data.\n\nHow can I help you today? You can ask me about certification status, upcoming renewals, BIS/FSSAI updates, or any compliance questions.",
    time: new Date(),
  },
]

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>(INITIAL)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | undefined>()
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async (text = input) => {
    if (!text.trim()) return
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text, time: new Date() }
    setMessages(m => [...m, userMsg])
    setInput('')
    setLoading(true)
    
    try {
      const res = await apiClient.post('/ai/chat', { message: text, conversationId })
      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: res.data.data.response, time: new Date() }
      setConversationId(res.data.data.conversationId)
      setMessages(m => [...m, aiMsg])
    } catch (err) {
      const errorMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: 'Sorry, I encountered an error connecting to the AI service.', time: new Date() }
      setMessages(m => [...m, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  const handleClearChat = () => {
    setMessages(INITIAL)
    setConversationId(undefined)
  }

  const renderContent = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) return <strong key={i} style={{ display: 'block', marginBottom: 4 }}>{line.slice(2, -2)}</strong>
      const bold = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      return <p key={i} style={{ margin: '2px 0', lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: bold || '&nbsp;' }} />
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 112px)', gap: 0 }}>
      {/* Header */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--gradient-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bot size={18} color="#fff" />
          </div>
          <div>
            <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 700 }}>Sanyog AI Assistant</div>
            <div style={{ color: '#00C896', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00C896', display: 'inline-block' }} /> Online
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
              <div style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 6 }}>
                {msg.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
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

      {/* Quick Prompts */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderTop: 'none', padding: '10px 16px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {QUICK_PROMPTS.map(p => (
          <button key={p} onClick={() => send(p)} style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '5px 12px', borderRadius: 'var(--radius-full)', fontSize: 11, cursor: 'pointer', transition: 'var(--transition)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Sparkles size={10} />
            {p}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)', padding: '12px 16px', display: 'flex', gap: 10 }}>
        <input
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Ask about certifications, applications, BIS updates, compliance…"
          style={{ flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
        />
        <Button onClick={() => send()} disabled={!input.trim() || loading} icon={<Send size={14} />}>Send</Button>
      </div>
    </div>
  )
}
