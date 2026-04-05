import { useState, useRef, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { api, fmt, sign } from '../api.js'
import s from './AISidebar.module.css'

const PROVIDERS = [
  {
    id: 'ollama', name: 'Ollama', tag: 'Local · Free', color: '#22D3EE',
    models: ['llama3', 'llama3.1', 'mistral', 'gemma2', 'phi3'],
    needsKey: false,
  },
  {
    id: 'anthropic', name: 'Anthropic', tag: 'Claude', color: '#F59E0B',
    models: ['claude-sonnet-4-5', 'claude-opus-4-5', 'claude-haiku-4-5-20251001'],
    needsKey: true,
  },
  {
    id: 'openai', name: 'OpenAI', tag: 'GPT', color: '#34D399',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
    needsKey: true,
  },
  {
    id: 'openrouter', name: 'OpenRouter', tag: 'Multi-model', color: '#A78BFA',
    models: [
      'meta-llama/llama-3-8b-instruct',
      'anthropic/claude-3.5-sonnet',
      'openai/gpt-4o',
      'google/gemini-flash-1.5',
    ],
    needsKey: true,
  },
]

const QUICK_PROMPTS = [
  { icon: '📊', text: 'Give me a technical analysis summary' },
  { icon: '🎯', text: 'What are the key support & resistance levels?' },
  { icon: '⚠️', text: 'What are the main risks for this stock?' },
  { icon: '📈', text: 'Is the RSI signalling buy or sell?' },
  { icon: '🔄', text: 'How does volatility compare to sector?' },
  { icon: '💡', text: 'Explain the momentum score in simple terms' },
]

function buildSystem(summary, sym) {
  if (!summary) return `You are a professional equity analyst on the PULSE market terminal. Be concise, data-driven, and insightful.`
  return `You are a senior equity analyst on the PULSE market intelligence terminal.

Active Stock Context:
• Symbol: ${summary.symbol} | Company: ${summary.name} | Sector: ${summary.sector}
• Price: ₹${fmt(summary.latest_close)} | Today: ${sign(summary.change_pct)} | Prev: ₹${fmt(summary.prev_close)}
• 52W High: ₹${fmt(summary.week52_high)} | 52W Low: ₹${fmt(summary.week52_low)}
• Avg Close (1Y): ₹${fmt(summary.avg_close)} | 1Y Return: ${sign(summary.total_return_pct)}
• Ann. Volatility: ${summary.volatility_pct}% | RSI(14): ${summary.current_rsi || 'N/A'}
• P/E: ${summary.pe || 'N/A'}× | P/B: ${summary.pb || 'N/A'}× | Div Yield: ${summary.div_yield || 0}%
• Market Cap: ₹${summary.market_cap_lakh_cr || 'N/A'}L Cr | Avg Volume: ${summary.avg_volume?.toLocaleString('en-IN') || 'N/A'}

Instructions:
- Be concise and data-driven. Use the context above to ground your answers.
- Use ₹ for prices, % for percentages.
- Do NOT recommend buying or selling (this is a view-only terminal).
- Format numbers clearly. Keep responses under 250 words unless asked to elaborate.`
}

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`${s.msg} ${isUser ? s.userMsg : s.aiMsg}`}>
      {!isUser && <div className={s.aiLabel}>AI Analyst</div>}
      <div className={`${s.bubble} ${isUser ? s.userBubble : s.aiBubble}`}>
        {msg.content}
      </div>
      {msg.model && <div className={s.modelTag}>{msg.model}</div>}
    </div>
  )
}

function ThinkingBubble() {
  return (
    <div className={`${s.msg} ${s.aiMsg}`}>
      <div className={s.aiLabel}>AI Analyst</div>
      <div className={`${s.bubble} ${s.aiBubble} ${s.thinking}`}>
        <span/><span/><span/>
      </div>
    </div>
  )
}

