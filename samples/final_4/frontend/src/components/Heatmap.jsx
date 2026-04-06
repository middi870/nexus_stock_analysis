/**
 * Heatmap — uniform grid cells. All text always readable.
 * Colour intensity shows magnitude; white text on all cells.
 * No variable sizing — each cell is the same 120×80px.
 */
import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { fmt, sign } from '../api.js'
import { api } from '../api.js'

// Background colour for a change_pct value — tuned for white text readability
function cellBg(pct) {
  if (pct == null) return { bg:'rgba(30,33,51,.8)', border:'rgba(39,43,62,.9)' }
  const a = Math.min(Math.abs(pct), 5) / 5  // 0–1
  if (pct >= 0) {
    // Green: starts near-neutral, becomes vivid
    const r = Math.round(10  + a * 8)
    const g = Math.round(40  + a * 120)
    const b = Math.round(30  + a * 10)
    return {
      bg:     `rgba(${r},${g},${b},0.85)`,
      border: `rgba(${r},${g+30},${b},${0.3 + a*0.5})`,
    }
  } else {
    const r = Math.round(80 + a * 120)
    const g = Math.round(10  + a * 5)
    const b = Math.round(10  + a * 5)
    return {
      bg:     `rgba(${r},${g},${b},0.85)`,
      border: `rgba(${r+20},${g},${b},${0.3 + a*0.5})`,
    }
  }
}

function HeatCell({ c, onClick }) {
  const pct        = c.change_pct ?? 0
  const { bg, border } = cellBg(pct)
  const abs        = Math.abs(pct)
  // Text colour: always white but slightly dimmed on near-zero cells
  const textOpacity = 0.6 + Math.min(abs/3, 1)*0.4

  return (
    <div onClick={()=>onClick(c.symbol)}
      style={{
        width:118, height:76,
        background:bg,
        border:`1px solid ${border}`,
        borderRadius:7,
        display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        cursor:'pointer', padding:'6px 8px', textAlign:'center',
        transition:'transform .12s,box-shadow .12s',
        userSelect:'none',
      }}
      onMouseEnter={e=>{
        e.currentTarget.style.transform='scale(1.06)'
        e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,.5)'
        e.currentTarget.style.zIndex='5'
      }}
      onMouseLeave={e=>{
        e.currentTarget.style.transform='scale(1)'
        e.currentTarget.style.boxShadow='none'
        e.currentTarget.style.zIndex='1'
      }}
    >
      {/* Symbol — always white, bold */}
      <div style={{
        fontFamily:'var(--mono)',fontSize:11,fontWeight:700,
        color:'rgba(255,255,255,0.95)',
        lineHeight:1.1,letterSpacing:'.03em',
      }}>{c.symbol}</div>

      {/* Company short name — dimmed white */}
      <div style={{
        fontSize:8,color:'rgba(255,255,255,0.5)',
        margin:'3px 0 4px',lineHeight:1.2,
        overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',
        maxWidth:106,
      }}>{c.name?.split(' ').slice(0,2).join(' ')}</div>

      {/* Change % — bold white */}
      <div style={{
        fontFamily:'var(--mono)',fontSize:13,fontWeight:800,
        color:`rgba(255,255,255,${textOpacity})`,
        lineHeight:1,
      }}>{sign(pct)}</div>

      {/* Price — dimmed */}
      <div style={{
        fontFamily:'var(--mono)',fontSize:8,
        color:'rgba(255,255,255,0.45)',marginTop:3,
      }}>₹{fmt(c.close, 0)}</div>
    </div>
  )
}

export default function Heatmap() {
  const { companies, selectSymbol } = useApp()
  const [data, setData] = useState([])

  useEffect(() => {
    setData(companies)                            // instant
    api.heatmap().then(setData).catch(()=>{})     // refresh
  }, [companies])

  const sectors = (() => {
    const order = {}; let i=0
    data.forEach(d=>{ if(!(d.sector in order)) order[d.sector]=i++ })
    return [...new Set(data.map(d=>d.sector))].sort((a,b)=>order[a]-order[b])
  })

  // Sort within each sector by change_pct desc
  const bySector = sec => [...data.filter(d=>d.sector===sec)]
    .sort((a,b)=>(b.change_pct??-99)-(a.change_pct??-99))

  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',background:'var(--bg)'}}>

      {/* Header */}
      <div style={{
        padding:'9px 16px',borderBottom:'1px solid var(--b1)',
        background:'var(--s1)',display:'flex',alignItems:'center',gap:10,flexShrink:0,
      }}>
        <span style={{fontWeight:700,fontSize:13,color:'var(--t1)',letterSpacing:'.03em'}}>
          Market Heatmap
        </span>
        <span style={{fontSize:9,color:'var(--t4)',fontFamily:'var(--mono)'}}>
          {data.length} NSE stocks
        </span>
        <div style={{flex:1}}/>
        {/* Legend */}
        <div style={{display:'flex',gap:10,alignItems:'center',fontSize:9,
          color:'var(--t2)',fontFamily:'var(--mono)'}}>
          <div style={{display:'flex',alignItems:'center',gap:5}}>
            <div style={{width:28,height:14,borderRadius:3,
              background:'linear-gradient(90deg,rgba(10,48,30,.9),rgba(10,158,60,.9))'}}/>
            <span>Gain</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:5}}>
            <div style={{width:28,height:14,borderRadius:3,
              background:'linear-gradient(90deg,rgba(100,20,20,.9),rgba(220,30,30,.9))'}}/>
            <span>Loss</span>
          </div>
          <span style={{color:'var(--t4)'}}>Uniform size · White text</span>
        </div>
      </div>

      {/* Grid */}
      <div style={{flex:1,overflowY:'auto',padding:'12px 14px 20px'}}>
        {sectors.map(sec => {
          const stocks = bySector(sec)
          const avg    = stocks.reduce((a,b)=>a+(b.change_pct||0),0)/stocks.length
          const avgUp  = avg >= 0
          return (
            <div key={sec} style={{marginBottom:22}}>
              {/* Sector header */}
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:9}}>
                <span style={{fontWeight:700,fontSize:11,color:'var(--t2)',
                  letterSpacing:'.04em',textTransform:'uppercase'}}>{sec}</span>
                <div style={{
                  display:'inline-flex',alignItems:'center',
                  background:avgUp?'var(--green-bg)':'var(--red-bg)',
                  border:`1px solid ${avgUp?'var(--green-bd)':'var(--red-bd)'}`,
                  borderRadius:4,padding:'1px 7px',
                }}>
                  <span style={{
                    fontFamily:'var(--mono)',fontSize:10,fontWeight:700,
                    color:avgUp?'var(--green)':'var(--red)',
                  }}>{sign(avg)} avg</span>
                </div>
                <div style={{flex:1,height:1,background:'var(--b1)'}}/>
                <span style={{fontSize:9,color:'var(--t4)',fontFamily:'var(--mono)'}}>
                  {stocks.length}
                </span>
              </div>

              {/* Uniform grid */}
              <div style={{display:'flex',flexWrap:'wrap',gap:7}}>
                {stocks.map(c=>(
                  <HeatCell key={c.symbol} c={c} onClick={sym=>selectSymbol(sym)}/>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// simple memo helper to avoid hook rules violation

