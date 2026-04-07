/**
 * SectorChart — ranked horizontal bar chart of all 11 sectors by avg daily change.
 * Also shows individual stock breakdown when a sector is clicked.
 */
import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { api, sign, fmt, cls } from '../api.js'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts'

function SectorTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const v = payload[0]?.value
  const up = v >= 0
  return (
    <div style={{
      background:'var(--s2)', border:'1px solid var(--b2)',
      borderRadius:'var(--rr)', padding:'9px 12px',
      fontFamily:'var(--mono)', fontSize:11,
      boxShadow:'0 8px 24px rgba(0,0,0,.6)',
    }}>
      <div style={{ fontWeight:700, color:'var(--t1)', marginBottom:3 }}>{label}</div>
      <div style={{ color: up ? 'var(--green)' : 'var(--red)', fontWeight:700 }}>
        {sign(v)} avg
      </div>
    </div>
  )
}

export default function SectorChart() {
  const { companies, selectSymbol } = useApp()
  const [sectors,       setSectors      ] = useState([])
  const [selectedSector,setSelectedSector] = useState(null)

  useEffect(() => {
    // Derive from companies (instant — no API call needed)
    if (!companies.length) return

    const map = {}
    companies.forEach(c => {
      if (c.change_pct == null) return
      if (!map[c.sector]) map[c.sector] = { stocks:[], total:0 }
      map[c.sector].stocks.push(c)
      map[c.sector].total += c.change_pct
    })

    const data = Object.entries(map).map(([sector, { stocks, total }]) => ({
      sector,
      avg: +(total / stocks.length).toFixed(3),
      count: stocks.length,
      stocks: [...stocks].sort((a,b) => (b.change_pct??0) - (a.change_pct??0)),
    })).sort((a,b) => b.avg - a.avg)

    setSectors(data)
  }, [companies])

  const selected = selectedSector
    ? sectors.find(s => s.sector === selectedSector)
    : null

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column',
      overflow:'hidden', background:'var(--bg)' }}>

      {/* Header */}
      <div style={{
        padding:'9px 16px', borderBottom:'1px solid var(--b1)',
        background:'var(--s1)', display:'flex', alignItems:'center',
        gap:10, flexShrink:0,
      }}>
        <span style={{ fontWeight:700, fontSize:13, color:'var(--t1)' }}>
          Sector Performance
        </span>
        <span style={{ fontSize:9, color:'var(--t4)', fontFamily:'var(--mono)' }}>
          {sectors.length} sectors · daily avg change
        </span>
        {selectedSector && (
          <button onClick={() => setSelectedSector(null)}
            style={{ marginLeft:'auto', fontSize:10, color:'var(--t3)',
              background:'var(--s3)', border:'1px solid var(--b2)',
              borderRadius:'var(--rr)', padding:'3px 10px', cursor:'pointer',
              fontFamily:'var(--ui)' }}>
            ← All sectors
          </button>
        )}
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'16px' }}>

        {!selectedSector && (
          <>
            {/* Horizontal bar chart */}
            <div style={{ height: Math.max(300, sectors.length * 38),
              marginBottom:20 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sectors} layout="vertical"
                  margin={{ left:10, right:60, top:4, bottom:0 }}>
                  <CartesianGrid strokeDasharray="1 5"
                    stroke="var(--b1)" horizontal={false}/>
                  <XAxis type="number" domain={['auto','auto']}
                    tick={{ fontSize:9, fill:'var(--t3)', fontFamily:'var(--mono)' }}
                    tickLine={false} axisLine={{ stroke:'var(--b2)' }}
                    tickFormatter={v => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`}/>
                  <YAxis type="category" dataKey="sector" width={90}
                    tick={{ fontSize:10, fill:'var(--t2)', fontFamily:'var(--ui)',
                      fontWeight:500 }}
                    tickLine={false} axisLine={false}/>
                  <Tooltip content={<SectorTip/>}/>
                  <ReferenceLine x={0} stroke="var(--b3)" strokeWidth={1.5}/>
                  <Bar dataKey="avg" radius={[0,3,3,0]}
                    onClick={d => setSelectedSector(d.sector)}
                    cursor="pointer">
                    {sectors.map((s, i) => (
                      <Cell key={i}
                        fill={s.avg >= 0 ? 'var(--green)' : 'var(--red)'}
                        fillOpacity={0.7 + Math.min(Math.abs(s.avg)/5, 0.3)}/>
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Summary table */}
            <div style={{ background:'var(--s1)', border:'1px solid var(--b1)',
              borderRadius:'var(--rr2)', overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead>
                  <tr style={{ background:'var(--s2)' }}>
                    {['Sector','Stocks','Avg Change','Best','Worst'].map(h => (
                      <th key={h} style={{
                        padding:'7px 12px', textAlign:'left', fontSize:9,
                        fontWeight:700, letterSpacing:'.07em', textTransform:'uppercase',
                        color:'var(--t3)', borderBottom:'1px solid var(--b2)',
                        whiteSpace:'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sectors.map(s => {
                    const best  = s.stocks[0]
                    const worst = s.stocks[s.stocks.length - 1]
                    return (
                      <tr key={s.sector}
                        onClick={() => setSelectedSector(s.sector)}
                        style={{ cursor:'pointer', transition:'background .1s' }}
                        onMouseEnter={e => e.currentTarget.style.background='var(--s3)'}
                        onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                        <td style={{ padding:'8px 12px', fontWeight:600,
                          color:'var(--t1)', borderBottom:'1px solid var(--b1)' }}>
                          {s.sector}
                        </td>
                        <td style={{ padding:'8px 12px', color:'var(--t3)',
                          fontFamily:'var(--mono)', fontSize:11,
                          borderBottom:'1px solid var(--b1)' }}>
                          {s.count}
                        </td>
                        <td style={{ padding:'8px 12px', fontFamily:'var(--mono)',
                          fontWeight:700, fontSize:12,
                          color: s.avg >= 0 ? 'var(--green)' : 'var(--red)',
                          borderBottom:'1px solid var(--b1)' }}>
                          {sign(s.avg)}
                        </td>
                        <td style={{ padding:'8px 12px',
                          borderBottom:'1px solid var(--b1)' }}>
                          <span style={{ fontFamily:'var(--mono)', fontSize:11,
                            color:'var(--green)', fontWeight:600 }}>
                            {best?.symbol}
                          </span>
                          <span style={{ fontSize:10, color:'var(--t3)',
                            marginLeft:5, fontFamily:'var(--mono)' }}>
                            {sign(best?.change_pct)}
                          </span>
                        </td>
                        <td style={{ padding:'8px 12px',
                          borderBottom:'1px solid var(--b1)' }}>
                          <span style={{ fontFamily:'var(--mono)', fontSize:11,
                            color:'var(--red)', fontWeight:600 }}>
                            {worst?.symbol}
                          </span>
                          <span style={{ fontSize:10, color:'var(--t3)',
                            marginLeft:5, fontFamily:'var(--mono)' }}>
                            {sign(worst?.change_pct)}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── Drill-down: sector stocks ── */}
        {selected && (
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10,
              marginBottom:14 }}>
              <span style={{ fontWeight:700, fontSize:14, color:'var(--t1)' }}>
                {selected.sector}
              </span>
              <span className={cls(selected.avg)}
                style={{ fontFamily:'var(--mono)', fontSize:13, fontWeight:700 }}>
                {sign(selected.avg)} avg
              </span>
              <span style={{ fontSize:10, color:'var(--t4)',
                fontFamily:'var(--mono)' }}>
                {selected.count} stocks
              </span>
            </div>

            <div style={{ display:'grid',
              gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',
              gap:8 }}>
              {selected.stocks.map(stock => {
                const up = (stock.change_pct ?? 0) >= 0
                return (
                  <div key={stock.symbol}
                    onClick={() => { selectSymbol(stock.symbol) }}
                    style={{
                      background:'var(--s2)', border:'1px solid var(--b2)',
                      borderRadius:'var(--rr2)', padding:'12px 14px',
                      cursor:'pointer', transition:'all .12s',
                      borderLeft:`3px solid ${up ? 'var(--green)' : 'var(--red)'}`,
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background='var(--s3)'
                      e.currentTarget.style.transform='translateY(-1px)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background='var(--s2)'
                      e.currentTarget.style.transform='none'
                    }}>
                    <div style={{ display:'flex', justifyContent:'space-between',
                      alignItems:'flex-start', marginBottom:6 }}>
                      <div>
                        <div style={{ fontFamily:'var(--mono)', fontSize:12,
                          fontWeight:700, color:'var(--green)' }}>
                          {stock.symbol}
                        </div>
                        <div style={{ fontSize:10, color:'var(--t3)', marginTop:1 }}>
                          {stock.name}
                        </div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontFamily:'var(--mono)', fontSize:13,
                          fontWeight:700, color:'var(--t1)' }}>
                          ₹{fmt(stock.close)}
                        </div>
                        <div className={cls(stock.change_pct)}
                          style={{ fontFamily:'var(--mono)', fontSize:11,
                            fontWeight:700, marginTop:2 }}>
                          {sign(stock.change_pct)}
                        </div>
                      </div>
                    </div>

                    {/* Mini progress bar: change magnitude */}
                    <div style={{ height:2, background:'var(--b2)',
                      borderRadius:99, overflow:'hidden' }}>
                      <div style={{
                        width: `${Math.min(Math.abs(stock.change_pct ?? 0) / 5 * 100, 100)}%`,
                        height:'100%',
                        background: up ? 'var(--green)' : 'var(--red)',
                        borderRadius:99,
                      }}/>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
