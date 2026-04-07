/**
 * StockList — the discovery screen.
 * Left: symbol + company name. Right: price + toggleable metric.
 * Designed as the user's entry point before they pick a stock.
 */
import { useState, useMemo } from 'react'
import { useApp, STOCK_METRICS } from '../context/AppContext.jsx'
import { fmt, sign, cls } from '../api.js'
import { IcoSearch, IcoX, IcoTrendUp, IcoArrowUp, IcoArrowDown } from '../icons.jsx'

const SECTOR_COLORS = {
  IT:'#3B82F6',Banking:'#8B5CF6',Finance:'#6D28D9',
  Energy:'#F97316',FMCG:'#22C55E',Auto:'#EAB308',
  Pharma:'#06B6D4',Infra:'#EC4899',Materials:'#60A5FA',
  Utilities:'#34D399',Conglomerate:'#F59E0B',
}

function MiniBar({ pct }) {
  if (pct == null) return null
  const w = Math.min(Math.abs(pct) * 8, 28)
  return (
    <div style={{width:32,height:2,background:'var(--b2)',borderRadius:99,overflow:'hidden',flexShrink:0}}>
      <div style={{width:w,height:'100%',background:pct>=0?'var(--green)':'var(--red)',
        borderRadius:99,marginLeft:pct<0?`${32-w}px`:0}}/>
    </div>
  )
}

function MetricBadge({ metric, company }) {
  const v    = company[metric.id]
  const str  = metric.fmt(v)
  const isChg= metric.id === 'change_pct'
  const up   = isChg && (v??0) >= 0
  const dn   = isChg && (v??0) <  0

  return (
    <div style={{textAlign:'right',flexShrink:0}}>
      <div style={{
        fontFamily:'var(--mono)', fontSize:12, fontWeight:700, lineHeight:1.2,
        color: isChg ? (up?'var(--green)':'var(--red)') : 'var(--t1)',
      }}>{str}</div>
      {!isChg && (
        <div className={cls(company.change_pct)}
          style={{fontFamily:'var(--mono)',fontSize:10,fontWeight:600,marginTop:1}}>
          {sign(company.change_pct)}
        </div>
      )}
    </div>
  )
}

