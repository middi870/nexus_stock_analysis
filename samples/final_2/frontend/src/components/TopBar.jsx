import { useState, useRef, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { fmt, sign, cls } from '../api.js'

const NAV = [
  { id:'chart',    label:'Chart',    icon:'📈' },
  { id:'screener', label:'Screener', icon:'🔍' },
  { id:'heatmap',  label:'Heatmap',  icon:'🟩' },
  { id:'compare',  label:'Compare',  icon:'⚖️' },
]

export default function TopBar({ onSearch }) {
  const { tab, setTab, companies, selectSymbol, movers } = useApp()
  const [query,   setQuery  ] = useState('')
  const [focused, setFocused] = useState(false)
  const [results, setResults] = useState([])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const q = query.toLowerCase()
    setResults(
      companies
        .filter(c => c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q))
        .slice(0, 8)
    )
  }, [query, companies])

  const pick = sym => { selectSymbol(sym); setQuery(''); setResults([]); setFocused(false) }

  return (
    <header style={{
      height: 'var(--topbar-h)',
      background: 'var(--s1)',
      borderBottom: '1px solid var(--b1)',
      display: 'flex', alignItems: 'center',
      padding: '0 14px', gap: 16, flexShrink: 0, zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
        <svg width="20" height="20" viewBox="0 0 32 32">
          <rect width="32" height="32" rx="6" fill="#0F1220"/>
          <polyline points="4,22 10,14 16,18 22,8 28,12"
            stroke="#10B981" strokeWidth="2.5" fill="none"
            strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span style={{ fontFamily:'var(--display)', fontWeight:700, fontSize:14,
          color:'var(--t1)', letterSpacing:'.08em' }}>NEXUS</span>
        <span style={{ fontSize:9, color:'var(--t4)', fontFamily:'var(--mono)',
          background:'var(--s3)', border:'1px solid var(--b2)', borderRadius:3,
          padding:'1px 5px', letterSpacing:'.05em' }}>NSE</span>
      </div>

      {/* Nav */}
      <nav style={{ display:'flex', gap:2 }}>
        {NAV.map(n => (
          <button key={n.id}
            className={`tab ${tab===n.id?'active':''}`}
            onClick={() => setTab(n.id)}
            style={{ display:'flex', alignItems:'center', gap:5, fontSize:11 }}
          >
            <span style={{ fontSize:10 }}>{n.icon}</span>{n.label}
          </button>
        ))}
      </nav>

      {/* Live ticker strip */}
      {movers && (
        <div style={{
          flex:1, display:'flex', gap:16, overflow:'hidden',
          fontSize:11, fontFamily:'var(--mono)',
        }}>
          {[...movers.gainers.slice(0,3), ...movers.losers.slice(0,3)].map(m => (
            <span key={m.symbol} style={{
              flexShrink:0,
              color: m.change_pct >= 0 ? 'var(--g)' : 'var(--r)',
            }}>
              {m.symbol}&nbsp;
              <span style={{ fontWeight:500 }}>{sign(m.change_pct)}</span>
            </span>
          ))}
        </div>
      )}

      {/* Search */}
      <div style={{ position:'relative', flexShrink:0 }}>
        <input className="input"
          style={{ width:200, paddingLeft:30, fontSize:12 }}
          placeholder="Search symbol or company…"
          value={query}
          onChange={e => { setQuery(e.target.value); onSearch?.(e.target.value) }}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
        />
        {/* Search icon */}
        <svg style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}
          width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="var(--t3)" strokeWidth="2.5" strokeLinecap="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>

        {/* Dropdown */}
        {focused && results.length > 0 && (
          <div style={{
            position:'absolute', top:'calc(100% + 6px)', right:0,
            width:280, background:'var(--s2)', border:'1px solid var(--b2)',
            borderRadius:'var(--rr2)', overflow:'hidden', zIndex:200,
            boxShadow:'0 12px 40px rgba(0,0,0,.55)',
          }}>
            {results.map(c => (
              <div key={c.symbol}
                style={{
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                  padding:'9px 12px', cursor:'pointer',
                  borderBottom:'1px solid var(--b1)', transition:'background .1s',
                }}
                onMouseDown={() => pick(c.symbol)}
                onMouseEnter={e => e.currentTarget.style.background='var(--s3)'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}
              >
                <div>
                  <div style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--g)', fontWeight:500 }}>
                    {c.symbol}
                  </div>
                  <div style={{ fontSize:10, color:'var(--t3)', marginTop:1 }}>{c.name}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--t1)' }}>
                    ₹{fmt(c.close)}
                  </div>
                  <div className={cls(c.change_pct)} style={{ fontSize:11, fontFamily:'var(--mono)' }}>
                    {sign(c.change_pct)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </header>
  )
}
