import { useState, useRef, useEffect, useCallback } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { streamAI, api, fmt, sign } from '../api.js'
import s from './AISidebar.module.css'

const PROVIDERS = [
  { id:'ollama',     name:'Ollama',     tag:'Local · Free',   color:'#22D3EE', models:['llama3','llama3.1','mistral','gemma2','phi3'], needsKey:false },
  { id:'anthropic',  name:'Anthropic',  tag:'Claude',         color:'#F5A623', models:['claude-sonnet-4-5','claude-opus-4-5','claude-haiku-4-5-20251001'], needsKey:true  },
  { id:'openai',     name:'OpenAI',     tag:'GPT',            color:'#34D399', models:['gpt-4o','gpt-4o-mini','gpt-4-turbo'], needsKey:true  },
  { id:'openrouter', name:'OpenRouter', tag:'Multi-model',    color:'#A78BFA', models:['meta-llama/llama-3-8b-instruct','anthropic/claude-3.5-sonnet','openai/gpt-4o','google/gemini-flash-1.5'], needsKey:true  },
]

const QUICK = [
  { icon:'📊', text:'Summarise this stock technically in 3 bullet points' },
  { icon:'🎯', text:'What are the key support and resistance levels?' },
  { icon:'⚠️', text:'What are the main risks for this stock right now?' },
  { icon:'📈', text:'Is the RSI signalling buy pressure or sell pressure?' },
  { icon:'🔄', text:'Compare this stock\'s volatility to its sector average' },
  { icon:'💡', text:'What does the MACD histogram tell us about momentum?' },
]

function buildSystem(summary, sym) {
  if (!summary) return 'You are a professional equity analyst. Be concise and data-driven.'
  return `You are a senior equity analyst on the PULSE market intelligence terminal.

Active Stock: ${summary.symbol} | ${summary.name} | Sector: ${summary.sector}
Price: ₹${fmt(summary.close)} | Change: ${sign(summary.change_pct)} | Prev Close: ₹${fmt(summary.prev_close)}
52W High: ₹${fmt(summary.week52_high)} | 52W Low: ₹${fmt(summary.week52_low)}
1Y Return: ${sign(summary.total_return_pct)} | Ann. Volatility: ${summary.volatility_pct}%
RSI(14): ${summary.rsi ?? 'N/A'} | MACD: ${summary.macd ?? 'N/A'} | Stoch %K: ${summary.stoch_k ?? 'N/A'}
P/E: ${summary.pe ?? 'N/A'}× | P/B: ${summary.pb ?? 'N/A'}× | Div Yield: ${summary.div_yield ?? 0}%
Market Cap: ₹${summary.mktcap ?? 'N/A'}L Cr | Avg Volume: ${summary.avg_volume?.toLocaleString('en-IN') ?? 'N/A'}

Rules:
- Be concise and data-driven. Ground answers in the numbers above.
- Use ₹ for prices, % for percentages.
- Do NOT recommend buying or selling — this is a read-only analysis terminal.
- Keep responses under 200 words unless elaboration is explicitly requested.
- Format lists with dashes, not numbers.`
}

function Bubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`${s.msg} ${isUser ? s.userMsg : s.aiMsg}`}>
      {!isUser && (
        <div className={s.aiTag}>
          <span className={s.aiDot}/>AI
          {msg.streaming && <span className={s.streamDot}>●</span>}
        </div>
      )}
      <div className={`${s.bubble} ${isUser ? s.uBubble : s.aBubble}`}>
        {msg.content}
        {msg.streaming && <span className={s.cursor}>▋</span>}
      </div>
      {msg.model && !msg.streaming && (
        <div className={s.msgMeta}>{msg.model}</div>
      )}
    </div>
  )
}

