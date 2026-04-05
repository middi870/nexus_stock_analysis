import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { api, fmt, sign, cls } from '../api.js'
import s from './TopBar.module.css'

// Simulated Nifty/Sensex (replace with real endpoint if available)
const INDICES = [
  { id:'N50', name:'NIFTY 50',   base:24198.50, seed:1 },
  { id:'SNX', name:'SENSEX',     base:79705.91, seed:2 },
  { id:'BNK', name:'NIFTY BANK', base:51489.15, seed:3 },
  { id:'IT',  name:'NIFTY IT',   base:39214.80, seed:4 },
]

function useIndices() {
  const [indices, setIndices] = useState(
    INDICES.map(i => ({ ...i, val:i.base, chg:((Math.random()-0.48)*1.2).toFixed(2) }))
  )
  useEffect(() => {
    const t = setInterval(() => {
      setIndices(prev => prev.map(i => ({
        ...i,
        val: +(i.val * (1 + (Math.random()-0.499)*0.0003)).toFixed(2),
      })))
    }, 3000)
    return () => clearInterval(t)
  }, [])
  return indices
}

function MarketClock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t) }, [])
  const h = time.getHours(), m = time.getMinutes()
  const open = (h > 9 || (h === 9 && m >= 15)) && h < 15 && !(h === 15 && m > 30)
  return (
    <div className={s.clock}>
      <span className={`${s.mktDot} ${open ? s.mktOpen : s.mktClosed}`}/>
      <span className={s.mktLabel}>{open ? 'NSE Open' : 'NSE Closed'}</span>
      <span className={s.mktTime}>
        {time.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit' })} IST
      </span>
    </div>
  )
}

export default function TopBar({ onSearch, onRefresh }) {
  const { companies, tab, setTab } = useApp()
  const indices = useIndices()
  const [refreshing, setRefreshing] = useState(false)

  const tapeItems = [...companies, ...companies].map((c, i) => {
    const up = (c.change_pct || 0) >= 0
    return (
      <span key={i} className={s.tape}>
        <span className={s.tapeSym}>{c.symbol}</span>
        <span className={s.tapePrice}>₹{fmt(c.close)}</span>
        <span className={up ? s.tapeUp : s.tapeDn}>{up?'▲':'▼'}{Math.abs(c.change_pct||0).toFixed(2)}%</span>
      </span>
    )
  })

  async function handleRefresh() {
    setRefreshing(true)
    await api.refresh().catch(()=>{})
    setTimeout(() => { setRefreshing(false); onRefresh?.() }, 2000)
  }

  const TABS = [
    { id:'chart',    label:'Chart' },
    { id:'screener', label:'Screener' },
    { id:'heatmap',  label:'Heatmap' },
    { id:'compare',  label:'Compare' },
  ]

  return (
    <div className={s.wrap}>
      {/* Ticker tape */}
      <div className={s.tapeBar}>
        <div className={s.tapeInner}>{tapeItems}</div>
      </div>

      {/* Main header */}
      <header className={s.header}>
        {/* Logo */}
        <div className={s.logo}>
          <div className={s.logoMark}>
            <svg viewBox="0 0 14 10" fill="none" width="14">
              <polyline points="1,9 4,4 7,6 10,2 13,4"
                stroke="#000" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <div className={s.logoName}>PULSE <span className={s.logoV}>v2</span></div>
            <div className={s.logoTag}>Market Terminal</div>
          </div>
        </div>

        <div className={s.divider}/>

        {/* Index strip */}
        <div className={s.indices}>
          {indices.map(idx => {
            const up = parseFloat(idx.chg) >= 0
            return (
              <div key={idx.id} className={s.index}>
                <span className={s.idxName}>{idx.name}</span>
                <span className={s.idxVal}>{fmt(idx.val)}</span>
                <span className={up ? s.idxUp : s.idxDn}>{up?'▲':'▼'}{Math.abs(idx.chg)}%</span>
              </div>
            )
          })}
        </div>

        <div className={s.divider}/>

        {/* Nav tabs */}
        <nav className={s.nav}>
          {TABS.map(t => (
            <button key={t.id}
              className={`${s.navBtn} ${tab === t.id ? s.navOn : ''}`}
              onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>

        <div className={s.spacer}/>

        <MarketClock/>

        <div className={s.divider}/>

        {/* Refresh */}
        <button className={`${s.refreshBtn} ${refreshing ? s.refreshing : ''}`}
          onClick={handleRefresh} disabled={refreshing} title="Refresh data">
          <svg viewBox="0 0 16 16" width="13" fill="none">
            <path d="M13.5 8A5.5 5.5 0 1 1 8 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <polyline points="8,1 10,3 8,5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Search */}
        <div className={s.searchWrap}>
          <svg className={s.searchIco} viewBox="0 0 16 16" fill="none" width="12">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="m11 11 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input className={s.search} placeholder="Search stock…"
            onChange={e => onSearch(e.target.value)}/>
          <kbd className={s.kbd}>/</kbd>
        </div>
      </header>
    </div>
  )
}
