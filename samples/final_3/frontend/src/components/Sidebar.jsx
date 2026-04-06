import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { fmt, sign, cls } from '../api.js'
import { IcoSearch, IcoTrend } from '../icons.jsx'

const SECTOR_DOT = {
  IT:'#4080FF', Banking:'#9D7EFF', Finance:'#7B63E0',
  Energy:'#FF7B3A', FMCG:'#00C98A', Auto:'#F5C542',
  Pharma:'#00C4D4', Infra:'#F472B6', Materials:'#60A5FA',
  Utilities:'#34D399', Conglomerate:'#F5A623',
}

export default function Sidebar() {
  const { companies, activeSym, selectSymbol, movers } = useApp()
  const [query,  setQuery ] = useState('')
  const [sector, setSector] = useState('All')

  const sectors = ['All', ...new Set(companies.map(c => c.sector))]

  const filtered = companies.filter(c => {
    const q = query.toLowerCase()
    if (sector !== 'All' && c.sector !== sector) return false
    if (q && !c.symbol.toLowerCase().includes(q) && !c.name.toLowerCase().includes(q)) return false
    return true
  })

  return (
    <aside className="sidebar-shell" style={{
      width:'var(--sidebar-w)', flexShrink:0,
      display:'flex', flexDirection:'column',
      background:'var(--s1)', borderRight:'1px solid var(--b1)',
      overflow:'hidden',
    }}>
      {/* Header */}
      <div style={{ padding:'10px 10px 8px', borderBottom:'1px solid var(--b1)', flexShrink:0 }}>
        {/* Search */}
        <div style={{ position:'relative', marginBottom:8 }}>
          <span style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)',
            color:'var(--t3)', pointerEvents:'none', display:'flex' }}>
            <IcoSearch width={12} height={12}/>
          </span>
          <input className="input" style={{ paddingLeft:28, fontSize:11 }}
            placeholder="Filter stocks…"
            value={query} onChange={e => setQuery(e.target.value)}/>
        </div>

        {/* Sector filter */}
        <div style={{ display:'flex', gap:3, flexWrap:'wrap' }}>
          {sectors.map(s => (
            <button key={s} onClick={() => setSector(s)}
              style={{
                fontSize:9, padding:'2px 7px', borderRadius:99,
                border:'none', cursor:'pointer', fontFamily:'var(--ui)', fontWeight:500,
                background: sector===s ? 'var(--gd)' : 'var(--s3)',
                color:      sector===s ? 'var(--g)'  : 'var(--t3)',
                transition:'all .12s',
              }}
            >{s}</button>
          ))}
        </div>
      </div>

      {/* Stock rows */}
      <div style={{ flex:1, overflowY:'auto' }}>
        {filtered.length === 0 && (
          <div style={{ padding:20, textAlign:'center', color:'var(--t4)',
            fontSize:11, fontFamily:'var(--mono)' }}>No results</div>
        )}
        {filtered.map(c => {
          const active = c.symbol === activeSym
          const up     = (c.change_pct ?? 0) >= 0
          return (
            <button key={c.symbol}
              onClick={() => selectSymbol(c.symbol)}
              style={{
                display:'block', width:'100%', textAlign:'left',
                padding:'8px 10px',
                background: active ? 'var(--s3)' : 'transparent',
                borderLeft: `2px solid ${active ? 'var(--g)' : 'transparent'}`,
                borderRight:'none', borderTop:'none',
                borderBottom:'1px solid var(--b1)',
                cursor:'pointer', transition:'background .1s,border-color .1s',
                fontFamily:'var(--ui)',
              }}
              onMouseEnter={e => { if(!active) e.currentTarget.style.background='var(--s2)' }}
              onMouseLeave={e => { if(!active) e.currentTarget.style.background='transparent' }}
            >
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:600,
                    color: active ? 'var(--g)' : 'var(--t1)', lineHeight:1.3 }}>
                    {c.symbol}
                  </div>
                  <div style={{ fontSize:9, color:'var(--t3)', marginTop:1,
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                    maxWidth:120 }}>
                    {c.name}
                  </div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--t1)', fontWeight:500 }}>
                    ₹{fmt(c.close)}
                  </div>
                  <div className={cls(c.change_pct)}
                    style={{ fontFamily:'var(--mono)', fontSize:10, fontWeight:600 }}>
                    {sign(c.change_pct)}
                  </div>
                </div>
              </div>
              {/* Sector dot + mini change bar */}
              <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:4 }}>
                <div style={{ width:4, height:4, borderRadius:'50%', flexShrink:0,
                  background: SECTOR_DOT[c.sector] || 'var(--t4)' }}/>
                <span style={{ fontSize:9, color:'var(--t4)', flex:1 }}>{c.sector}</span>
                <div style={{
                  width: Math.min(Math.abs(c.change_pct||0)*9, 36),
                  height:2, borderRadius:99,
                  background: up ? 'var(--g)' : 'var(--r)', opacity:.65,
                }}/>
              </div>
            </button>
          )
        })}
      </div>

      {/* Footer count */}
      <div style={{
        padding:'6px 10px', borderTop:'1px solid var(--b1)',
        fontSize:9, color:'var(--t4)', fontFamily:'var(--mono)',
        display:'flex', justifyContent:'space-between',
      }}>
        <span>{filtered.length} of {companies.length} stocks</span>
        <span style={{ color:'var(--t4)' }}>NSE</span>
      </div>
    </aside>
  )
}
