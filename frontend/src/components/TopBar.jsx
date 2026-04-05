import { useState, useRef, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { fmt, sign, cls } from '../api.js'

const NAV = [
  { id: 'chart',    label: 'Chart' },
  { id: 'screener', label: 'Screener' },
  { id: 'heatmap',  label: 'Heatmap' },
  { id: 'compare',  label: 'Compare' },
]

export default function TopBar({ onSearch }) {
  const { tab, setTab, companies, selectSymbol, movers } = useApp()
  const [query,    setQuery   ] = useState('')
  const [focused,  setFocused ] = useState(false)
  const [results,  setResults ] = useState([])
  const searchRef = useRef(null)

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const q = query.toLowerCase()
    setResults(
      companies
        .filter(c => c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q))
        .slice(0, 8)
    )
  }, [query, companies])

  const pick = sym => {
    selectSymbol(sym)
    setQuery('')
    setResults([])
    setFocused(false)
  }

  return (
    <header style={{
      height: 'var(--topbar-h)',
      background: 'var(--s1)',
      borderBottom: '1px solid var(--b1)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: 20,
      flexShrink: 0,
      zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
        <svg width="22" height="22" viewBox="0 0 32 32">
          <rect width="32" height="32" rx="6" fill="#0C1120"/>
          <polyline points="4,22 10,14 16,18 22,8 28,12"
            stroke="var(--g)" strokeWidth="2.5" fill="none"
            strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span style={{ fontFamily:'var(--display)', fontWeight:700, fontSize:15, color:'var(--t1)', letterSpacing:'.04em' }}>
          NEXUS
        </span>
        <span style={{ fontSize:10, color:'var(--t3)', fontFamily:'var(--mono)', marginTop:1 }}>NSE</span>
      </div>

      {/* Nav tabs */}
      <nav style={{ display:'flex', gap:2 }}>
        {NAV.map(n => (
          <button key={n.id}
            className={`tab ${tab === n.id ? 'active' : ''}`}
            onClick={() => setTab(n.id)}
          >{n.label}</button>
        ))}
      </nav>

      {/* Movers ticker */}
      {movers && (
        <div style={{
          display:'flex', gap:16, overflow:'hidden', flex:1,
          fontSize:11, fontFamily:'var(--mono)',
        }}>
          {[...movers.gainers.slice(0,3), ...movers.losers.slice(0,3)].map(m => (
            <span key={m.symbol} style={{ flexShrink:0, color: m.change_pct >= 0 ? 'var(--g)' : 'var(--r)' }}>
              {m.symbol} {sign(m.change_pct)}
            </span>
          ))}
        </div>
      )}

      {/* Search */}
      <div ref={searchRef} style={{ position:'relative', flexShrink:0 }}>
        <input
          className="input"
          style={{ width:200, paddingLeft:28 }}
          placeholder="Search symbol or name…"
          value={query}
          onChange={e => { setQuery(e.target.value); onSearch?.(e.target.value) }}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
        />
        <svg style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}
          width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke="var(--t3)" strokeWidth="2.5" strokeLinecap="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>

        {focused && results.length > 0 && (
          <div style={{
            position:'absolute', top:'calc(100% + 4px)', right:0,
            width:280, background:'var(--s2)', border:'1px solid var(--b2)',
            borderRadius:'var(--rr2)', overflow:'hidden', zIndex:200, boxShadow:'0 8px 32px rgba(0,0,0,.5)',
          }}>
            {results.map(c => (
              <div key={c.symbol}
                style={{
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                  padding:'8px 12px', cursor:'pointer', transition:'background .1s',
                }}
                onMouseDown={() => pick(c.symbol)}
                onMouseEnter={e => e.currentTarget.style.background='var(--s3)'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}
              >
                <div>
                  <div style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--g)', fontWeight:500 }}>{c.symbol}</div>
                  <div style={{ fontSize:11, color:'var(--t3)', marginTop:1 }}>{c.name}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontFamily:'var(--mono)', fontSize:12 }}>₹{fmt(c.close)}</div>
                  <div style={{ fontSize:11 }} className={cls(c.change_pct)}>{sign(c.change_pct)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </header>
  )
}
