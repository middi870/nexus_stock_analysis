import { useState, useRef, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { fmt, sign, cls } from '../api.js'
import { IcoSearch, IcoX, IcoMenu } from '../icons.jsx'

export default function TopBar() {
  const { companies, selectSymbol, movers, activeSym, setTab, tab, setDrawerOpen } = useApp()
  const [query,   setQuery  ] = useState('')
  const [focused, setFocused] = useState(false)
  const [results, setResults] = useState([])
  const inputRef = useRef(null)

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const q = query.toLowerCase()
    setResults(companies.filter(c =>
      c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
    ).slice(0, 9))
  }, [query, companies])

  const pick = sym => { selectSymbol(sym); setQuery(''); setFocused(false) }

  return (
    <header style={{
      height:'var(--topbar-h)', flexShrink:0,
      background:'var(--s1)', borderBottom:'1px solid var(--b1)',
      display:'flex', alignItems:'center', padding:'0 14px', gap:12, zIndex:50,
    }}>
      {/* Logo */}
      <div style={{ display:'flex', alignItems:'center', gap:9, flexShrink:0 }}>
        <svg width="28" height="28" viewBox="0 0 40 40">
          <rect width="40" height="40" rx="7" fill="#11121C"/>
          <polyline points="5,28 13,17 20,22 28,10 35,15"
            stroke="#00C98A" strokeWidth="2.5" fill="none"
            strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <div>
          <div style={{ fontFamily:'var(--ui)', fontWeight:700, fontSize:14,
            letterSpacing:'.12em', color:'var(--t1)', lineHeight:1 }}>NEXUS</div>
          <div style={{ fontSize:8, color:'var(--t4)', letterSpacing:'.12em',
            fontFamily:'var(--mono)', lineHeight:1, marginTop:2 }}>NSE · LIVE</div>
        </div>
      </div>

      {/* Desktop nav tabs */}
      <nav className="tabs" style={{ display:'flex', gap:2 }}>
        {[
          { id:'chart',    label:'Chart'    },
          { id:'screener', label:'Screener' },
          { id:'heatmap',  label:'Heatmap'  },
          { id:'compare',  label:'Compare'  },
        ].map(n => (
          <button key={n.id} className={`tab ${tab===n.id?'active':''}`}
            onClick={() => setTab(n.id)}
            style={{ display:'none' }}
            // visible only on ≥640px via a wrapper below
          >{n.label}</button>
        ))}
      </nav>

      {/* Ticker strip (movers) */}
      {movers && (
        <div style={{
          flex:1, overflow:'hidden', display:'flex', gap:18,
          fontFamily:'var(--mono)', fontSize:11,
        }}>
          {[...movers.gainers.slice(0,3), ...movers.losers.slice(0,3)].map(m => (
            <button key={m.symbol}
              onClick={() => pick(m.symbol)}
              style={{
                flexShrink:0, background:'none', border:'none', cursor:'pointer', padding:0,
                color: m.change_pct >= 0 ? 'var(--g)' : 'var(--r)',
                fontFamily:'var(--mono)', fontSize:11,
              }}
            >
              {m.symbol} <strong>{sign(m.change_pct)}</strong>
            </button>
          ))}
        </div>
      )}

      {/* Search — hidden on mobile (<640px) */}
      <div className="topbar-search" style={{ position:'relative', flexShrink:0, display:'none' }}>
        <div style={{ position:'relative' }}>
          <span style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)',
            color:'var(--t3)', pointerEvents:'none', display:'flex' }}>
            <IcoSearch width={13} height={13}/>
          </span>
          <input
            ref={inputRef}
            className="input"
            style={{ width:210, paddingLeft:30, paddingRight: query ? 28 : 10 }}
            placeholder="Search symbol or name…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 160)}
          />
          {query && (
            <button onClick={() => setQuery('')}
              style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
                background:'none', border:'none', cursor:'pointer', color:'var(--t3)',
                display:'flex', padding:2 }}>
              <IcoX width={12} height={12}/>
            </button>
          )}
        </div>

        {/* Results dropdown */}
        {focused && results.length > 0 && (
          <div style={{
            position:'absolute', top:'calc(100% + 6px)', right:0,
            width:300, background:'var(--s2)', border:'1px solid var(--b2)',
            borderRadius:'var(--rr2)', overflow:'hidden', zIndex:200,
            boxShadow:'0 16px 48px rgba(0,0,0,.6)',
          }}>
            {results.map(c => (
              <div key={c.symbol}
                style={{
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                  padding:'9px 13px', cursor:'pointer',
                  borderBottom:'1px solid var(--b1)', transition:'background .1s',
                }}
                onMouseDown={() => pick(c.symbol)}
                onMouseEnter={e => e.currentTarget.style.background='var(--s3)'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}
              >
                <div>
                  <div style={{ fontFamily:'var(--mono)', fontSize:12,
                    fontWeight:600, color:'var(--g)' }}>{c.symbol}</div>
                  <div style={{ fontSize:11, color:'var(--t3)', marginTop:1 }}>{c.name}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--t1)' }}>
                    ₹{fmt(c.close)}
                  </div>
                  <div className={cls(c.change_pct)}
                    style={{ fontFamily:'var(--mono)', fontSize:11 }}>
                    {sign(c.change_pct)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mobile search button */}
      <button
        onClick={() => setDrawerOpen(true)}
        className="topbar-mobile-btn"
        style={{
          display:'none', background:'none', border:'none', cursor:'pointer',
          color:'var(--t2)', padding:6,
        }}
      >
        <IcoSearch width={18} height={18}/>
      </button>

      {/* Inline style for responsive nav + mobile btn */}
      <style>{`
        @media (min-width:640px) {
          nav.tabs button { display:flex !important; }
          .topbar-search  { display:flex !important; }
        }
        @media (max-width:639px) {
          .topbar-mobile-btn { display:flex !important; }
        }
      `}</style>
    </header>
  )
}
