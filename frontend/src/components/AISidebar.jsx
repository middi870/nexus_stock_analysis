import { useState, useRef, useEffect, useCallback } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { streamAI, api, fmt, sign } from '../api.js'

const PROVIDERS = [
  { id:'ollama',     name:'Ollama',    tag:'Local · Free',  color:'#22D3EE', models:['llama3','llama3.1','mistral','gemma2','phi3','codellama'], needsKey:false },
  { id:'anthropic',  name:'Anthropic', tag:'Claude',        color:'#FFB930', models:['claude-sonnet-4-5','claude-opus-4-5','claude-haiku-4-5-20251001'], needsKey:true },
  { id:'openai',     name:'OpenAI',    tag:'GPT',           color:'#34D399', models:['gpt-4o','gpt-4o-mini','gpt-4-turbo'], needsKey:true },
  { id:'openrouter', name:'OpenRouter',tag:'Multi-model',   color:'#A78BFA', models:['meta-llama/llama-3-8b-instruct','anthropic/claude-3.5-sonnet','openai/gpt-4o','google/gemini-flash-1.5'], needsKey:true },
]

const QUICK = [
  { icon:'📊', text:'Summarise this stock technically in 3 bullet points' },
  { icon:'🎯', text:'What are the key support and resistance levels to watch?' },
  { icon:'⚠️', text:'What are the main risks for this stock right now?' },
  { icon:'📈', text:'Is the RSI signalling buy or sell pressure?' },
  { icon:'💡', text:'What does the MACD histogram tell us about momentum?' },
  { icon:'🔄', text:'How does volatility compare to its sector average?' },
]

function buildSystem(summary) {
  if (!summary) return 'You are a professional equity analyst. Be concise and data-driven.'
  return `You are a senior equity analyst on the NEXUS market intelligence terminal.

Active Stock: ${summary.symbol} | ${summary.name} | Sector: ${summary.sector}
Price: ₹${fmt(summary.close)} | Change: ${sign(summary.change_pct)} | Prev Close: ₹${fmt(summary.prev_close)}
52W High: ₹${fmt(summary.week52_high)} | 52W Low: ₹${fmt(summary.week52_low)}
1Y Return: ${sign(summary.total_return_pct)} | Ann. Volatility: ${summary.volatility_pct}%
RSI(14): ${summary.rsi ?? 'N/A'} | MACD: ${summary.macd ?? 'N/A'} | Stoch %K: ${summary.stoch_k ?? 'N/A'}
P/E: ${summary.pe ?? 'N/A'}× | P/B: ${summary.pb ?? 'N/A'}× | Div Yield: ${summary.div_yield ?? 0}%
Market Cap: ₹${summary.mktcap ?? 'N/A'}L Cr | Avg Volume: ${summary.avg_volume?.toLocaleString('en-IN') ?? 'N/A'}
ATR(14): ${summary.atr ?? 'N/A'} | BB Width: ${summary.bb_width ?? 'N/A'}%

Rules:
- Be concise and data-driven. Ground answers in the numbers above.
- Use ₹ for prices, % for percentages.
- Do NOT recommend buying or selling — this is a read-only analysis terminal.
- Keep responses under 250 words unless elaboration is explicitly requested.
- Format lists with dashes, not numbers.`
}

function Bubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{
      display:'flex', flexDirection:'column',
      alignItems: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 10,
    }}>
      {!isUser && (
        <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:3 }}>
          <div style={{ width:5, height:5, borderRadius:'50%', background:'var(--amber)' }}/>
          <span style={{ fontSize:9, color:'var(--t3)', fontFamily:'var(--mono)', textTransform:'uppercase', letterSpacing:'.06em' }}>
            AI {msg.streaming && '●'}
          </span>
        </div>
      )}
      <div style={{
        maxWidth:'90%', padding:'8px 11px',
        background: isUser ? 'var(--gd)' : 'var(--s3)',
        border: `1px solid ${isUser ? 'rgba(0,229,160,.25)' : 'var(--b2)'}`,
        borderRadius: isUser ? '10px 10px 2px 10px' : '2px 10px 10px 10px',
        fontSize: 12, lineHeight: 1.6, color: 'var(--t1)',
        fontFamily: 'var(--ui)', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>
        {msg.content}
        {msg.streaming && (
          <span style={{
            display:'inline-block', width:2, height:12,
            background:'var(--amber)', marginLeft:2, verticalAlign:'middle',
            animation:'blink .7s step-end infinite',
          }}/>
        )}
      </div>
      {msg.model && !msg.streaming && (
        <div style={{ fontSize:9, color:'var(--t4)', marginTop:2, fontFamily:'var(--mono)' }}>{msg.model}</div>
      )}
    </div>
  )
}

