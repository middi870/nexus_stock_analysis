import { useState, useEffect, useMemo } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { api, fmt, sign } from '../api.js'

/**
 * Maps change_pct → cell background and border colours.
 * Always produces values safe for rgba().
 * Text is always white (opacity-adjusted) — never dark text on dark bg.
 */
function cellColour(pct) {
  if (pct == null) return { bg:'rgba(26,29,42,0.9)', border:'rgba(50,55,80,0.6)' }
  const a = Math.min(Math.abs(pct), 5) / 5  // normalise to 0–1

  if (pct >= 0) {
    // Neutral dark → vivid emerald
    const g = Math.round(60 + a * 137)
    return {
      bg:     `rgba(8,${g},50,0.88)`,
      border: `rgba(10,${Math.min(g+40,200)},70,${0.25 + a * 0.55})`,
    }
  } else {
    // Neutral dark → vivid crimson
    const r = Math.round(60 + a * 179)
    return {
      bg:     `rgba(${r},10,20,0.88)`,
      border: `rgba(${Math.min(r+30,255)},15,25,${0.25 + a * 0.55})`,
    }
  }
}

function HeatCell({ c, onClick }) {
  const pct           = c.change_pct ?? 0
  const { bg, border} = cellColour(pct)
  const abs           = Math.abs(pct)
  // Opacity: low-change cells slightly dim their text, high-change fully opaque
  const nameOp        = 0.45
  const chgOp         = 0.6 + Math.min(abs / 4, 1) * 0.4

  return (
    <div
      onClick={() => onClick(c.symbol)}
      style={{
        width: 116, height: 74,
        background: bg, border: `1px solid ${border}`,
        borderRadius: 7,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', padding: '6px 8px',
        textAlign: 'center', userSelect: 'none',
        transition: 'transform .12s, box-shadow .12s',
        position: 'relative',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'scale(1.07)'
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,.55)'
        e.currentTarget.style.zIndex    = '5'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'scale(1)'
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.zIndex    = '1'
      }}
    >
      {/* Symbol */}
      <div style={{
        fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700,
        color: 'rgba(255,255,255,0.95)', lineHeight: 1.1, letterSpacing: '.03em',
      }}>{c.symbol}</div>

      {/* Short name */}
      <div style={{
        fontSize: 8, color: `rgba(255,255,255,${nameOp})`,
        margin: '3px 0 4px', lineHeight: 1.2,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        maxWidth: 104,
      }}>{c.name?.split(' ').slice(0, 2).join(' ')}</div>

      {/* Change % */}
      <div style={{
        fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 800,
        color: `rgba(255,255,255,${chgOp})`, lineHeight: 1,
      }}>{sign(pct)}</div>

      {/* Price */}
      <div style={{
        fontFamily: 'var(--mono)', fontSize: 8,
        color: 'rgba(255,255,255,0.38)', marginTop: 3,
      }}>₹{fmt(c.close, 0)}</div>
    </div>
  )
}

export default function Heatmap() {
  const { companies, selectSymbol } = useApp()
  const [data, setData] = useState([])

  useEffect(() => {
    if (companies.length > 0) setData(companies)      // instant
    api.heatmap().then(d => { if (Array.isArray(d)) setData(d) }).catch(() => {})
  }, [companies])

  // Sector list in insertion order (first appearance)
  const sectors = useMemo(() => {
    const seen = new Set()
    data.forEach(d => seen.add(d.sector))
    return [...seen].sort()
  }, [data])

  // Stocks for a sector, sorted by change_pct descending
  const bySector = sec =>
    data.filter(d => d.sector === sec)
        .sort((a, b) => (b.change_pct ?? -99) - (a.change_pct ?? -99))

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* Header */}
      <div style={{
        padding: '9px 16px', borderBottom: '1px solid var(--b1)',
        background: 'var(--s1)', display: 'flex', alignItems: 'center',
        gap: 10, flexShrink: 0,
      }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--t1)', letterSpacing: '.03em' }}>
          Market Heatmap
        </span>
        <span style={{ fontSize: 9, color: 'var(--t4)', fontFamily: 'var(--mono)' }}>
          {data.length} stocks · {sectors.length} sectors
        </span>
        <div style={{ flex: 1 }}/>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 9,
          color: 'var(--t2)', fontFamily: 'var(--mono)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 24, height: 12, borderRadius: 3,
              background: 'linear-gradient(90deg,rgba(8,60,50,.9),rgba(8,197,80,.9))' }}/>
            <span>Gain</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 24, height: 12, borderRadius: 3,
              background: 'linear-gradient(90deg,rgba(60,10,20,.9),rgba(239,50,30,.9))' }}/>
            <span>Loss</span>
          </div>
          <span style={{ color: 'var(--t4)' }}>Equal size · White text</span>
        </div>
      </div>

      {/* Cells grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px 24px' }}>
        {data.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--t4)',
            fontSize: 12, fontFamily: 'var(--mono)' }}>Loading market data…</div>
        )}

        {sectors.map(sec => {
          const stocks = bySector(sec)
          if (stocks.length === 0) return null
          const avg   = stocks.reduce((a, b) => a + (b.change_pct ?? 0), 0) / stocks.length
          const avgUp = avg >= 0

          return (
            <div key={sec} style={{ marginBottom: 22 }}>
              {/* Sector row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
                <span style={{ fontWeight: 700, fontSize: 11, color: 'var(--t2)',
                  letterSpacing: '.05em', textTransform: 'uppercase' }}>
                  {sec}
                </span>
                <span style={{
                  fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, padding: '1px 7px',
                  borderRadius: 4,
                  background: avgUp ? 'var(--green-bg)' : 'var(--red-bg)',
                  color:      avgUp ? 'var(--green)'    : 'var(--red)',
                  border:     `1px solid ${avgUp ? 'var(--green-bd)' : 'var(--red-bd)'}`,
                }}>{sign(avg)} avg</span>
                <div style={{ flex: 1, height: 1, background: 'var(--b1)' }}/>
                <span style={{ fontSize: 9, color: 'var(--t4)', fontFamily: 'var(--mono)' }}>
                  {stocks.length}
                </span>
              </div>

              {/* Uniform cell grid */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
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
