import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { api, fmt, sign, cls } from '../api.js'

function Cell({ c, onClick }) {
  const pct  = c.change_pct ?? 0
  const abs  = Math.min(Math.abs(pct),5)/5
  const up   = pct >= 0
  const bg   = up
    ? `rgba(0,201,138,${.07+abs*.38})`
    : `rgba(232,67,90,${.07+abs*.38})`
  const bord = up
    ? `rgba(0,201,138,${.2+abs*.45})`
    : `rgba(232,67,90,${.2+abs*.45})`
  const cap  = c.mktcap || 3
  const size = Math.max(76, Math.min(150, cap * 7.5))

  return (
    <div onClick={() => onClick(c.symbol)}
      style={{
        width:size, height:size*.68,
        background:bg, border:`1px solid ${bord}`,
        borderRadius:8, display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        cursor:'pointer', padding:7, textAlign:'center',
        transition:'transform .15s,box-shadow .15s',
        position:'relative', overflow:'hidden',
      }}
      onMouseEnter={e=>{
        e.currentTarget.style.transform='scale(1.06)'
        e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,.45)'
        e.currentTarget.style.zIndex='5'
      }}
      onMouseLeave={e=>{
        e.currentTarget.style.transform='scale(1)'
        e.currentTarget.style.boxShadow='none'
        e.currentTarget.style.zIndex='1'
      }}
    >
      <div style={{fontFamily:'var(--mono)',fontSize:11,fontWeight:700,color:'var(--t1)'}}>
        {c.symbol}
      </div>
      <div style={{fontSize:8,color:'var(--t3)',margin:'2px 0',lineHeight:1.2}}>
        {c.name?.split(' ').slice(0,2).join(' ')}
      </div>
      <div style={{
        fontFamily:'var(--mono)',fontSize:12,fontWeight:700,
        color: up ? 'var(--g)' : 'var(--r)',
      }}>{sign(c.change_pct)}</div>
      <div style={{fontSize:8,color:'var(--t4)',fontFamily:'var(--mono)',marginTop:1}}>
        ₹{fmt(c.close)}
      </div>
    </div>
  )
}

export default function Heatmap() {
  const { selectSymbol, companies } = useApp()
  const [data,    setData   ] = useState([])
  const [loading, setLoading] = useState(false)

  // Use companies data immediately, then refresh from heatmap endpoint
  useEffect(() => {
    setData(companies)   // instant
    if (companies.length) {
      api.heatmap().then(setData).catch(()=>{})  // refresh in background
    }
  }, [companies])

  const sectors = [...new Set(data.map(d=>d.sector))].sort()

  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',background:'var(--bg)'}}>

      {/* Header */}
      <div style={{
        padding:'9px 14px', borderBottom:'1px solid var(--b1)',
        background:'var(--s1)', display:'flex', alignItems:'center', gap:10, flexShrink:0,
      }}>
        <span style={{fontWeight:700,fontSize:13,color:'var(--t1)',letterSpacing:'.03em'}}>
          Market Heatmap
        </span>
        <div style={{flex:1}}/>
        <div style={{display:'flex',gap:12,fontSize:9,color:'var(--t3)',alignItems:'center',fontFamily:'var(--mono)'}}>
          <span style={{display:'flex',alignItems:'center',gap:5}}>
            <span style={{width:18,height:9,borderRadius:2,background:'rgba(0,201,138,.45)',display:'inline-block'}}/>
            Gain
          </span>
          <span style={{display:'flex',alignItems:'center',gap:5}}>
            <span style={{width:18,height:9,borderRadius:2,background:'rgba(232,67,90,.45)',display:'inline-block'}}/>
            Loss
          </span>
          <span style={{color:'var(--t4)'}}>Size = Mkt Cap</span>
        </div>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'12px 14px'}}>
        {sectors.map(sec => {
          const stocks = data.filter(d=>d.sector===sec)
          const avg    = stocks.reduce((a,b)=>a+(b.change_pct||0),0)/stocks.length
          return (
            <div key={sec} style={{marginBottom:20}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                <span style={{fontWeight:700,fontSize:11,color:'var(--t2)'}}>
                  {sec}
                </span>
                <span className={cls(avg)}
                  style={{fontFamily:'var(--mono)',fontSize:10,fontWeight:600}}>
                  {sign(avg)} avg
                </span>
                <div style={{flex:1,height:1,background:'var(--b1)'}}/>
                <span style={{fontSize:9,color:'var(--t4)',fontFamily:'var(--mono)'}}>
                  {stocks.length} stocks
                </span>
              </div>
              <div style={{display:'flex',flexWrap:'wrap',gap:7}}>
                {stocks.map(c=>(
                  <Cell key={c.symbol} c={c} onClick={sym=>selectSymbol(sym)}/>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
