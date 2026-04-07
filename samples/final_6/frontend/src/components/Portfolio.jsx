/**
 * Portfolio — localStorage-backed position tracker.
 * Users enter symbol + qty + buy price → see live P&L.
 * No backend changes needed — all client-side.
 */
import { useState, useMemo, useCallback } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { fmt, sign, cls } from '../api.js'
import { IcoX, IcoArrowUp, IcoArrowDown, IcoBarChart } from '../icons.jsx'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const STORE_KEY = 'nexus_portfolio_v1'

function loadPositions() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || [] }
  catch { return [] }
}
function savePositions(p) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(p)) } catch {}
}

const COLOURS = [
  '#22C55E','#3B82F6','#F59E0B','#EF4444','#8B5CF6',
  '#06B6D4','#F97316','#EC4899','#34D399','#A78BFA',
]

function fmt2(n) {
  if (n == null) return '—'
  if (Math.abs(n) >= 1e7) return (n/1e7).toFixed(2) + ' Cr'
  if (Math.abs(n) >= 1e5) return (n/1e5).toFixed(1) + ' L'
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 })
}

function PnlChip({ pnl, pct }) {
  const up = pnl >= 0
  return (
    <span style={{
      fontFamily:'var(--mono)', fontSize:11, fontWeight:700,
      color: up ? 'var(--green)' : 'var(--red)',
    }}>
      {up ? '+' : '−'}₹{fmt2(Math.abs(pnl))}
      <span style={{ fontSize:9, marginLeft:4, opacity:.8 }}>
        ({up ? '+' : ''}{pct?.toFixed(2)}%)
      </span>
    </span>
  )
}

const DEFAULT_FORM = { symbol:'', qty:'', buyPrice:'' }