export default function AISidebar() {
  const { activeSym, summary }  = useApp()
  const [open,     setOpen]     = useState(true)
  const [provider, setProvider] = useState('ollama')
  const [model,    setModel]    = useState('llama3')
  const [apiKey,   setApiKey]   = useState('')
  const [showKey,  setShowKey]  = useState(false)
  const [msgs,     setMsgs]     = useState([])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [tab,      setTab]      = useState('chat') // chat | settings
  const bottomRef = useRef(null)
  const taRef     = useRef(null)

  const activeProvider = PROVIDERS.find(p => p.id === provider) || PROVIDERS[0]

  // Scroll to bottom on new message
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, loading])

  // Reset conversation when stock changes
  useEffect(() => { setMsgs([]); setError(null) }, [activeSym])

  // Update model when provider changes
  useEffect(() => { setModel(activeProvider.models[0]) }, [provider])

  async function send(text) {
    const userText = (text || input).trim()
    if (!userText || loading) return
    const newMsgs = [...msgs, { role: 'user', content: userText }]
    setMsgs(newMsgs)
    setInput('')
    setLoading(true)
    setError(null)
    try {
      const res = await api.aiChat({
        provider, model, api_key: apiKey,
        messages: newMsgs.map(m => ({ role: m.role, content: m.content })),
        system: buildSystem(summary, activeSym),
      })
      setMsgs(prev => [...prev, {
        role: 'assistant',
        content: res.reply || 'No response received.',
        model: `${provider}/${model}`,
      }])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function onKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const pColor = activeProvider.color

  return (
    <aside className={`${s.sidebar} ${open ? s.open : s.closed}`}>

      {/* Collapse toggle */}
      <button className={s.toggle} onClick={() => setOpen(o => !o)}
        style={{ '--p': pColor }}>
        {open ? (
          <svg viewBox="0 0 10 16" width="10" fill="none">
            <path d="M7 2L3 8L7 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <div className={s.closedLabel} style={{ color: pColor }}>
            <svg viewBox="0 0 10 16" width="10" fill="none">
              <path d="M3 2L7 8L3 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>AI</span>
          </div>
        )}
      </button>

      {open && (
        <div className={s.inner}>

          {/* Header */}
          <div className={s.head}>
            <div className={s.headLeft}>
              <div className={s.headIcon} style={{ background: pColor }}>
                <svg viewBox="0 0 14 14" fill="none" width="14">
                  <circle cx="7" cy="7" r="3" fill="#000"/>
                  <path d="M7 1v2M7 11v2M1 7h2M11 7h2M3 3l1.4 1.4M9.6 9.6L11 11M3 11l1.4-1.4M9.6 4.4L11 3"
                    stroke="#000" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <div className={s.headTitle}>AI Analyst</div>
                <div className={s.headSub} style={{ color: pColor }}>
                  {activeProvider.name} · {model}
                </div>
              </div>
            </div>
            <div className={s.headTabs}>
              <button className={`${s.htab} ${tab==='chat'?s.htabOn:''}`} onClick={()=>setTab('chat')}>Chat</button>
              <button className={`${s.htab} ${tab==='settings'?s.htabOn:''}`} onClick={()=>setTab('settings')}>⚙</button>
            </div>
          </div>

          {/* Context badge */}
          {summary && (
            <div className={s.ctxBadge} style={{ borderColor: `${pColor}33`, background: `${pColor}08` }}>
              <span className={s.ctxDot} style={{ background: pColor }}/>
              <span>Analysing <strong style={{ color: pColor }}>{activeSym}</strong> — {summary.name}</span>
            </div>
          )}

          {tab === 'settings' ? (
            <div className={s.settings}>
              <div className={s.settingSection}>
                <div className={s.settingLabel}>Provider</div>
                <div className={s.providerGrid}>
                  {PROVIDERS.map(p => (
                    <button key={p.id}
                      className={`${s.provBtn} ${provider===p.id ? s.provOn : ''}`}
                      style={provider===p.id ? { '--c': p.color, borderColor: p.color, background: `${p.color}10` } : {}}
                      onClick={() => setProvider(p.id)}>
                      <span className={s.provName} style={provider===p.id ? {color:p.color} : {}}>{p.name}</span>
                      <span className={s.provTag}>{p.tag}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className={s.settingSection}>
                <div className={s.settingLabel}>Model</div>
                <select className={s.modelSel} value={model} onChange={e=>setModel(e.target.value)}>
                  {activeProvider.models.map(m=>(
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {activeProvider.needsKey && (
                <div className={s.settingSection}>
                  <div className={s.settingLabelRow}>
                    <span className={s.settingLabel}>API Key</span>
                    <button className={s.toggleKey} onClick={()=>setShowKey(v=>!v)}>
                      {showKey ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <input
                    className={s.keyInput}
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={e=>setApiKey(e.target.value)}
                    placeholder={`${activeProvider.name} API key…`}
                  />
                  <div className={s.keyHint}>Or set env var on backend (e.g. ANTHROPIC_API_KEY)</div>
                </div>
              )}

              {provider === 'ollama' && (
                <div className={s.settingSection}>
                  <div className={s.ollamaNote}>
                    <span className={s.noteDot}/>
                    <span>Ollama must be running at <code>http://ollama:11434</code>. Pull a model with <code>ollama pull llama3</code></span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Messages */}
              <div className={s.messages}>
                {msgs.length === 0 && (
                  <div className={s.empty}>
                    <div className={s.emptyIcon} style={{ color: pColor }}>◎</div>
                    <div className={s.emptyTitle}>Market Intelligence</div>
                    <div className={s.emptyText}>
                      Ask anything about {activeSym || 'a stock'} — technical analysis, fundamentals, or risk.
                    </div>
                    <div className={s.quickGrid}>
                      {QUICK_PROMPTS.map(q => (
                        <button key={q.text} className={s.quick}
                          style={{ '--pc': pColor }}
                          onClick={() => send(q.text)}>
                          <span className={s.quickIcon}>{q.icon}</span>
                          <span>{q.text}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {msgs.map((m, i) => <Message key={i} msg={m} />)}
                {loading && <ThinkingBubble />}
                {error && (
                  <div className={s.errMsg}>
                    <span>⚠</span> {error}
                    {error.includes('pull') || error.includes('model') ? (
                      <div className={s.errHint}>Try: <code>ollama pull {model}</code></div>
                    ) : null}
                  </div>
                )}
                <div ref={bottomRef}/>
              </div>

              {/* Input bar */}
              <div className={s.inputArea}>
                {msgs.length > 0 && (
                  <button className={s.clearBtn} onClick={() => { setMsgs([]); setError(null) }}>
                    Clear conversation
                  </button>
                )}
                <div className={s.inputRow}>
                  <textarea
                    ref={taRef}
                    className={s.input}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={onKey}
                    placeholder="Ask about this stock…  (Enter to send)"
                    rows={2}
                  />
                  <button
                    className={s.send}
                    style={{ background: pColor, opacity: (!input.trim() || loading) ? .4 : 1 }}
                    onClick={() => send()}
                    disabled={!input.trim() || loading}>
                    <svg viewBox="0 0 16 16" width="14" fill="none">
                      <path d="M14 8L2 2L5.5 8L2 14L14 8Z" fill="#000"/>
                    </svg>
                  </button>
                </div>
                <div className={s.inputHint}>
                  <span style={{ color: pColor }}>●</span> {activeProvider.name} · {model}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </aside>
  )
}