export default function StockList({ embedded = false }) {
  const { companies, activeSym, selectSymbol, stockMetric, setStockMetric } = useApp()
  const [q,      setQ     ] = useState('')
  const [sector, setSector] = useState('All')
  const [sortDir,setSortDir] = useState('desc')
  const activeMetric = STOCK_METRICS.find(m => m.id === stockMetric) || STOCK_METRICS[0]

  const sectors = useMemo(() => ['All',...new Set(companies.map(c=>c.sector))],[companies])

  const filtered = useMemo(() => {
    let list = companies.filter(c => {
      const s = q.trim().toLowerCase()
      if (sector !== 'All' && c.sector !== sector) return false
      return !s || c.symbol.toLowerCase().includes(s) || c.name.toLowerCase().includes(s)
    })
    // Sort by active metric
    list = [...list].sort((a,b) => {
      const av = a[stockMetric] ?? (sortDir==='desc'?-Infinity:Infinity)
      const bv = b[stockMetric] ?? (sortDir==='desc'?-Infinity:Infinity)
      return sortDir==='desc' ? bv-av : av-bv
    })
    return list
  }, [companies, q, sector, stockMetric, sortDir])

  const containerStyle = embedded ? {
    flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--bg)',
  } : {
    flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--bg)',
  }

  return (
    <div style={containerStyle}>
      {/* ── Header toolbar ── */}
      <div style={{padding:'10px 12px 8px',background:'var(--s1)',
        borderBottom:'1px solid var(--b1)',flexShrink:0}}>

        {/* Search row */}
        <div style={{position:'relative',marginBottom:9}}>
          <span style={{position:'absolute',left:9,top:'50%',transform:'translateY(-50%)',
            color:'var(--t3)',pointerEvents:'none',display:'flex'}}>
            <IcoSearch size={13}/>
          </span>
          <input className="input" style={{paddingLeft:30,paddingRight:q?30:10,fontSize:12}}
            placeholder="Search by symbol or company name…"
            value={q} onChange={e=>setQ(e.target.value)}/>
          {q && (
            <button className="btn-icon" style={{position:'absolute',right:6,top:'50%',
              transform:'translateY(-50%)'}} onClick={()=>setQ('')}>
              <IcoX size={12}/>
            </button>
          )}
        </div>

        {/* Metric toggle + sort */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
          <div style={{display:'flex',gap:3,flexWrap:'wrap'}}>
            {STOCK_METRICS.map(m=>(
              <button key={m.id}
                style={{
                  fontSize:9,padding:'3px 9px',borderRadius:99,border:'none',
                  cursor:'pointer',fontWeight:600,letterSpacing:'.04em',
                  fontFamily:'var(--mono)',transition:'all .12s',
                  background:stockMetric===m.id?'var(--green-bg)':'var(--s3)',
                  color:stockMetric===m.id?'var(--green)':'var(--t3)',
                  outline:stockMetric===m.id?'1px solid var(--green-bd)':'none',
                }}
                onClick={()=>setStockMetric(m.id)}
              >{m.label}</button>
            ))}
          </div>
          <button className="btn-icon" onClick={()=>setSortDir(d=>d==='desc'?'asc':'desc')}
            title={`Sorted ${sortDir==='desc'?'highest first':'lowest first'}`}
            style={{color:'var(--t3)',gap:3,fontSize:9,fontFamily:'var(--mono)'}}>
            {sortDir==='desc'?<IcoArrowDown size={13}/>:<IcoArrowUp size={13}/>}
          </button>
        </div>

        {/* Sector chips */}
        <div style={{display:'flex',gap:4,flexWrap:'wrap',marginTop:8}}>
          {sectors.map(s=>(
            <button key={s} onClick={()=>setSector(s)}
              style={{
                fontSize:9,padding:'3px 8px',borderRadius:4,border:'none',cursor:'pointer',
                fontWeight:600,fontFamily:'var(--ui)',transition:'all .12s',
                background:sector===s?'var(--s5)':'var(--s2)',
                color:sector===s?'var(--t1)':'var(--t3)',
                outline:sector===s?'1px solid var(--b3)':'none',
              }}>{s}</button>
          ))}
        </div>
      </div>

      {/* ── Column header ── */}
      <div style={{
        display:'flex',justifyContent:'space-between',alignItems:'center',
        padding:'5px 14px',background:'var(--s2)',borderBottom:'1px solid var(--b1)',
        flexShrink:0,
      }}>
        <span style={{fontSize:9,color:'var(--t4)',fontFamily:'var(--mono)',
          letterSpacing:'.1em',textTransform:'uppercase'}}>
          STOCK · {filtered.length} of {companies.length}
        </span>
        <span style={{fontSize:9,color:'var(--t4)',fontFamily:'var(--mono)',
          letterSpacing:'.1em',textTransform:'uppercase'}}>
          PRICE · {activeMetric.label.toUpperCase()} ↕
        </span>
      </div>

      {/* ── Stock rows ── */}
      <div style={{flex:1,overflowY:'auto'}}>
        {filtered.map((c,i)=>{
          const active = c.symbol===activeSym
          const dot    = SECTOR_COLORS[c.sector]||'var(--t4)'
          const up     = (c.change_pct??0)>=0

          return (
            <button key={c.symbol} onClick={()=>selectSymbol(c.symbol)}
              style={{
                display:'flex',alignItems:'center',width:'100%',
                padding:'10px 14px',gap:10,
                background:active?'var(--s4)':'transparent',
                borderLeft:`3px solid ${active?'var(--green)':'transparent'}`,
                borderRight:'none',borderTop:'none',
                borderBottom:'1px solid var(--b1)',
                cursor:'pointer',transition:'background .1s',
                fontFamily:'var(--ui)',textAlign:'left',
              }}
              onMouseEnter={e=>{if(!active)e.currentTarget.style.background='var(--s3)'}}
              onMouseLeave={e=>{if(!active)e.currentTarget.style.background='transparent'}}
            >
              {/* Rank */}
              <span style={{fontSize:9,color:'var(--t4)',fontFamily:'var(--mono)',
                width:16,textAlign:'right',flexShrink:0}}>{i+1}</span>

              {/* Sector dot */}
              <div style={{width:5,height:5,borderRadius:'50%',background:dot,flexShrink:0}}/>

              {/* Symbol + name */}
              <div style={{flex:1,minWidth:0}}>
                <div style={{
                  fontFamily:'var(--mono)',fontSize:12,fontWeight:700,lineHeight:1.2,
                  color:active?'var(--green)':'var(--t1)',
                }}>{c.symbol}</div>
                <div style={{fontSize:10,color:'var(--t3)',marginTop:1,
                  overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  {c.name}
                </div>
              </div>

              {/* Mini change bar */}
              <MiniBar pct={c.change_pct}/>

              {/* Price + metric */}
              <div style={{textAlign:'right',flexShrink:0,minWidth:80}}>
                <div style={{fontFamily:'var(--mono)',fontSize:12,fontWeight:600,
                  color:'var(--t1)',lineHeight:1.2}}>₹{fmt(c.close)}</div>
                <div style={{marginTop:1}}>
                  <MetricBadge metric={activeMetric} company={c}/>
                </div>
              </div>
            </button>
          )
        })}

        {filtered.length===0 && (
          <div style={{padding:40,textAlign:'center',color:'var(--t4)',
            fontSize:12,fontFamily:'var(--mono)'}}>No stocks match</div>
        )}
      </div>

      {/* Footer */}
      <div style={{padding:'6px 14px',borderTop:'1px solid var(--b1)',
        display:'flex',justifyContent:'space-between',
        fontSize:9,color:'var(--t4)',fontFamily:'var(--mono)',flexShrink:0}}>
        <span>NSE · {companies.length} stocks loaded</span>
        <span style={{color: sector!=='All'?'var(--green)':'var(--t4)'}}>
          {sector!=='All'?sector:'All sectors'}
        </span>
      </div>
    </div>
  )
}
