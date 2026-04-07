/**
 * StockList v0.2.0
 * #3 — Watchlist: star icon per row, starred stocks pinned to top
 * #4 — Sparklines: 10-bar SVG mini-chart per row
 */
import { useState, useMemo } from 'react'
import { useApp, STOCK_METRICS } from '../context/AppContext.jsx'
import { fmt, sign, cls } from '../api.js'
import { IcoSearch, IcoX, IcoStar, IcoArrowUp, IcoArrowDown } from '../icons.jsx'
import Sparkline from './Sparkline.jsx'

const SECTOR_DOT = {
  IT:'#3B82F6', Banking:'#8B5CF6', Finance:'#6D28D9',
  Energy:'#F97316', FMCG:'#22C55E', Auto:'#EAB308',
  Pharma:'#06B6D4', Infra:'#EC4899', Materials:'#60A5FA',
  Utilities:'#34D399', Conglomerate:'#F59E0B',
}

export default function StockList({ embedded = false }) {
  const {
    companies, activeSym, selectSymbol,
    stockMetric, setStockMetric,
    watchlist, toggleWatchlist,
  } = useApp()

  const [q,       setQ      ] = useState('')
  const [sector,  setSector ] = useState('All')
  const [sortDir, setSortDir] = useState('desc')
  const [showWL,  setShowWL ] = useState(false)

  const activeMetric = STOCK_METRICS.find(m => m.id === stockMetric) || STOCK_METRICS[0]
  const sectors = useMemo(() => ['All', ...new Set(companies.map(c => c.sector))], [companies])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    let list = companies.filter(c => {
      if (showWL && !watchlist.has(c.symbol))  return false
      if (sector !== 'All' && c.sector !== sector) return false
      return !s || c.symbol.toLowerCase().includes(s) || c.name.toLowerCase().includes(s)
    })

    // Sort: watchlisted always first when not in WL-only mode
    list = [...list].sort((a, b) => {
      if (!showWL) {
        const aWL = watchlist.has(a.symbol) ? 0 : 1
        const bWL = watchlist.has(b.symbol) ? 0 : 1
        if (aWL !== bWL) return aWL - bWL
      }
      const av = a[stockMetric] ?? (sortDir === 'desc' ? -Infinity : Infinity)
      const bv = b[stockMetric] ?? (sortDir === 'desc' ? -Infinity : Infinity)
      return sortDir === 'desc' ? bv - av : av - bv
    })
    return list
  }, [companies, q, sector, stockMetric, sortDir, watchlist, showWL])

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--bg)' }}>

      {/* ── Header ── */}
      <div style={{ padding:'10px 12px 8px', background:'var(--s1)',
        borderBottom:'1px solid var(--b1)', flexShrink:0 }}>

        {/* Search row */}
        <div style={{ position:'relative', marginBottom:8 }}>
          <span style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)',
            color:'var(--t3)', pointerEvents:'none', display:'flex' }}>
            <IcoSearch size={13}/>
          </span>
          <input className="input"
            style={{ paddingLeft:30, paddingRight: q ? 30 : 10, fontSize:12 }}
            placeholder="Search symbol or company…"
            value={q} onChange={e => setQ(e.target.value)}/>
          {q && (
            <button className="btn-icon"
              style={{ position:'absolute', right:6, top:'50%', transform:'translateY(-50%)' }}
              onClick={() => setQ('')}>
              <IcoX size={12}/>
            </button>
          )}
        </div>

        {/* Metric pills + watchlist toggle + sort */}
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
          <div style={{ display:'flex', gap:3, flex:1, flexWrap:'wrap' }}>
            {STOCK_METRICS.map(m => (
              <button key={m.id}
                style={{
                  fontSize:9, padding:'3px 9px', borderRadius:99, border:'none',
                  cursor:'pointer', fontWeight:600, letterSpacing:'.04em',
                  fontFamily:'var(--mono)', transition:'all .12s',
                  background: stockMetric===m.id ? 'var(--green-bg)' : 'var(--s3)',
                  color:      stockMetric===m.id ? 'var(--green)'    : 'var(--t3)',
                  outline:    stockMetric===m.id ? '1px solid var(--green-bd)' : 'none',
                }}
                onClick={() => setStockMetric(m.id)}>{m.label}</button>
            ))}
          </div>

          {/* Watchlist filter */}
          <button
            onClick={() => setShowWL(p => !p)}
            title={showWL ? 'Show all' : 'Watchlist only'}
            style={{
              display:'flex', alignItems:'center', gap:4, padding:'3px 8px',
              borderRadius:99, border:'none', cursor:'pointer', fontFamily:'var(--mono)',
              fontSize:9, fontWeight:600, transition:'all .12s',
              background: showWL ? 'var(--amber-bg)' : 'var(--s3)',
              color:      showWL ? 'var(--amber)'     : 'var(--t3)',
              outline:    showWL ? '1px solid rgba(245,158,11,.35)' : 'none',
            }}>
            <IcoStar size={10} stroke={showWL?'var(--amber)':'currentColor'}/>
            {watchlist.size > 0 ? watchlist.size : 'Watch'}
          </button>

          {/* Sort direction */}
          <button className="btn-icon"
            onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
            title={sortDir === 'desc' ? 'Highest first' : 'Lowest first'}>
            {sortDir === 'desc' ? <IcoArrowDown size={13}/> : <IcoArrowUp size={13}/>}
          </button>
        </div>

        {/* Sector chips */}
        <div style={{ display:'flex', gap:3, flexWrap:'wrap' }}>
          {sectors.map(s => (
            <button key={s} onClick={() => setSector(s)}
              style={{
                fontSize:9, padding:'3px 8px', borderRadius:4, border:'none',
                cursor:'pointer', fontWeight:600, fontFamily:'var(--ui)', transition:'all .12s',
                background: sector===s ? 'var(--s5)' : 'var(--s2)',
                color:      sector===s ? 'var(--t1)' : 'var(--t3)',
                outline:    sector===s ? '1px solid var(--b3)' : 'none',
              }}>{s}</button>
          ))}
        </div>
      </div>

      {/* Column header */}
      <div style={{
        display:'flex', justifyContent:'space-between', alignItems:'center',
        padding:'5px 12px 5px 38px',
        background:'var(--s2)', borderBottom:'1px solid var(--b1)', flexShrink:0,
      }}>
        <span style={{ fontSize:9, color:'var(--t4)', fontFamily:'var(--mono)',
          letterSpacing:'.1em', textTransform:'uppercase' }}>
          {filtered.length}/{companies.length} STOCKS
        </span>
        <span style={{ fontSize:9, color:'var(--t4)', fontFamily:'var(--mono)',
          letterSpacing:'.1em', textTransform:'uppercase' }}>
          PRICE · {activeMetric.label.toUpperCase()}
        </span>
      </div>

      {/* Stock rows */}
      <div style={{ flex:1, overflowY:'auto' }}>
        {filtered.length === 0 && (
          <div style={{ padding:40, textAlign:'center', color:'var(--t4)',
            fontSize:12, fontFamily:'var(--mono)' }}>
            {showWL ? 'No watchlisted stocks — click ☆ to add' : 'No results'}
          </div>
        )}

        {filtered.map((c, i) => {
          const active  = c.symbol === activeSym
          const inWL    = watchlist.has(c.symbol)
          const up      = (c.change_pct ?? 0) >= 0
          const metVal  = activeMetric.fmt(c[stockMetric])
          const isChg   = stockMetric === 'change_pct'

          return (
            <div key={c.symbol}
              style={{
                display:'flex', alignItems:'center', gap:8,
                padding:'8px 10px 8px 8px',
                background: active ? 'var(--s4)' : 'transparent',
                borderLeft: `3px solid ${active ? 'var(--green)' : 'transparent'}`,
                borderBottom:'1px solid var(--b1)',
                transition:'background .1s',
                cursor:'pointer',
              }}
              onClick={() => selectSymbol(c.symbol)}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background='var(--s3)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background='transparent' }}
            >
              {/* Watchlist star */}
              <button
                onClick={e => { e.stopPropagation(); toggleWatchlist(c.symbol) }}
                style={{
                  background:'none', border:'none', cursor:'pointer', padding:2,
                  flexShrink:0, lineHeight:1, opacity: inWL ? 1 : 0.3,
                  color: inWL ? 'var(--amber)' : 'var(--t3)',
                  transition:'opacity .15s, color .15s',
                }}
                title={inWL ? 'Remove from watchlist' : 'Add to watchlist'}
              >
                <IcoStar size={12}
                  fill={inWL ? 'var(--amber)' : 'none'}
                  stroke={inWL ? 'var(--amber)' : 'currentColor'}/>
              </button>

              {/* Sector dot */}
              <div style={{ width:5, height:5, borderRadius:'50%', flexShrink:0,
                background: SECTOR_DOT[c.sector] || 'var(--t4)' }}/>

              {/* Symbol + name */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{
                  fontFamily:'var(--mono)', fontSize:12, fontWeight:700,
                  color: active ? 'var(--green)' : inWL ? 'var(--amber)' : 'var(--t1)',
                  lineHeight:1.2,
                }}>{c.symbol}</div>
                <div style={{ fontSize:9, color:'var(--t3)', marginTop:1,
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {c.name}
                </div>
              </div>

              {/* #4 Sparkline */}
              {c.spark && c.spark.length >= 2 && (
                <Sparkline prices={c.spark} width={52} height={24}/>
              )}

              {/* Price + metric */}
              <div style={{ textAlign:'right', flexShrink:0, minWidth:80 }}>
                <div style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:600,
                  color:'var(--t1)', lineHeight:1.2 }}>
                  ₹{fmt(c.close)}
                </div>
                <div style={{
                  fontFamily:'var(--mono)', fontSize:11, fontWeight:700, marginTop:1,
                  color: isChg
                    ? up ? 'var(--green)' : 'var(--red)'
                    : 'var(--t2)',
                }}>{metVal}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{
        padding:'5px 12px', borderTop:'1px solid var(--b1)',
        display:'flex', justifyContent:'space-between', flexShrink:0,
        fontSize:9, color:'var(--t4)', fontFamily:'var(--mono)',
      }}>
        <span>NSE · {companies.length} stocks</span>
        <span style={{ color: watchlist.size > 0 ? 'var(--amber)' : 'var(--t4)' }}>
          {watchlist.size > 0 ? `${watchlist.size} watching` : 'No watchlist'}
        </span>
      </div>
    </div>
  )
}
