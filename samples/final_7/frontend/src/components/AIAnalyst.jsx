/**
 * AIAnalyst — AI-generated stock report card.
 * Calls /ai/analyze/{symbol} with user-selected provider + key.
 * Shows: signal pill, summary, technicals, risks, outlook.
 * 15-min cache on the server side.
 */
import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { api } from '../api.js'
import { IcoActivity, IcoRefresh, IcoInfo } from '../icons.jsx'

const PROVIDERS = [
  { id:'anthropic',  name:'Claude',    needsKey:true  },
  { id:'openai',     name:'GPT-4o',    needsKey:true  },
  { id:'openrouter', name:'OpenRouter',needsKey:true  },
]

const MODELS = {
  anthropic:  'claude-haiku-4-5-20251001',
  openai:     'gpt-4o-mini',
  openrouter: 'meta-llama/llama-3-8b-instruct',
}

const SIGNAL_STYLE = {
  BUY:  { bg:'var(--green-bg)',  border:'var(--green-bd)',  text:'var(--green)',  label:'BUY'  },
  HOLD: { bg:'var(--amber-bg)',  border:'rgba(245,158,11,.3)', text:'var(--amber)', label:'HOLD' },
  SELL: { bg:'var(--red-bg)',    border:'var(--red-bd)',    text:'var(--red)',    label:'SELL' },
}

function SignalBadge({ signal, confidence }) {
  const s = SIGNAL_STYLE[signal] || SIGNAL_STYLE.HOLD
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <span style={{
        fontFamily:'var(--mono)', fontSize:18, fontWeight:800,
        color:s.text, background:s.bg, border:`1px solid ${s.border}`,
        padding:'4px 16px', borderRadius:'var(--rr2)',
        letterSpacing:'.08em',
      }}>{s.label}</span>
      <span style={{
        fontSize:10, color:'var(--t3)', fontFamily:'var(--mono)',
        background:'var(--s3)', padding:'2px 8px', borderRadius:4,
      }}>{confidence} confidence</span>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ fontSize:9, color:'var(--t3)', textTransform:'uppercase',
        letterSpacing:'.1em', fontFamily:'var(--mono)', marginBottom:6 }}>{title}</div>
      {children}
    </div>
  )
}

