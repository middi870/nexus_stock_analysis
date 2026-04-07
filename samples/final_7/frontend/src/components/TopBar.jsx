/**
 * TopBar v0.2.0
 * #10 — Keyboard navigation in search (↑↓ Enter Escape)
 * Real-time "updated Ns ago" indicator with manual refresh button
 * URL-synced nav tabs
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { fmt, sign, cls } from '../api.js'
import { IcoSearch, IcoX, IcoRefresh } from '../icons.jsx'

  const NAV = [
    { id:'stocks',    label:'Stocks'    },
    { id:'chart',     label:'Chart'     },
    { id:'analysis',  label:'Analysis'  },
    { id:'heatmap',   label:'Heatmap'   },
    { id:'sectors',   label:'Sectors'   },
    { id:'screener',  label:'Screener'  },
    { id:'compare',   label:'Compare'   },
    { id:'portfolio', label:'Portfolio' },
  ]

export default function TopBar() {
  const {
    companies, selectSymbol, movers, tab, setTab,
    ageLabel, refreshNow, activeSym, setMobileTab,
  } = useApp()

  const [q,       setQ      ] = useState('')
  const [open,    setOpen   ] = useState(false)
  const [cursor,  setCursor ] = useState(-1)    // keyboard nav index
  const ref       = useRef(null)
  const inputRef  = useRef(null)
  const listRef   = useRef([])

  const results = q.trim()
    ? companies.filter(c =>
        c.symbol.toLowerCase().includes(q.toLowerCase()) ||
        c.name.toLowerCase().includes(q.toLowerCase())
      ).slice(0, 9)
    : []

  const pick = useCallback(sym => {
    selectSymbol(sym); setQ(''); setOpen(false); setCursor(-1)
    setTab('chart')
  }, [selectSymbol, setTab])

  // Close on outside click
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setCursor(-1) } }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // Reset cursor when results change
  useEffect(() => { setCursor(-1) }, [results.length, q])

  const handleKey = e => {
    if (!open || results.length === 0) return
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setCursor(c => Math.min(c + 1, results.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setCursor(c => Math.max(c - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (cursor >= 0 && results[cursor]) pick(results[cursor].symbol)
        else if (results[0]) pick(results[0].symbol)
        break
      case 'Escape':
        setOpen(false); setCursor(-1); setQ('')
        inputRef.current?.blur()
        break
      default: break
    }
  }

  return (
    <header style={{
      height:'var(--topbar-h)', flexShrink:0, zIndex:200,
      background:'var(--s1)', borderBottom:'1px solid var(--b1)',
      display:'flex', alignItems:'center', padding:'0 14px', gap:12,
    }}>
      {/* Logo */}
      <div style={{ display:'flex', alignItems:'center', gap:9, flexShrink:0, marginRight:4 }}>
        <svg width="26" height="26" viewBox="0 0 40 40">
          <rect width="40" height="40" rx="7" fill="#14161F"/>
          <polyline points="5,28 13,17 20,22 28,10 35,15"
            stroke="#22C55E" strokeWidth="2.5" fill="none"
            strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="35" cy="15" r="2.5" fill="#22C55E"/>
        </svg>
        <div>
          <div style={{ fontFamily:'var(--ui)', fontWeight:700, fontSize:14,
            letterSpacing:'.1em', color:'var(--t1)', lineHeight:1 }}>NEXUS</div>
          <div style={{ fontSize:7, color:'var(--t4)', letterSpacing:'.15em',
            fontFamily:'var(--mono)', lineHeight:1, marginTop:2 }}>NSE · LIVE</div>
        </div>
      </div>

      {/* Desktop nav */}
      <nav className="tab-row topbar-nav" style={{ display:'none', gap:2 }}>
        {NAV.map(n => (
          <button key={n.id} className={`tab-btn ${tab===n.id?'on':''}`}
            onClick={() => setTab(n.id)}>
            {n.label}
            {n.id === 'chart' && activeSym && (
              <span style={{
                fontSize:8, color:'var(--green)', fontFamily:'var(--mono)',
                background:'var(--green-bg)', padding:'1px 5px', borderRadius:3,
                marginLeft:3, fontWeight:700,
              }}>{activeSym}</span>
            )}
          </button>
        ))}
      </nav>

      {/* Ticker strip */}
      {movers && (
        <div style={{ flex:1, overflow:'hidden', display:'flex', gap:18,
          fontFamily:'var(--mono)', fontSize:11, minWidth:0 }}>
          {[...movers.gainers.slice(0,3), ...movers.losers.slice(0,3)].map(m => (
            <button key={m.symbol} onClick={() => pick(m.symbol)}
              style={{
                flexShrink:0, background:'none', border:'none', cursor:'pointer',
                color: m.change_pct >= 0 ? 'var(--green)' : 'var(--red)',
                fontFamily:'var(--mono)', fontSize:11, padding:0,
              }}>
              <span style={{ color:'var(--t3)', marginRight:4 }}>{m.symbol}</span>
              {sign(m.change_pct)}
            </button>
          ))}
        </div>
      )}
      {!movers && <div style={{ flex:1 }}/>}

      {/* Real-time age + refresh */}
      <div className="topbar-search" style={{ display:'none', alignItems:'center', gap:6 }}>
        {ageLabel && (
          <span style={{ fontSize:9, color:'var(--t4)', fontFamily:'var(--mono)',
            letterSpacing:'.04em', whiteSpace:'nowrap' }}>
            Updated {ageLabel}
          </span>
        )}
        <button className="btn-icon" onClick={refreshNow} title="Refresh prices">
          <IcoRefresh size={13}/>
        </button>
      </div>

      {/* Search */}
      <div ref={ref} className="topbar-search" style={{ display:'none', position:'relative', flexShrink:0 }}>
        <div style={{ position:'relative' }}>
          <span style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)',
            color:'var(--t3)', pointerEvents:'none', display:'flex' }}>
            <IcoSearch size={13}/>
          </span>
          <input
            ref={inputRef}
            className="input"
            style={{ width:210, paddingLeft:30, paddingRight: q ? 28 : 10, fontSize:12 }}
            placeholder="Search… (↑↓ Enter)"
            value={q}
            onChange={e => { setQ(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKey}
            aria-autocomplete="list"
            aria-expanded={open}
            role="combobox"
          />
          {q && (
            <button className="btn-icon"
              style={{ position:'absolute', right:5, top:'50%', transform:'translateY(-50%)' }}
              onClick={() => { setQ(''); setCursor(-1); inputRef.current?.focus() }}>
              <IcoX size={12}/>
            </button>
          )}
        </div>

        {/* Dropdown */}
        {open && results.length > 0 && (
          <div style={{
            position:'absolute', top:'calc(100% + 6px)', right:0,
            width:300, background:'var(--s2)', border:'1px solid var(--b2)',
            borderRadius:'var(--rr3)', overflow:'hidden', zIndex:300,
            boxShadow:'0 20px 60px rgba(0,0,0,.7)',
          }}
            role="listbox"
          >
            <div style={{ padding:'7px 12px 5px', fontSize:9, color:'var(--t4)',
              fontFamily:'var(--mono)', letterSpacing:'.1em',
              borderBottom:'1px solid var(--b1)',
              display:'flex', justifyContent:'space-between' }}>
              <span>RESULTS</span>
              <span style={{ color:'var(--t4)' }}>↑↓ navigate · Enter select · Esc close</span>
            </div>
            {results.map((c, i) => (
              <button key={c.symbol}
                ref={el => { listRef.current[i] = el }}
                role="option"
                aria-selected={cursor === i}
                style={{
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                  width:'100%', padding:'9px 12px', cursor:'pointer',
                  borderBottom:'1px solid var(--b1)', background: cursor===i ? 'var(--s4)' : 'transparent',
                  transition:'background .08s', border:'none', fontFamily:'var(--ui)',
                  textAlign:'left',
                }}
                onMouseEnter={() => setCursor(i)}
                onMouseDown={() => pick(c.symbol)}
              >
                <div>
                  <div style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:600,
                    color:'var(--green)', marginBottom:1 }}>
                    {c.symbol}
                    {cursor === i && (
                      <span style={{ marginLeft:6, fontSize:8, color:'var(--t4)',
                        fontFamily:'var(--mono)' }}>↵</span>
                    )}
                  </div>
                  <div style={{ fontSize:11, color:'var(--t3)' }}>{c.name}</div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:600,
                    color:'var(--t1)' }}>₹{fmt(c.close)}</div>
                  <div className={cls(c.change_pct)}
                    style={{ fontFamily:'var(--mono)', fontSize:11, fontWeight:600 }}>
                    {sign(c.change_pct)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mobile search shortcut */}
      <button className="btn-icon topbar-mob-btn" style={{ display:'none' }}
        onClick={() => { setMobileTab && setMobileTab('stocks') }}>
        <IcoSearch size={18}/>
      </button>
    </header>
  )
}
