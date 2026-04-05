import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { fmt, sign, cls } from '../api.js'

const SECTOR_COLORS = {
  IT:'#3B82F6', Banking:'#A78BFA', Finance:'#8B5CF6',
  Energy:'#F97316', FMCG:'#10B981', Auto:'#FBBF24',
  Pharma:'#06B6D4', Infra:'#F472B6', Materials:'#60A5FA',
  Utilities:'#34D399', Conglomerate:'#F59E0B',
}

export default function Watchlist({ query }) {
  const { companies, activeSym, selectSymbol } = useApp()
  const [sector, setSector] = useState('All')

  const sectors = ['All', ...new Set(companies.map(c => c.sector))]

  const filtered = companies.filter(c => {
    const q = query?.toLowerCase() || ''
    if (sector !== 'All' && c.sector !== sector) return false
    if (q && !c.symbol.toLowerCase().includes(q) && !c.name.toLowerCase().includes(q)) return false
    return true
  })

  return (
    <aside className="watchlist-shell" style={{
      width: 'var(--sidebar-w)', flexShrink: 0,
      borderRight: '1px solid var(--b1)',
      display: 'flex', flexDirection: 'column',
      background: 'var(--s1)', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding:'8px 10px 6px',
        borderBottom:'1px solid var(--b1)', flexShrink:0,
      }}>
        <div style={{
          fontSize:10, fontWeight:600, color:'var(--t3)',
          letterSpacing:'.1em', textTransform:'uppercase',
          marginBottom:6, fontFamily:'var(--mono)',
        }}>Watchlist — {filtered.length}</div>

        {/* Sector chips */}
        <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
          {sectors.map(s => (
            <button key={s} onClick={() => setSector(s)}
              style={{
                fontSize:9, padding:'2px 7px', borderRadius:99,
                border:'none', cursor:'pointer',
                fontFamily:'var(--mono)', fontWeight:500,
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
        {filtered.map(c => {
          const active = c.symbol === activeSym
          const up     = c.change_pct >= 0
          return (
            <div key={c.symbol}
              onClick={() => selectSymbol(c.symbol)}
              style={{
                padding:'7px 10px',
                cursor:'pointer',
                background: active ? 'var(--s4)' : 'transparent',
                borderLeft: active ? `2px solid var(--g)` : '2px solid transparent',
                borderBottom:'1px solid var(--b1)',
                transition:'all .1s',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background='var(--s2)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background='transparent' }}
            >
              {/* Symbol + price row */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:3 }}>
                <div>
                  <div style={{
                    fontFamily:'var(--mono)', fontSize:12, fontWeight:500,
                    color: active ? 'var(--g)' : 'var(--t1)',
                  }}>{c.symbol}</div>
                  <div style={{ fontSize:9, color:'var(--t3)', marginTop:1, lineHeight:1.3 }}
                    title={c.name}>{c.name.length>20 ? c.name.slice(0,19)+'…' : c.name}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--t1)', fontWeight:500 }}>
                    ₹{fmt(c.close)}
                  </div>
                  <div className={cls(c.change_pct)}
                    style={{ fontFamily:'var(--mono)', fontSize:10, fontWeight:600 }}>
                    {sign(c.change_pct)}
                  </div>
                </div>
              </div>

              {/* Sector + mini bar */}
              <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                <span style={{
                  width:4, height:4, borderRadius:'50%',
                  background: SECTOR_COLORS[c.sector] || 'var(--t3)',
                  display:'inline-block', flexShrink:0,
                }}/>
                <span style={{ fontSize:9, color:'var(--t4)', flex:1 }}>{c.sector}</span>

                {/* Change magnitude bar */}
                {c.change_pct != null && (
                  <div style={{
                    width: Math.min(Math.abs(c.change_pct) * 8, 32),
                    height: 2, borderRadius: 99,
                    background: up ? 'var(--g)' : 'var(--r)',
                    opacity: .7,
                  }}/>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
