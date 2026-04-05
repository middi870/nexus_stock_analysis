import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { api, fmt, sign, cls } from '../api.js'

function cell(c, onClick) {
  const pct  = c.change_pct ?? 0
  const abs  = Math.min(Math.abs(pct), 5) / 5
  const bg   = pct >= 0
    ? `rgba(0, 229, 160, ${0.08 + abs * 0.4})`
    : `rgba(255, 61, 90,  ${0.08 + abs * 0.4})`
  const border = pct >= 0 ? `rgba(0,229,160,${.3+abs*.4})` : `rgba(255,61,90,${.3+abs*.4})`
  const size = c.mktcap ? Math.max(80, Math.min(160, c.mktcap * 6)) : 100

  return (
    <div key={c.symbol}
      onClick={() => onClick(c.symbol)}
      style={{
        width: size, height: size * .75,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 'var(--rr2)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', transition: 'transform .15s, box-shadow .15s',
        padding: 8,
        textAlign: 'center',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform='scale(1.04)'; e.currentTarget.style.boxShadow='0 4px 20px rgba(0,0,0,.4)' }}
      onMouseLeave={e => { e.currentTarget.style.transform='scale(1)';    e.currentTarget.style.boxShadow='none' }}
    >
      <div style={{ fontFamily:'var(--mono)', fontSize:11, fontWeight:600, color:'var(--t1)' }}>{c.symbol}</div>
      <div style={{ fontSize:9, color:'var(--t3)', margin:'2px 0', lineHeight:1.2 }}>{c.name?.split(' ').slice(0,2).join(' ')}</div>
      <div style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:700 }} className={cls(pct)}>
        {sign(c.change_pct)}
      </div>
      <div style={{ fontSize:9, color:'var(--t4)', fontFamily:'var(--mono)', marginTop:2 }}>₹{fmt(c.close)}</div>
    </div>
  )
}

export default function Heatmap() {
  const { tab, selectSymbol } = useApp()
  const [data,    setData   ] = useState([])
  const [loading, setLoading] = useState(false)
  const [groupBy, setGroupBy] = useState('sector')

  useEffect(() => {
    if (tab !== 'heatmap') return
    setLoading(true)
    api.heatmap()
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [tab])

  if (tab !== 'heatmap') return null

  const pick = sym => { selectSymbol(sym) }

  const sectors = [...new Set(data.map(d => d.sector))].sort()

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--bg)' }}>
      <div style={{
        padding:'8px 14px', borderBottom:'1px solid var(--b1)',
        background:'var(--s1)', display:'flex', alignItems:'center', gap:10, flexShrink:0,
      }}>
        <span style={{ fontFamily:'var(--display)', fontSize:13, fontWeight:600, color:'var(--t1)' }}>Market Heatmap</span>
        {loading && <div className="spinner" style={{ width:14, height:14 }}/>}

        <div style={{ marginLeft:'auto', display:'flex', gap:8, alignItems:'center', fontSize:10, color:'var(--t3)' }}>
          <span style={{ width:24, height:12, borderRadius:2, background:'rgba(0,229,160,.5)', display:'inline-block', verticalAlign:'middle' }}/>Gain
          <span style={{ width:24, height:12, borderRadius:2, background:'rgba(255,61,90,.5)', display:'inline-block', verticalAlign:'middle', marginLeft:6 }}/>Loss
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:14 }}>
        {groupBy === 'sector' ? sectors.map(sec => {
          const stocks = data.filter(d => d.sector === sec)
          const avg    = stocks.reduce((a,b)=>(a+(b.change_pct||0)),0)/stocks.length
          return (
            <div key={sec} style={{ marginBottom:20 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <span style={{ fontSize:11, fontWeight:600, color:'var(--t2)', fontFamily:'var(--display)' }}>{sec}</span>
                <span style={{ fontSize:10, fontFamily:'var(--mono)' }} className={cls(avg)}>{sign(avg)} avg</span>
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {stocks.map(c => cell(c, pick))}
              </div>
            </div>
          )
        }) : (
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {[...data].sort((a,b)=>(b.change_pct||0)-(a.change_pct||0)).map(c => cell(c, pick))}
          </div>
        )}
      </div>
    </div>
  )
}
