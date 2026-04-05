import { useState, useRef, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { api, fmt } from '../api.js'
import s from './AISidebar.module.css'

const MODELS = [
  { id: 'claude-opus-4-5',         label: 'Claude Opus 4',    desc: 'Most capable',    icon: '◆' },
  { id: 'claude-sonnet-4-5',       label: 'Claude Sonnet 4',  desc: 'Balanced',         icon: '◈' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4',   desc: 'Fast & efficient', icon: '◇' },
]

const QUICK = [
  'Summarise this stock in 3 bullets',
  'Is this a good buy right now?',
  'What is the 52-week trend?',
  'Compare volatility to sector average',
  'Explain the momentum score',
  'What are the key risks?',
]

function Bubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`${s.bubble} ${isUser ? s.userBubble : s.aiBubble}`}>
      {!isUser && (
        <div className={s.aiTag}>
          <span className={s.aiDot} />AI
        </div>
      )}
      <div className={s.bubbleText}>{msg.content}</div>
    </div>
  )
}

export default function AISidebar() {
  const { activeSym, activeSummary } = useApp()

  const [open,     setOpen]     = useState(true)
  const [model,    setModel]    = useState(MODELS[1].id)
  const [messages, setMessages] = useState([])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [apiKey,   setApiKey]   = useState('')
  const [showKey,  setShowKey]  = useState(false)

  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Reset when stock changes
  useEffect(() => {
    setMessages([])
    setError(null)
  }, [activeSym])

  function buildSystem() {
    const d = activeSummary
    if (!d) return `You are a professional stock market analyst. Answer questions about NSE stocks clearly and concisely.`
    return `You are a professional stock market analyst for the PULSE market intelligence platform.

Current stock context:
- Symbol: ${d.symbol}
- Company: ${d.name}
- Sector: ${d.sector}
- Latest Price: ₹${fmt(d.latest_close)}
- Today's Change: ${d.change_pct >= 0 ? '+' : ''}${d.change_pct}%
- 52-Week High: ₹${fmt(d.week52_high)}
- 52-Week Low: ₹${fmt(d.week52_low)}
- Average Close: ₹${fmt(d.avg_close)}
- Annual Volatility: ${d.volatility_pct}%
- 1-Year Total Return: ${d.total_return_pct >= 0 ? '+' : ''}${d.total_return_pct}%
- Average Daily Volume: ${d.avg_volume?.toLocaleString('en-IN')}

Answer questions clearly, use ₹ for prices, and be direct. Keep responses concise unless detail is requested.`
  }

  async function send(text) {
    const userText = (text || input).trim()
    if (!userText || loading) return

    const newMsg = { role: 'user', content: userText }
    const nextHistory = [...messages, newMsg]
    setMessages(nextHistory)
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const res = await api.aiChat({
        model,
        messages: nextHistory.map(m => ({ role: m.role, content: m.content })),
        system: buildSystem(),
        apiKey,
      })
      const aiText = res.content?.[0]?.text || res.reply || 'No response'
      setMessages(prev => [...prev, { role: 'assistant', content: aiText }])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function onKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <aside className={`${s.sidebar} ${open ? s.open : s.closed}`}>
      {/* Toggle */}
      <button className={s.toggle} onClick={() => setOpen(o => !o)} title={open ? 'Collapse AI' : 'Open AI Assistant'}>
        <svg viewBox="0 0 16 16" width="13" fill="none">
          {open
            ? <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            : <><path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="4" cy="4" r="1.5" fill="var(--amber)"/>
              </>
          }
        </svg>
        {!open && <span className={s.toggleLabel}>AI</span>}
      </button>

      {open && (
        <div className={s.inner}>
          {/* Header */}
          <div className={s.head}>
            <div className={s.headTitle}>
              <span className={s.aiIcon}>⬡</span>
              <span>AI Analyst</span>
            </div>
            {activeSym && (
              <div className={s.context}>
                Analysing <strong>{activeSym}</strong>
              </div>
            )}
          </div>

          {/* Model selector */}
          <div className={s.modelSection}>
            <div className={s.modelLabel}>Model</div>
            <div className={s.modelCards}>
              {MODELS.map(m => (
                <button key={m.id}
                  className={`${s.modelCard} ${model === m.id ? s.modelOn : ''}`}
                  onClick={() => setModel(m.id)}>
                  <span className={s.modelIcon}>{m.icon}</span>
                  <div>
                    <div className={s.modelName}>{m.label}</div>
                    <div className={s.modelDesc}>{m.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* API Key input */}
          <div className={s.keySection}>
            <div className={s.keyRow}>
              <span className={s.keyLabel}>API Key</span>
              <button className={s.keyToggle} onClick={() => setShowKey(v => !v)}>
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <input
              className={s.keyInput}
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="sk-ant-… (optional if backend has key)"
            />
          </div>

          {/* Messages */}
          <div className={s.messages}>
            {messages.length === 0 && (
              <div className={s.empty}>
                <div className={s.emptyIcon}>⬡</div>
                <div className={s.emptyText}>Ask anything about {activeSym || 'a stock'}</div>
              </div>
            )}
            {messages.map((m, i) => <Bubble key={i} msg={m} />)}
            {loading && (
              <div className={`${s.bubble} ${s.aiBubble}`}>
                <div className={s.aiTag}><span className={s.aiDot} />AI</div>
                <div className={s.thinking}>
                  <span /><span /><span />
                </div>
              </div>
            )}
            {error && <div className={s.errMsg}>⚠ {error}</div>}
            <div ref={bottomRef} />
          </div>

          {/* Quick prompts */}
          {messages.length === 0 && (
            <div className={s.quickSection}>
              <div className={s.quickLabel}>Quick questions</div>
              <div className={s.quickGrid}>
                {QUICK.map(q => (
                  <button key={q} className={s.quick} onClick={() => send(q)}>{q}</button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className={s.inputWrap}>
            <textarea
              ref={textareaRef}
              className={s.input}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="Ask about this stock…"
              rows={2}
            />
            <button className={`${s.send} ${(!input.trim() || loading) ? s.sendDim : ''}`}
              onClick={() => send()} disabled={!input.trim() || loading}>
              <svg viewBox="0 0 16 16" width="14" fill="none">
                <path d="M14 8L2 2L5.5 8L2 14L14 8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {messages.length > 0 && (
            <button className={s.clear} onClick={() => { setMessages([]); setError(null) }}>
              Clear conversation
            </button>
          )}
        </div>
      )}
    </aside>
  )
}
