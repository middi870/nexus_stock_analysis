import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { fmt, sign, cls } from '../api.js'
import s from './Watchlist.module.css'

function Spark({ closes = [] }) {
  if (closes.length < 2) return <svg width={44} height={18}/>
  const mn = Math.min(...closes), mx = Math.max(...closes), span = mx - mn || 1
  const pts = closes.map((v, i) => `${(i/(closes.length-1))*44},${18-(v-mn)/span*18}`).join(' ')
  const up = closes.at(-1) >= closes[0]
  return (
    <svg width={44} height={18} viewBox="0 0 44 18">
      <polyline points={pts} fill="none"
        stroke={up ? 'var(--g)' : 'var(--r)'}
        strokeWidth={1.2} strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  )
}

function DepthSimulation({ close, up }) {
  // Simulated bid/ask spread
  const spread = close * 0.001
  const bid = (close - spread * 0.5).toFixed(2)
  const ask = (close + spread * 0.5).toFixed(2)
  return (
    <div className={s.depth}>
      <span className={s.bid}>B ₹{bid}</span>
      <span className={s.ask}>A ₹{ask}</span>
    </div>
  )
}

function StockRow({ co, active, onClick, watched, onWatch }) {
  const up = (co.change_pct || 0) >= 0
  // Build spark from 20 synthetic recent closes (derived from change)
  const fakeCloses = useMemo(() => {
    if (!co.close) return []
    const arr = []
    let v = co.close * (1 - (co.change_pct||0)/100 * 2)
    for (let i = 0; i < 20; i++) {
      v = v * (1 + (Math.random()-0.48)*0.008)
      arr.push(v)
    }
    arr.push(co.close)
    return arr
  }, [co.symbol, co.close])

  return (
    <div className={`${s.row} ${active ? s.active : ''}`} onClick={onClick}>
      <div className={s.rowLeft}>
        <Spark closes={fakeCloses}/>
        <div className={s.info}>
          <span className={s.sym}>{co.symbol}</span>
          <span className={s.name}>{co.name}</span>
        </div>
      </div>
      <div className={s.rowRight}>
        <span className={`${s.price} ${up ? s.up : s.dn}`}>₹{fmt(co.close)}</span>
        <span className={`badge ${up?'badge-up':'badge-dn'}`}>{sign(co.change_pct)}</span>
        {active && <DepthSimulation close={co.close} up={up}/>}
      </div>
      <button className={`${s.star} ${watched?s.starred:''}`}
        onClick={e=>{e.stopPropagation();onWatch(co.symbol)}}
        title={watched?'Remove watchlist':'Add to watchlist'}>
        {watched?'★':'☆'}
      </button>
    </div>
  )
}

export default function Watchlist({ query }) {
  const { companies, activeSym, setActiveSym, watchlist, toggleWatch, isWatched } = useApp()
  const [view,   setView]   = useState('watch')   // watch | all | sector
  const [sortBy, setSortBy] = useState('change')

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return companies.filter(c => c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q))
  }, [companies, query])

  const watched = filtered.filter(c => watchlist.includes(c.symbol))

  const sorted = useMemo(() => {
    const arr = [...filtered]
    if (sortBy === 'change') arr.sort((a,b)=>(b.change_pct||0)-(a.change_pct||0))
    if (sortBy === 'alpha')  arr.sort((a,b)=>a.symbol.localeCompare(b.symbol))
    if (sortBy === 'price')  arr.sort((a,b)=>(b.close||0)-(a.close||0))
    if (sortBy === 'vol')    arr.sort((a,b)=>(b.volume||0)-(a.volume||0))
    return arr
  }, [filtered, sortBy])

  const sectors = useMemo(() => {
    const m = {}
    companies.forEach(c => {
      m[c.sector] = m[c.sector] || []
      m[c.sector].push(c)
    })
    return Object.entries(m).sort(([a],[b])=>a.localeCompare(b))
  }, [companies])

  const displayList = view === 'watch'
    ? (watched.length ? watched : sorted.slice(0,8))
    : view === 'all' ? sorted : null

  // Market breadth
  const advancers = companies.filter(c=>(c.change_pct||0)>0).length
  const decliners = companies.filter(c=>(c.change_pct||0)<0).length
  const unch      = companies.length - advancers - decliners

  return (
    <aside className={s.sidebar}>
      {/* Market breadth */}
      <div className={s.breadth}>
        <span className={s.breadthItem}><span className={s.bUp}>{advancers}</span> ▲</span>
        <span className={s.breadthSep}/>
        <span className={s.breadthItem}><span className={s.bNeu}>{unch}</span> —</span>
        <span className={s.breadthSep}/>
        <span className={s.breadthItem}><span className={s.bDn}>{decliners}</span> ▼</span>
        <span className={s.breadthLabel}>Market Breadth</span>
      </div>

      {/* View switcher */}
      <div className={s.viewBar}>
        {[['watch','Watchlist'],['all','All'],['sector','Sectors']].map(([v,l])=>(
          <button key={v} className={`${s.viewBtn} ${view===v?s.viewOn:''}`}
            onClick={()=>setView(v)}>{l}</button>
        ))}
        {view==='all' && (
          <select className={s.sortSel} value={sortBy} onChange={e=>setSortBy(e.target.value)}>
            <option value="change">Change</option>
            <option value="alpha">A–Z</option>
            <option value="price">Price</option>
            <option value="vol">Volume</option>
          </select>
        )}
      </div>

      {/* Column headers */}
      <div className={s.colHdr}>
        <span>SYMBOL</span><span>PRICE / CHG</span>
      </div>

      {/* List or Sector view */}
      <div className={s.list}>
        {view === 'sector' ? (
          sectors.map(([sec, cos]) => {
            const avg = cos.reduce((a,c)=>a+(c.change_pct||0),0)/cos.length
            return (
              <div key={sec} className={s.secBlock}>
                <div className={s.secHead}>
                  <span className={s.secName}>{sec}</span>
                  <span className={`${s.secChg} ${avg>=0?s.up:s.dn}`}>{sign(avg)}</span>
                </div>
                {cos.map(co=>(
                  <StockRow key={co.symbol} co={co}
                    active={activeSym===co.symbol}
                    onClick={()=>setActiveSym(co.symbol)}
                    watched={isWatched(co.symbol)}
                    onWatch={toggleWatch}/>
                ))}
              </div>
            )
          })
        ) : displayList?.map(co => (
          <StockRow key={co.symbol} co={co}
            active={activeSym===co.symbol}
            onClick={()=>setActiveSym(co.symbol)}
            watched={isWatched(co.symbol)}
            onWatch={toggleWatch}/>
        ))}
      </div>

      {/* Keyboard hint */}
      <div className={s.kbHint}>
        <span>j/k navigate</span><span>·</span><span>1–5 period</span><span>·</span><span>w watch</span>
      </div>
    </aside>
  )
}