export default function AISidebar() {
  const { activeSym, summary } = useApp()
  const [open,      setOpen]      = useState(true)
  const [panelTab,  setPanelTab]  = useState('chat')
  const [provider,  setProvider]  = useState('ollama')
  const [model,     setModel]     = useState('llama3')
  const [apiKey,    setApiKey]    = useState('')
  const [showKey,   setShowKey]   = useState(false)
  const [msgs,      setMsgs]      = useState([])
  const [input,     setInput]     = useState('')
  const [streaming, setStreaming]  = useState(false)
  const [error,     setError]     = useState(null)
  const bottomRef  = useRef(null)
  const stopRef    = useRef(null)  // abort SSE

  const activeProvider = PROVIDERS.find(p => p.id === provider) || PROVIDERS[0]
  const pColor = activeProvider.color

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  useEffect(() => {
    setMsgs([]); setError(null)
    stopRef.current?.()
  }, [activeSym])

  useEffect(() => {
    setModel(activeProvider.models[0])
  }, [provider])

  const send = useCallback((text) => {
    const userText = (text || input).trim()
    if (!userText || streaming) return

    const history = [...msgs, { role:'user', content:userText }]
    setMsgs(history)
    setInput('')
    setStreaming(true)
    setError(null)

    // Add empty AI bubble immediately
    const aiIdx = history.length
    setMsgs(prev => [...prev, { role:'assistant', content:'', streaming:true, model:`${provider}/${model}` }])

    const stop = streamAI(
      {
        provider, model,
        messages: history.map(m => ({ role:m.role, content:m.content })),
        system:   buildSystem(summary, activeSym),
        api_key:  apiKey,
      },
      // onChunk — append to last message
      (chunk) => {
        setMsgs(prev => {
          const next = [...prev]
          next[aiIdx] = { ...next[aiIdx], content: next[aiIdx].content + chunk }
          return next
        })
      },
      // onDone
      () => {
        setMsgs(prev => {
          const next = [...prev]
          if (next[aiIdx]) next[aiIdx] = { ...next[aiIdx], streaming:false }
          return next
        })
        setStreaming(false)
        stopRef.current = null
      },
      // onError
      (e) => {
        setError(e.message)
        setMsgs(prev => {
          const next = [...prev]
          if (next[aiIdx]) next[aiIdx] = { ...next[aiIdx], streaming:false, content: next[aiIdx].content || '⚠ Error — see below' }
          return next
        })
        setStreaming(false)
        stopRef.current = null
      }
    )
    stopRef.current = stop
  }, [msgs, input, streaming, provider, model, apiKey, summary, activeSym])

  function stopStream() {
    stopRef.current?.()
    stopRef.current = null
    setStreaming(false)
    setMsgs(prev => {
      const next = [...prev]
      const last = next[next.length - 1]
      if (last?.streaming) next[next.length-1] = { ...last, streaming:false }
      return next
    })
  }

  function onKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <aside className={`${s.sidebar} ${open ? s.open : s.closed}`}>
      {/* Collapse rail */}
      <button className={s.rail} onClick={() => setOpen(o => !o)}
        style={{ '--pc': pColor }}>
        {open ? (
          <svg viewBox="0 0 10 16" width="10" fill="none">
            <path d="M7 2L3 8L7 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <div className={s.railClosed} style={{ color:pColor }}>
            <svg viewBox="0 0 10 16" width="10" fill="none">
              <path d="M3 2L7 8L3 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>AI</span>
          </div>
        )}
      </button>

      {open && (
        <div className={s.body}>
          {/* Head */}
          <div className={s.head}>
            <div className={s.headLeft}>
              <div className={s.provDot} style={{ background:pColor }}/>
              <div>
                <div className={s.headTitle}>AI Analyst</div>
                <div className={s.headSub} style={{ color:pColor }}>
                  {activeProvider.name} · {model.split('/').at(-1)}
                </div>
              </div>
            </div>
            <div className={s.headTabs}>
              <button className={`${s.htab} ${panelTab==='chat'?s.htabOn:''}`} onClick={()=>setPanelTab('chat')}>Chat</button>
              <button className={`${s.htab} ${panelTab==='cfg'?s.htabOn:''}`} onClick={()=>setPanelTab('cfg')}>⚙</button>
            </div>
          </div>

          {/* Context badge */}
          {summary && (
            <div className={s.ctx} style={{ borderColor:`${pColor}28`, background:`${pColor}06` }}>
              <span className={s.ctxDot} style={{ background:pColor }}/>
              <span>
                <strong style={{ color:pColor }}>{activeSym}</strong>
                {' '}· ₹{fmt(summary.close)}
                {' '}<span className={summary.change_pct>=0?s.up:s.dn}>{sign(summary.change_pct)}</span>
              </span>
              {summary.rsi && (
                <span className={s.ctxRsi}>
                  RSI <strong style={{ color: summary.rsi>70?'var(--r)':summary.rsi<30?'var(--g)':pColor }}>
                    {summary.rsi.toFixed(0)}
                  </strong>
                </span>
              )}
            </div>
          )}

          {panelTab === 'cfg' ? (
            <div className={s.cfg}>
              {/* Provider grid */}
              <div className={s.cfgSection}>
                <div className={s.cfgLabel}>Provider</div>
                <div className={s.provGrid}>
                  {PROVIDERS.map(p => (
                    <button key={p.id}
                      className={`${s.provCard} ${provider===p.id?s.provOn:''}`}
                      style={provider===p.id ? { borderColor:p.color, background:`${p.color}0E` } : {}}
                      onClick={() => setProvider(p.id)}>
                      <span className={s.provName} style={provider===p.id?{color:p.color}:{}}>{p.name}</span>
                      <span className={s.provTag}>{p.tag}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Model select */}
              <div className={s.cfgSection}>
                <div className={s.cfgLabel}>Model</div>
                <select className={s.cfgSel} value={model} onChange={e=>setModel(e.target.value)}>
                  {activeProvider.models.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              {/* API Key */}
              {activeProvider.needsKey && (
                <div className={s.cfgSection}>
                  <div className={s.cfgLabelRow}>
                    <span className={s.cfgLabel}>API Key</span>
                    <button className={s.showKey} onClick={() => setShowKey(v=>!v)}>
                      {showKey ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <input className={s.keyInp}
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder={`${activeProvider.name} key…`}/>
                  <div className={s.keyHint}>Or set env var on backend</div>
                </div>
              )}

              {provider === 'ollama' && (
                <div className={s.ollamaNote}>
                  <span className={s.noteDot}/>
                  Ollama must be running on your host at <code>localhost:11434</code>.
                  Pull a model first: <code>ollama pull llama3</code>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Messages */}
              <div className={s.msgs}>
                {msgs.length === 0 && (
                  <div className={s.empty}>
                    <div className={s.emptyIcon} style={{ color:pColor }}>◎</div>
                    <div className={s.emptyTitle}>Ask anything about {activeSym}</div>
                    <div className={s.quickWrap}>
                      {QUICK.map(q => (
                        <button key={q.text} className={s.quick}
                          onClick={() => send(q.text)}>
                          <span>{q.icon}</span>
                          <span>{q.text}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {msgs.map((m, i) => <Bubble key={i} msg={m}/>)}
                {error && (
                  <div className={s.errMsg}>
                    ⚠ {error}
                    {(error.includes('pull') || error.includes('model')) && (
                      <div className={s.errHint}>Run: <code>ollama pull {model}</code></div>
                    )}
                  </div>
                )}
                <div ref={bottomRef}/>
              </div>

              {/* Input */}
              <div className={s.inputArea}>
                {msgs.length > 0 && (
                  <button className={s.clearBtn}
                    onClick={() => { setMsgs([]); setError(null); stopRef.current?.() }}>
                    Clear conversation
                  </button>
                )}
                <div className={s.inputRow}>
                  <textarea
                    className={s.ta}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={onKey}
                    placeholder="Ask about this stock…"
                    rows={2}
                    disabled={streaming}
                  />
                  {streaming ? (
                    <button className={s.stopBtn} onClick={stopStream} title="Stop">
                      <svg viewBox="0 0 14 14" width="12" fill="currentColor">
                        <rect x="2" y="2" width="10" height="10" rx="1"/>
                      </svg>
                    </button>
                  ) : (
                    <button
                      className={s.sendBtn}
                      style={{ background: pColor, opacity: !input.trim() ? .35 : 1 }}
                      onClick={() => send()}
                      disabled={!input.trim()}>
                      <svg viewBox="0 0 16 16" width="13" fill="none">
                        <path d="M14 8L2 2L5.5 8L2 14L14 8Z" fill="#000"/>
                      </svg>
                    </button>
                  )}
                </div>
                <div className={s.inputMeta}>
                  <span className={s.metaDot} style={{ background:pColor }}/>
                  <span>{activeProvider.name} · {model.split('/').at(-1)}</span>
                  {streaming && <span className={s.streamLabel}>● Streaming…</span>}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </aside>
  )
}
