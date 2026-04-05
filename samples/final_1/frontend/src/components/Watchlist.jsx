import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { fmt, sign, cls } from '../api.js'

const SECTOR_COLORS = {
  IT: '#4D9FFF', Banking: '#C084FC', Finance: '#A78BFA',
  Energy: '#FB923C', FMCG: '#34D399', Auto: '#FDE047',
  Pharma: '#22D3EE', Infra: '#F472B6', Materials: '#60A5FA',
  Utilities: '#86EFAC', Conglomerate: '#FFB930',
}

export default function Watchlist({ query }) {
  const { companies, activeSym, selectSymbol } = useApp()
  const [sector, setSector] = useState('All')

  const sectors = ['All', ...new Set(companies.map(c => c.sector)).values()]

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
      {/* Sector filter */}
      <div style={{
        padding: '8px 8px 4px',
        borderBottom: '1px solid var(--b1)',
        flexShrink: 0,
      }}>
        <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
          {sectors.map(s => (
            <button key={s}
              onClick={() => setSector(s)}
              style={{
                fontSize: 10, padding:'2px 8px',
                borderRadius: 99, border:'none', cursor:'pointer',
                fontFamily:'var(--ui)', letterSpacing:'.04em', fontWeight:500,
                background: sector === s ? 'var(--gd)' : 'var(--s3)',
                color:      sector === s ? 'var(--g)'  : 'var(--t3)',
                transition: 'all .15s',
              }}
            >{s}</button>
          ))}
        </div>
      </div>

      {/* Stock rows */}
      <div style={{ flex:1, overflowY:'auto' }}>
        {filtered.map(c => {
          const active = c.symbol === activeSym
          const chgCol = c.change_pct == null ? 'var(--t3)' : c.change_pct >= 0 ? 'var(--g)' : 'var(--r)'
          return (
            <div key={c.symbol}
              onClick={() => selectSymbol(c.symbol)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                background:  active ? 'var(--s3)' : 'transparent',
                borderLeft:  active ? '2px solid var(--g)' : '2px solid transparent',
                transition:  'all .12s',
                borderBottom: '1px solid var(--b1)',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background='var(--s2)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background='transparent' }}
            >
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{
                    fontFamily:'var(--mono)', fontSize:12, fontWeight:500,
                    color: active ? 'var(--g)' : 'var(--t1)',
                  }}>{c.symbol}</div>
                  <div style={{ fontSize:10, color:'var(--t3)', marginTop:1 }}
                    title={c.name}
                  >{c.name.length > 18 ? c.name.slice(0,17)+'…' : c.name}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:500 }}>
                    ₹{fmt(c.close)}
                  </div>
                  <div style={{ fontSize:11, color:chgCol, fontFamily:'var(--mono)' }}>
                    {sign(c.change_pct)}
                  </div>
                </div>
              </div>

              {/* Sector dot */}
              <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:4 }}>
                <span style={{
                  width:5, height:5, borderRadius:'50%',
                  background: SECTOR_COLORS[c.sector] || 'var(--t3)',
                  display:'inline-block', flexShrink:0,
                }}/>
                <span style={{ fontSize:10, color:'var(--t4)' }}>{c.sector}</span>

                {/* Mini volume bar */}
                {c.volume && (
                  <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:3 }}>
                    <div style={{
                      width: Math.min(Math.round((c.volume / 5_000_000) * 30), 30),
                      height: 3, background:'var(--b3)', borderRadius:2,
                    }}/>
                    <span style={{ fontSize:9, color:'var(--t4)', fontFamily:'var(--mono)' }}>
                      {c.volume >= 1e6 ? (c.volume/1e6).toFixed(1)+'M' : (c.volume/1e3).toFixed(0)+'K'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