export default function AISidebar() {
  const { activeSym, summary } = useApp()
  const [open,      setOpen     ] = useState(true)
  const [provider,  setProvider ] = useState('ollama')
  const [model,     setModel    ] = useState('llama3')
  const [apiKey,    setApiKey   ] = useState('')
  const [showKey,   setShowKey  ] = useState(false)
  const [msgs,      setMsgs     ] = useState([])
  const [input,     setInput    ] = useState('')
  const [streaming, setStreaming ] = useState(false)
  const [convId,    setConvId   ] = useState(null)
  const [err,       setErr      ] = useState(null)
  const bottomRef  = useRef(null)
  const stopRef    = useRef(null)
  const inputRef   = useRef(null)

  const activeProvider = PROVIDERS.find(p => p.id === provider) || PROVIDERS[0]

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' })
  }, [msgs])

  // New chat when symbol changes
  useEffect(() => {
    setMsgs([])
    setConvId(null)
    setErr(null)
  }, [activeSym])

  const send = useCallback((text) => {
    const content = (text || input).trim()
    if (!content || streaming) return

    setInput('')
    setErr(null)
    const userMsg = { role:'user', content }
    const aiMsg   = { role:'assistant', content:'', streaming:true, model:`${provider}/${model}` }

    setMsgs(prev => [...prev, userMsg, aiMsg])
    setStreaming(true)

    const allMsgs = [...msgs, userMsg]

    stopRef.current = streamAI(
      {
        provider, model,
        messages:        allMsgs,
        system:          buildSystem(summary),
        api_key:         apiKey,
        symbol:          activeSym,
        conversation_id: convId,
      },
      // onChunk
      chunk => {
        setMsgs(prev => {
          const next = [...prev]
          const last = next[next.length - 1]
          if (last?.streaming) next[next.length - 1] = { ...last, content: last.content + chunk }
          return next
        })
      },
      // onConvId
      id => setConvId(id),
      // onDone
      () => {
        setMsgs(prev => {
          const next = [...prev]
          const last = next[next.length - 1]
          if (last?.streaming) next[next.length - 1] = { ...last, streaming:false }
          return next
        })
        setStreaming(false)
      },
      // onError
      e => {
        setErr(e.message)
        setMsgs(prev => prev.slice(0, -1))
        setStreaming(false)
      },
    )
  }, [input, streaming, msgs, provider, model, apiKey, summary, activeSym, convId])

  const stop = () => {
    stopRef.current?.()
    setStreaming(false)
    setMsgs(prev => {
      const next = [...prev]
      const last = next[next.length - 1]
      if (last?.streaming) next[next.length - 1] = { ...last, streaming:false }
      return next
    })
  }

  const clearChat = () => {
    setMsgs([])
    setConvId(null)
    setErr(null)
  }

  return (
    <aside className="ai-sidebar-shell" style={{
      width: open ? 'var(--ai-w)' : 36,
      flexShrink: 0,
      borderLeft: '1px solid var(--b1)',
      background: 'var(--s1)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      transition: 'width .22s ease',
    }}>
      {/* Toggle + Header */}
      <div style={{
        display:'flex', alignItems:'center', padding:'0 10px',
        height:36, borderBottom:'1px solid var(--b1)', flexShrink:0, gap:6,
      }}>
        <button onClick={() => setOpen(p=>!p)}
          style={{
            background:'none', border:'none', cursor:'pointer',
            color:'var(--amber)', fontSize:14, lineHeight:1, padding:2,
            flexShrink:0,
          }}
          title={open?'Collapse AI':'Expand AI'}
        >
          {open ? '⟫' : '⟪'}
        </button>

        {open && <>
          <span style={{
            fontFamily:'var(--display)', fontSize:12, fontWeight:700,
            color:'var(--amber)', letterSpacing:'.06em', textTransform:'uppercase',
          }}>AI Analyst</span>
          {activeSym && (
            <span style={{ fontSize:10, color:'var(--t3)', fontFamily:'var(--mono)', marginLeft:2 }}>
              · {activeSym}
            </span>
          )}
          {msgs.length > 0 && (
            <button onClick={clearChat}
              style={{
                marginLeft:'auto', background:'none', border:'none', cursor:'pointer',
                fontSize:10, color:'var(--t3)', padding:'2px 6px',
              }}
              title="Clear conversation"
            >✕ Clear</button>
          )}
        </>}
      </div>

      {open && (
        <>
          {/* Provider selector */}
          <div style={{
            padding:'8px 10px', borderBottom:'1px solid var(--b1)', flexShrink:0,
          }}>
            <div style={{ display:'flex', gap:4, marginBottom:6 }}>
              {PROVIDERS.map(p => (
                <button key={p.id}
                  onClick={() => { setProvider(p.id); setModel(p.models[0]) }}
                  style={{
                    flex:1, padding:'3px 0', border:'1px solid',
                    borderColor: provider===p.id ? p.color : 'var(--b2)',
                    borderRadius:'var(--rr)', cursor:'pointer', fontSize:9,
                    fontFamily:'var(--mono)', fontWeight:600, letterSpacing:'.03em',
                    background: provider===p.id ? `${p.color}18` : 'transparent',
                    color: provider===p.id ? p.color : 'var(--t3)',
                    transition:'all .15s',
                  }}
                >{p.name}</button>
              ))}
            </div>

            {/* Model dropdown */}
            <select className="input" style={{ marginBottom: activeProvider.needsKey ? 6 : 0 }}
              value={model} onChange={e => setModel(e.target.value)}>
              {activeProvider.models.map(m => <option key={m}>{m}</option>)}
            </select>

            {/* API key */}
            {activeProvider.needsKey && (
              <div style={{ position:'relative' }}>
                <input
                  className="input"
                  type={showKey ? 'text' : 'password'}
                  placeholder={`${activeProvider.name} API key`}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  style={{ paddingRight:30 }}
                />
                <button onClick={() => setShowKey(p=>!p)}
                  style={{
                    position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
                    background:'none', border:'none', cursor:'pointer',
                    fontSize:11, color:'var(--t3)',
                  }}
                >{showKey?'🙈':'👁'}</button>
              </div>
            )}
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:'auto', padding:'10px 10px 4px' }}>
            {msgs.length === 0 && (
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:10, color:'var(--t3)', textTransform:'uppercase',
                  letterSpacing:'.08em', marginBottom:8, fontFamily:'var(--mono)' }}>
                  Quick prompts
                </div>
                {QUICK.map((q,i) => (
                  <button key={i}
                    onClick={() => send(q.text)}
                    style={{
                      display:'block', width:'100%', textAlign:'left',
                      padding:'6px 8px', marginBottom:4, cursor:'pointer',
                      background:'var(--s2)', border:'1px solid var(--b2)',
                      borderRadius:'var(--rr)', fontSize:11, color:'var(--t2)',
                      fontFamily:'var(--ui)', transition:'all .12s', lineHeight:1.4,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background='var(--s3)'; e.currentTarget.style.borderColor='var(--b3)' }}
                    onMouseLeave={e => { e.currentTarget.style.background='var(--s2)'; e.currentTarget.style.borderColor='var(--b2)' }}
                  >
                    <span style={{ marginRight:6 }}>{q.icon}</span>{q.text}
                  </button>
                ))}
              </div>
            )}

            {msgs.map((m,i) => <Bubble key={i} msg={m}/>)}

            {err && (
              <div style={{
                background:'var(--rd)', border:'1px solid rgba(255,61,90,.3)',
                borderRadius:'var(--rr)', padding:'7px 10px',
                fontSize:11, color:'var(--r)', fontFamily:'var(--mono)', marginBottom:6,
              }}>{err}</div>
            )}

            <div ref={bottomRef}/>
          </div>

          {/* Input */}
          <div style={{
            padding:'8px 10px', borderTop:'1px solid var(--b1)', flexShrink:0,
            display:'flex', flexDirection:'column', gap:6,
          }}>
            <div style={{ display:'flex', gap:6 }}>
              <textarea
                ref={inputRef}
                className="input"
                rows={2}
                placeholder={`Ask about ${activeSym || 'a stock'}…`}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send() }
                }}
                style={{ resize:'none', flex:1, lineHeight:1.5 }}
              />
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                <button
                  onClick={streaming ? stop : send}
                  style={{
                    width:34, height:34, borderRadius:'var(--rr)',
                    border:`1px solid ${streaming ? 'var(--r)' : 'var(--g)'}`,
                    background: streaming ? 'var(--rd)' : 'var(--gd)',
                    color: streaming ? 'var(--r)' : 'var(--g)',
                    cursor:'pointer', fontSize:14, display:'flex',
                    alignItems:'center', justifyContent:'center',
                    transition:'all .15s',
                  }}
                  title={streaming?'Stop':'Send (Enter)'}
                >{streaming ? '■' : '↑'}</button>
              </div>
            </div>

            {convId && (
              <div style={{ fontSize:9, color:'var(--t4)', fontFamily:'var(--mono)', textAlign:'center' }}>
                Thread: {convId.slice(0,8)}…
              </div>
            )}
          </div>
        </>
      )}

      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </aside>
  )
}
