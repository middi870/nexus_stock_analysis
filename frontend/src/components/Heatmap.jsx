import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { api, fmt, sign, cls } from '../api.js'

function HeatCell({ c, onClick }) {
  const pct    = c.change_pct ?? 0
  const abs    = Math.min(Math.abs(pct), 5) / 5
  const isUp   = pct >= 0
  const bg     = isUp
    ? `rgba(16, 185, 129, ${0.08 + abs * 0.38})`
    : `rgba(239, 68,  68,  ${0.08 + abs * 0.38})`
  const border = isUp
    ? `rgba(16, 185, 129, ${0.25 + abs * 0.4})`
    : `rgba(239, 68,  68,  ${0.25 + abs * 0.4})`
  const textColor = isUp ? '#34D399' : '#F87171'
  // Cells sized by mktcap (₹L Cr)
  const cap    = c.mktcap || 3
  const size   = Math.max(78, Math.min(148, cap * 7.5))

  return (
    <div
      onClick={() => onClick(c.symbol)}
      style={{
        width:size, height:size * .7,
        background:bg, border:`1px solid ${border}`,
        borderRadius:8, display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        cursor:'pointer', padding:8, textAlign:'center',
        transition:'transform .15s, box-shadow .15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform='scale(1.05)'
        e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,.4)'
        e.currentTarget.style.zIndex='10'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform='scale(1)'
        e.currentTarget.style.boxShadow='none'
        e.currentTarget.style.zIndex='1'
      }}
    >
      <div style={{ fontFamily:'var(--mono)', fontSize:11, fontWeight:600, color:'var(--t1)' }}>
        {c.symbol}
      </div>
      <div style={{ fontSize:9, color:'var(--t3)', margin:'2px 0', lineHeight:1.2 }}>
        {c.name?.split(' ').slice(0,2).join(' ')}
      </div>
      <div style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:700, color:textColor }}>
        {sign(c.change_pct)}
      </div>
      <div style={{ fontSize:9, color:'var(--t4)', fontFamily:'var(--mono)', marginTop:1 }}>
        ₹{fmt(c.close)}
      </div>
    </div>
  )
}

export default function Heatmap() {
  const { tab, selectSymbol } = useApp()
  const [data,    setData   ] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (tab !== 'heatmap') return
    setLoading(true)
    api.heatmap()
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [tab])

  if (tab !== 'heatmap') return null

  const sectors = [...new Set(data.map(d => d.sector))].sort()

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--bg)' }}>

      {/* Header */}
      <div style={{
        padding:'8px 14px', borderBottom:'1px solid var(--b1)',
        background:'var(--s1)', display:'flex', alignItems:'center', gap:10, flexShrink:0,
      }}>
        <span style={{ fontFamily:'var(--display)', fontSize:13, fontWeight:700, color:'var(--t1)', letterSpacing:'.04em' }}>
          Market Heatmap
        </span>
        {loading && <div className="spinner" style={{ width:13,height:13 }}/>}

        <div style={{ marginLeft:'auto', display:'flex', gap:12, fontSize:10, color:'var(--t3)', alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ width:20, height:10, borderRadius:3, background:'rgba(16,185,129,.45)', display:'inline-block' }}/>
            Gain
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ width:20, height:10, borderRadius:3, background:'rgba(239,68,68,.45)', display:'inline-block' }}/>
            Loss
          </div>
          <div style={{ color:'var(--t4)', fontFamily:'var(--mono)', fontSize:9 }}>
            Cell size = Market Cap
          </div>
        </div>
      </div>

      {/* Grid */}
      <div style={{ flex:1, overflowY:'auto', padding:'14px 16px' }}>
        {sectors.map(sec => {
          const stocks = data.filter(d => d.sector === sec)
          const avg    = stocks.reduce((a,b) => a + (b.change_pct||0), 0) / stocks.length
          return (
            <div key={sec} style={{ marginBottom:22 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:9 }}>
                <span style={{
                  fontFamily:'var(--display)', fontSize:12, fontWeight:700,
                  color:'var(--t2)', letterSpacing:'.04em',
                }}>{sec}</span>
                <span className={cls(avg)} style={{ fontFamily:'var(--mono)', fontSize:10, fontWeight:600 }}>
                  {sign(avg)} avg
                </span>
                <div style={{ flex:1, height:1, background:'var(--b1)' }}/>
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8, position:'relative' }}>
                {stocks.map(c => (
                  <HeatCell key={c.symbol} c={c} onClick={sym => selectSymbol(sym)}/>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