export default function AIAnalyst({ symbol }) {
  const [report,   setReport  ] = useState(null)
  const [loading,  setLoading ] = useState(false)
  const [error,    setError   ] = useState(null)
  const [provider, setProvider] = useState('anthropic')
  const [apiKey,   setApiKey  ] = useState('')
  const [showKey,  setShowKey ] = useState(false)
  const [ts,       setTs      ] = useState(null)   // trigger

  const run = () => {
    if (!symbol) return
    setLoading(true); setError(null)
    api.analyze(symbol, { provider, model: MODELS[provider], api_key: apiKey })
      .then(r  => { setReport(r); setLoading(false) })
      .catch(e => { setError(e.message || 'Analysis failed'); setLoading(false) })
  }

  // Run when symbol changes if we already have a report
  useEffect(() => {
    if (report) { setReport(null) }
  }, [symbol])

  const needsKey = PROVIDERS.find(p => p.id === provider)?.needsKey

  return (
    <div style={{
      background:'var(--s1)', border:'1px solid var(--b1)',
      borderRadius:'var(--rr2)', overflow:'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding:'10px 14px', borderBottom:'1px solid var(--b1)',
        display:'flex', alignItems:'center', gap:8, flexWrap:'wrap',
      }}>
        <IcoActivity size={13} stroke="var(--t2)"/>
        <span style={{ fontWeight:700, fontSize:12, color:'var(--t1)' }}>AI Analyst</span>
        <span style={{ fontSize:9, color:'var(--t4)', fontFamily:'var(--mono)',
          background:'var(--s3)', padding:'2px 7px', borderRadius:3 }}>
          {symbol}
        </span>
        <div style={{ display:'flex', gap:4, marginLeft:'auto', alignItems:'center' }}>
          {/* Provider selector */}
          {PROVIDERS.map(p => (
            <button key={p.id}
              style={{
                padding:'3px 8px', borderRadius:4, border:'1px solid',
                fontSize:9, fontFamily:'var(--mono)', cursor:'pointer', fontWeight:600,
                borderColor: provider===p.id ? 'rgba(34,197,94,.4)' : 'var(--b2)',
                background:  provider===p.id ? 'var(--green-bg)' : 'transparent',
                color:       provider===p.id ? 'var(--green)'    : 'var(--t3)',
              }}
              onClick={() => setProvider(p.id)}>
              {p.name}
            </button>
          ))}
          {report && (
            <button className="btn-icon" onClick={() => { setReport(null); run() }}>
              <IcoRefresh size={13}/>
            </button>
          )}
        </div>
      </div>

      {/* API key input */}
      {needsKey && !report && (
        <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--b1)',
          display:'flex', gap:8, alignItems:'center' }}>
          <div style={{ position:'relative', flex:1 }}>
            <input
              type={showKey ? 'text' : 'password'}
              className="input"
              placeholder={`${PROVIDERS.find(p=>p.id===provider)?.name} API key`}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && run()}
              style={{ paddingRight:32, fontSize:11 }}
            />
            <button onClick={() => setShowKey(p => !p)}
              style={{ position:'absolute', right:8, top:'50%',
                transform:'translateY(-50%)', background:'none',
                border:'none', cursor:'pointer', color:'var(--t3)', fontSize:12 }}>
              {showKey ? '🙈' : '👁'}
            </button>
          </div>
          <button className="btn btn-primary" onClick={run} disabled={!apiKey.trim()}>
            Analyse
          </button>
        </div>
      )}

      {/* Content */}
      <div style={{ padding:'14px' }}>

        {/* Loading */}
        {loading && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
            gap:10, padding:'20px 0' }}>
            <div className="spinner" style={{ width:24, height:24 }}/>
            <div style={{ fontSize:11, color:'var(--t3)', fontFamily:'var(--mono)' }}>
              Analysing {symbol}… this takes 5-10 seconds
            </div>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div style={{ padding:'10px 12px', background:'var(--red-bg)',
            border:'1px solid var(--red-bd)', borderRadius:'var(--rr)',
            fontSize:11, color:'var(--red)', fontFamily:'var(--mono)',
            lineHeight:1.5 }}>
            {error}
          </div>
        )}

        {/* No report yet */}
        {!report && !loading && !error && (
          <div style={{ textAlign:'center', padding:'24px 0',
            color:'var(--t4)', fontFamily:'var(--mono)', fontSize:11 }}>
            {needsKey
              ? 'Enter your API key above and click Analyse'
              : <button className="btn btn-primary" onClick={run}>Generate Report</button>
            }
          </div>
        )}

        {/* Report */}
        {report && !loading && (<>
          {/* Signal */}
          <div style={{ marginBottom:16 }}>
            <SignalBadge signal={report.signal} confidence={report.confidence}/>
          </div>

          <Section title="Summary">
            <p style={{ fontSize:12, color:'var(--t2)', lineHeight:1.7 }}>
              {report.summary}
            </p>
          </Section>

          {report.technicals && (
            <Section title="Technical Picture">
              <div style={{ display:'grid', gap:6 }}>
                {[
                  { label:'Trend',      val:report.technicals.trend      },
                  { label:'Momentum',   val:report.technicals.momentum   },
                  { label:'Volatility', val:report.technicals.volatility },
                ].map(row => (
                  <div key={row.label} style={{
                    display:'flex', gap:8, padding:'7px 10px',
                    background:'var(--s2)', borderRadius:'var(--rr)',
                    alignItems:'flex-start',
                  }}>
                    <span style={{ fontSize:9, color:'var(--t3)', fontFamily:'var(--mono)',
                      textTransform:'uppercase', letterSpacing:'.06em',
                      flexShrink:0, width:70, paddingTop:2 }}>{row.label}</span>
                    <span style={{ fontSize:11, color:'var(--t1)', lineHeight:1.5 }}>
                      {row.val}
                    </span>
                  </div>
                ))}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                  {[
                    { label:'Support',    val:`₹${report.technicals.support}`,    color:'var(--red)'   },
                    { label:'Resistance', val:`₹${report.technicals.resistance}`, color:'var(--green)' },
                  ].map(row => (
                    <div key={row.label} style={{
                      padding:'8px 12px', background:'var(--s2)', borderRadius:'var(--rr)',
                      borderLeft:`3px solid ${row.color}`,
                    }}>
                      <div style={{ fontSize:9, color:'var(--t3)',
                        textTransform:'uppercase', letterSpacing:'.06em', marginBottom:3 }}>
                        {row.label}
                      </div>
                      <div style={{ fontFamily:'var(--mono)', fontSize:14,
                        fontWeight:700, color:row.color }}>{row.val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Section>
          )}

          {report.fundamentals && (
            <Section title="Fundamentals">
              <p style={{ fontSize:11, color:'var(--t2)', lineHeight:1.6 }}>
                {report.fundamentals}
              </p>
            </Section>
          )}

          {report.risks?.length > 0 && (
            <Section title="Key Risks">
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                {report.risks.map((r, i) => (
                  <div key={i} style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                    <span style={{ color:'var(--red)', fontSize:10,
                      flexShrink:0, marginTop:1 }}>▪</span>
                    <span style={{ fontSize:11, color:'var(--t2)', lineHeight:1.5 }}>{r}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {report.outlook && (
            <Section title="30-Day Outlook">
              <p style={{ fontSize:12, color:'var(--t1)', lineHeight:1.7,
                fontWeight:500 }}>
                {report.outlook}
              </p>
            </Section>
          )}

          {/* Disclaimer */}
          <div style={{ marginTop:12, padding:'8px 10px',
            background:'var(--s2)', borderRadius:'var(--rr)',
            fontSize:9, color:'var(--t4)', lineHeight:1.5,
            display:'flex', gap:6, alignItems:'flex-start' }}>
            <IcoInfo size={11} stroke="var(--t4)" style={{ flexShrink:0, marginTop:1 }}/>
            {report.disclaimer}
          </div>

          {report.generated_at && (
            <div style={{ marginTop:8, fontSize:8, color:'var(--t4)',
              fontFamily:'var(--mono)', textAlign:'right' }}>
              Generated {report.generated_at}
            </div>
          )}
        </>)}
      </div>
    </div>
  )
}