export default function Portfolio() {
  const { companies, selectSymbol } = useApp()
  const [positions,  setPositions ] = useState(loadPositions)
  const [form,       setForm      ] = useState(DEFAULT_FORM)
  const [formError,  setFormError ] = useState('')

  const save = useCallback(next => {
    setPositions(next)
    savePositions(next)
  }, [])

  // Enrich positions with live data
  const enriched = useMemo(() => positions.map(pos => {
    const company = companies.find(c => c.symbol === pos.symbol)
    const cmp     = company?.close ?? null
    const cost    = pos.qty * pos.buyPrice
    const value   = cmp !== null ? pos.qty * cmp : null
    const pnl     = value !== null ? value - cost : null
    const pct     = cost > 0 && pnl !== null ? (pnl / cost) * 100 : null
    const dayPnl  = (company?.change_pct ?? null) !== null
      ? (company.change_pct / 100) * (value ?? cost)
      : null
    return { ...pos, company, cmp, cost, value, pnl, pct, dayPnl }
  }), [positions, companies])

  // Portfolio totals
  const totals = useMemo(() => {
    const totalCost  = enriched.reduce((a, p) => a + p.cost,        0)
    const totalValue = enriched.reduce((a, p) => a + (p.value ?? p.cost), 0)
    const totalPnl   = totalValue - totalCost
    const totalPct   = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0
    const dayPnl     = enriched.reduce((a, p) => a + (p.dayPnl ?? 0), 0)
    return { totalCost, totalValue, totalPnl, totalPct, dayPnl }
  }, [enriched])

  // Pie data — by current value
  const pieData = useMemo(() =>
    enriched
      .filter(p => p.value != null && p.value > 0)
      .map(p => ({ name: p.symbol, value: p.value }))
      .sort((a,b) => b.value - a.value)
  , [enriched])

  const syms = companies.map(c => c.symbol)

  const addPosition = () => {
    setFormError('')
    const sym = form.symbol.trim().toUpperCase()
    const qty = parseFloat(form.qty)
    const bp  = parseFloat(form.buyPrice)

    if (!sym || !syms.includes(sym)) {
      setFormError('Choose a valid NSE symbol')
      return
    }
    if (!qty || qty <= 0) { setFormError('Quantity must be > 0'); return }
    if (!bp  || bp  <= 0) { setFormError('Buy price must be > 0'); return }

    // Merge with existing position for same symbol
    const existing = positions.findIndex(p => p.symbol === sym)
    if (existing >= 0) {
      const old = positions[existing]
      const newQty = old.qty + qty
      const newAvg = (old.qty * old.buyPrice + qty * bp) / newQty
      const next = [...positions]
      next[existing] = { ...old, qty: newQty, buyPrice: +newAvg.toFixed(2) }
      save(next)
    } else {
      save([...positions, { symbol:sym, qty, buyPrice:bp, addedAt: Date.now() }])
    }
    setForm(DEFAULT_FORM)
  }

  const remove = sym => save(positions.filter(p => p.symbol !== sym))

  const exportCSV = () => {
    const header = 'Symbol,Qty,Buy Price,CMP,Cost,Value,P&L,P&L %,Day P&L'
    const rows   = enriched.map(p =>
      [p.symbol, p.qty, p.buyPrice,
       p.cmp ?? '', p.cost.toFixed(2),
       (p.value ?? '').toString(),
       (p.pnl ?? '').toString(),
       (p.pct?.toFixed(2) ?? ''),
       (p.dayPnl?.toFixed(2) ?? '')
      ].join(',')
    )
    const blob = new Blob([[header, ...rows].join('\n')], { type:'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `nexus-portfolio-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column',
      overflow:'hidden', background:'var(--bg)' }}>

      {/* Header */}
      <div style={{
        padding:'9px 16px', borderBottom:'1px solid var(--b1)',
        background:'var(--s1)', display:'flex', alignItems:'center',
        gap:10, flexShrink:0, flexWrap:'wrap',
      }}>
        <IcoBarChart size={14} stroke="var(--t2)"/>
        <span style={{ fontWeight:700, fontSize:13, color:'var(--t1)' }}>
          Portfolio Tracker
        </span>
        <span style={{ fontSize:9, color:'var(--t4)', fontFamily:'var(--mono)',
          background:'var(--s3)', padding:'2px 7px', borderRadius:3 }}>
          localStorage · private
        </span>
        {enriched.length > 0 && (
          <button className="btn btn-ghost" style={{ marginLeft:'auto', gap:5, fontSize:11 }}
            onClick={exportCSV}>
            Export CSV
          </button>
        )}
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'14px 16px' }}>

        {/* ── Summary cards ── */}
        {enriched.length > 0 && (
          <>
            <div style={{ display:'grid',
              gridTemplateColumns:'repeat(auto-fill,minmax(145px,1fr))',
              gap:8, marginBottom:20 }}>
              {[
                { label:'Total Invested', value:`₹${fmt2(totals.totalCost)}`,   color:'var(--t1)' },
                { label:'Current Value',  value:`₹${fmt2(totals.totalValue)}`,  color:'var(--t1)' },
                { label:'Total P&L',
                  value: <PnlChip pnl={totals.totalPnl} pct={totals.totalPct}/>,
                  color: totals.totalPnl >= 0 ? 'var(--green)' : 'var(--red)' },
                { label:"Today's P&L",
                  value: <span className={cls(totals.dayPnl)}>
                    {totals.dayPnl >= 0 ? '+' : '−'}₹{fmt2(Math.abs(totals.dayPnl))}
                  </span> },
              ].map(card => (
                <div key={card.label} style={{
                  background:'var(--s2)', border:'1px solid var(--b2)',
                  borderRadius:'var(--rr2)', padding:'11px 14px',
                }}>
                  <div style={{ fontSize:9, color:'var(--t3)', textTransform:'uppercase',
                    letterSpacing:'.08em', marginBottom:5 }}>{card.label}</div>
                  <div style={{ fontFamily:'var(--mono)', fontSize:14,
                    fontWeight:700, color: card.color, lineHeight:1 }}>
                    {card.value}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Allocation pie ── */}
            {pieData.length >= 2 && (
              <div style={{ display:'flex', gap:16, marginBottom:20,
                alignItems:'flex-start', flexWrap:'wrap' }}>
                <div style={{ width:170, height:170, flexShrink:0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" cx="50%" cy="50%"
                        innerRadius={45} outerRadius={80}
                        paddingAngle={2} stroke="none">
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={COLOURS[i % COLOURS.length]}/>
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background:'var(--s2)',
                          border:'1px solid var(--b2)', borderRadius:'var(--rr)',
                          fontSize:11, fontFamily:'var(--mono)' }}
                        formatter={(v, n) => [`₹${fmt2(v)}`, n]}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ flex:1, display:'flex', flexDirection:'column',
                  gap:6, justifyContent:'center' }}>
                  {pieData.map((d, i) => {
                    const pct = totals.totalValue > 0
                      ? (d.value / totals.totalValue * 100).toFixed(1)
                      : 0
                    return (
                      <div key={d.name} style={{ display:'flex',
                        alignItems:'center', gap:8 }}>
                        <div style={{ width:8, height:8, borderRadius:2, flexShrink:0,
                          background: COLOURS[i % COLOURS.length] }}/>
                        <span style={{ fontFamily:'var(--mono)', fontSize:11,
                          color:'var(--green)', fontWeight:600, width:80 }}>
                          {d.name}
                        </span>
                        <div style={{ flex:1, height:3, background:'var(--b2)',
                          borderRadius:99, overflow:'hidden' }}>
                          <div style={{ width:`${pct}%`, height:'100%',
                            background: COLOURS[i % COLOURS.length],
                            borderRadius:99 }}/>
                        </div>
                        <span style={{ fontFamily:'var(--mono)', fontSize:10,
                          color:'var(--t3)', width:36, textAlign:'right' }}>
                          {pct}%
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Positions table ── */}
        {enriched.length > 0 && (
          <div style={{ background:'var(--s1)', border:'1px solid var(--b1)',
            borderRadius:'var(--rr2)', overflow:'hidden', marginBottom:20 }}>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead>
                  <tr style={{ background:'var(--s2)' }}>
                    {['Symbol','Qty','Avg Buy','CMP','Cost','Value','P&L','Day P&L',''].map(h => (
                      <th key={h} style={{
                        padding:'7px 10px', textAlign:'left',
                        fontSize:9, fontWeight:700, letterSpacing:'.07em',
                        textTransform:'uppercase', color:'var(--t3)',
                        borderBottom:'1px solid var(--b2)', whiteSpace:'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {enriched.map(pos => (
                    <tr key={pos.symbol}
                      onClick={() => selectSymbol(pos.symbol)}
                      style={{ cursor:'pointer', transition:'background .1s' }}
                      onMouseEnter={e => e.currentTarget.style.background='var(--s3)'}
                      onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                      <td style={{ padding:'8px 10px', fontFamily:'var(--mono)',
                        fontWeight:700, color:'var(--green)',
                        borderBottom:'1px solid var(--b1)' }}>
                        {pos.symbol}
                      </td>
                      <td style={{ padding:'8px 10px', fontFamily:'var(--mono)',
                        borderBottom:'1px solid var(--b1)' }}>{pos.qty}</td>
                      <td style={{ padding:'8px 10px', fontFamily:'var(--mono)',
                        borderBottom:'1px solid var(--b1)' }}>
                        ₹{fmt(pos.buyPrice)}
                      </td>
                      <td style={{ padding:'8px 10px', fontFamily:'var(--mono)',
                        color: pos.cmp != null ? (pos.cmp >= pos.buyPrice ? 'var(--green)' : 'var(--red)') : 'var(--t3)',
                        borderBottom:'1px solid var(--b1)' }}>
                        {pos.cmp != null ? `₹${fmt(pos.cmp)}` : '—'}
                      </td>
                      <td style={{ padding:'8px 10px', fontFamily:'var(--mono)',
                        color:'var(--t2)', borderBottom:'1px solid var(--b1)' }}>
                        ₹{fmt2(pos.cost)}
                      </td>
                      <td style={{ padding:'8px 10px', fontFamily:'var(--mono)',
                        fontWeight:600, borderBottom:'1px solid var(--b1)' }}>
                        {pos.value != null ? `₹${fmt2(pos.value)}` : '—'}
                      </td>
                      <td style={{ padding:'8px 10px',
                        borderBottom:'1px solid var(--b1)' }}>
                        {pos.pnl != null
                          ? <PnlChip pnl={pos.pnl} pct={pos.pct}/>
                          : '—'}
                      </td>
                      <td style={{ padding:'8px 10px',
                        borderBottom:'1px solid var(--b1)',
                        fontFamily:'var(--mono)', fontSize:11,
                        color: (pos.dayPnl ?? 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                        {pos.dayPnl != null
                          ? `${pos.dayPnl >= 0 ? '+' : '−'}₹${fmt2(Math.abs(pos.dayPnl))}`
                          : '—'}
                      </td>
                      <td style={{ padding:'8px 8px',
                        borderBottom:'1px solid var(--b1)' }}>
                        <button className="btn-icon"
                          onClick={e => { e.stopPropagation(); remove(pos.symbol) }}
                          title="Remove position">
                          <IcoX size={13}/>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Add position form ── */}
        <div style={{ background:'var(--s1)', border:'1px solid var(--b1)',
          borderRadius:'var(--rr2)', padding:'14px 16px' }}>
          <div style={{ fontSize:11, fontWeight:600, color:'var(--t2)',
            marginBottom:12 }}>
            {enriched.length === 0 ? 'Add your first position' : 'Add position'}
          </div>

          <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'flex-end' }}>
            {/* Symbol */}
            <div style={{ flex:'1 1 120px', minWidth:120 }}>
              <label style={{ fontSize:9, color:'var(--t3)', display:'block',
                textTransform:'uppercase', letterSpacing:'.07em', marginBottom:4 }}>
                Symbol
              </label>
              <select className="input"
                value={form.symbol}
                onChange={e => setForm(f => ({ ...f, symbol:e.target.value }))}>
                <option value="">Select…</option>
                {syms.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Quantity */}
            <div style={{ flex:'1 1 90px', minWidth:90 }}>
              <label style={{ fontSize:9, color:'var(--t3)', display:'block',
                textTransform:'uppercase', letterSpacing:'.07em', marginBottom:4 }}>
                Quantity
              </label>
              <input className="input" type="number" min="1" placeholder="Shares"
                value={form.qty}
                onChange={e => setForm(f => ({ ...f, qty:e.target.value }))}/>
            </div>

            {/* Buy Price */}
            <div style={{ flex:'1 1 120px', minWidth:120 }}>
              <label style={{ fontSize:9, color:'var(--t3)', display:'block',
                textTransform:'uppercase', letterSpacing:'.07em', marginBottom:4 }}>
                Buy Price (₹)
              </label>
              <input className="input" type="number" min="0.01" step="0.01"
                placeholder="Avg cost"
                value={form.buyPrice}
                onChange={e => setForm(f => ({ ...f, buyPrice:e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && addPosition()}/>
            </div>

            {/* Add button */}
            <button className="btn btn-primary" style={{ alignSelf:'flex-end' }}
              onClick={addPosition}>
              Add Position
            </button>
          </div>

          {formError && (
            <div style={{ marginTop:8, fontSize:11, color:'var(--red)',
              fontFamily:'var(--mono)' }}>
              {formError}
            </div>
          )}

          <div style={{ marginTop:12, fontSize:9, color:'var(--t4)',
            fontFamily:'var(--mono)', lineHeight:1.6 }}>
            Adding the same symbol again will merge at weighted average price.
            All data is stored locally — never sent to any server.
          </div>
        </div>

        {/* Empty state */}
        {enriched.length === 0 && (
          <div style={{ textAlign:'center', padding:'32px 0',
            color:'var(--t4)', fontFamily:'var(--mono)', fontSize:12 }}>
            No positions yet — add your first holding above
          </div>
        )}
      </div>
    </div>
  )
}
