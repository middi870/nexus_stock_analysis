import { useState, useRef, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { fmt, sign, cls } from '../api.js'
import { IcoSearch, IcoX } from '../icons.jsx'

export default function TopBar() {
  const { companies, selectSymbol, movers, tab, setTab, setMobileTab } = useApp()
  const [q,  setQ ] = useState('')
  const [open,setOpen]=useState(false)
  const ref = useRef(null)

  const results = q.trim()
    ? companies.filter(c =>
        c.symbol.toLowerCase().includes(q.toLowerCase()) ||
        c.name.toLowerCase().includes(q.toLowerCase())
      ).slice(0,8)
    : []

  const pick = sym => { selectSymbol(sym); setQ(''); setOpen(false) }

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const NAV = [
    {id:'stocks',  label:'Stocks'},
    {id:'chart',   label:'Chart'},
    {id:'analysis',label:'Analysis'},
    {id:'heatmap', label:'Heatmap'},
    {id:'compare', label:'Compare'},
  ]

  return (
    <header style={{
      height:'var(--topbar-h)', flexShrink:0, zIndex:200,
      background:'var(--s1)', borderBottom:'1px solid var(--b1)',
      display:'flex', alignItems:'center', padding:'0 14px', gap:12,
    }}>
      {/* Logo */}
      <div style={{display:'flex',alignItems:'center',gap:9,flexShrink:0,marginRight:4}}>
        <svg width="26" height="26" viewBox="0 0 40 40">
          <rect width="40" height="40" rx="7" fill="#14161F"/>
          <polyline points="5,28 13,17 20,22 28,10 35,15"
            stroke="#22C55E" strokeWidth="2.5" fill="none"
            strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="35" cy="15" r="2.5" fill="#22C55E"/>
        </svg>
        <div>
          <div style={{fontFamily:'var(--ui)',fontWeight:700,fontSize:14,
            letterSpacing:'.1em',color:'var(--t1)',lineHeight:1}}>NEXUS</div>
          <div style={{fontSize:7,color:'var(--t4)',letterSpacing:'.15em',
            fontFamily:'var(--mono)',lineHeight:1,marginTop:2}}>NSE · LIVE</div>
        </div>
      </div>

      {/* Desktop nav */}
      <nav className="tab-row topbar-nav" style={{display:'none'}}>
        {NAV.map(n=>(
          <button key={n.id} className={`tab-btn ${tab===n.id?'on':''}`}
            onClick={()=>setTab(n.id)}>{n.label}</button>
        ))}
      </nav>

      {/* Ticker — flex grows to fill space */}
      {movers && (
        <div style={{flex:1,overflow:'hidden',display:'flex',gap:20,
          fontFamily:'var(--mono)',fontSize:11,minWidth:0}}>
          {[...movers.gainers.slice(0,3),...movers.losers.slice(0,3)].map(m=>(
            <button key={m.symbol} onClick={()=>pick(m.symbol)}
              style={{
                flexShrink:0,background:'none',border:'none',cursor:'pointer',
                color:m.change_pct>=0?'var(--green)':'var(--red)',
                fontFamily:'var(--mono)',fontSize:11,padding:0,
              }}>
              <span style={{color:'var(--t3)',marginRight:4}}>{m.symbol}</span>
              {sign(m.change_pct)}
            </button>
          ))}
        </div>
      )}
      {!movers && <div style={{flex:1}}/>}

      {/* Search — desktop */}
      <div ref={ref} className="topbar-search" style={{display:'none',position:'relative',flexShrink:0}}>
        <div style={{position:'relative'}}>
          <span style={{position:'absolute',left:9,top:'50%',transform:'translateY(-50%)',
            color:'var(--t3)',pointerEvents:'none',display:'flex'}}>
            <IcoSearch size={13}/>
          </span>
          <input className="input" style={{width:208,paddingLeft:30,paddingRight:q?28:10,fontSize:12}}
            placeholder="Search symbol or name…"
            value={q} onChange={e=>{setQ(e.target.value);setOpen(true)}}
            onFocus={()=>setOpen(true)}/>
          {q && (
            <button className="btn-icon" style={{position:'absolute',right:5,top:'50%',
              transform:'translateY(-50%)'}} onClick={()=>{setQ('');setOpen(false)}}>
              <IcoX size={12}/>
            </button>
          )}
        </div>
        {open && results.length>0 && (
          <div style={{
            position:'absolute',top:'calc(100%+6px)',right:0,
            width:300,background:'var(--s2)',border:'1px solid var(--b2)',
            borderRadius:'var(--rr3)',overflow:'hidden',zIndex:300,
            boxShadow:'0 20px 60px rgba(0,0,0,.7)',
          }}>
            <div style={{padding:'8px 12px 6px',fontSize:9,color:'var(--t4)',
              fontFamily:'var(--mono)',letterSpacing:'.1em',borderBottom:'1px solid var(--b1)'}}>
              RESULTS
            </div>
            {results.map(c=>(
              <button key={c.symbol}
                style={{
                  display:'flex',justifyContent:'space-between',alignItems:'center',
                  width:'100%',padding:'9px 12px',cursor:'pointer',
                  borderBottom:'1px solid var(--b1)',background:'transparent',
                  transition:'background .1s',border:'none',fontFamily:'var(--ui)',
                  textAlign:'left',
                }}
                onMouseDown={()=>pick(c.symbol)}
                onMouseEnter={e=>e.currentTarget.style.background='var(--s3)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}
              >
                <div>
                  <div style={{fontFamily:'var(--mono)',fontSize:12,fontWeight:600,
                    color:'var(--green)',marginBottom:1}}>{c.symbol}</div>
                  <div style={{fontSize:11,color:'var(--t3)'}}>{c.name}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontFamily:'var(--mono)',fontSize:12,fontWeight:600,
                    color:'var(--t1)'}}>₹{fmt(c.close)}</div>
                  <div className={cls(c.change_pct)}
                    style={{fontFamily:'var(--mono)',fontSize:11,fontWeight:600}}>
                    {sign(c.change_pct)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mobile search button */}
      <button className="btn-icon topbar-mob-btn" style={{display:'none'}}
        onClick={()=>setMobileTab('stocks')}>
        <IcoSearch size={18}/>
      </button>
    </header>
  )
}
