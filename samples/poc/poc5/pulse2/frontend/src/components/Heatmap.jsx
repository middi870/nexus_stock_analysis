import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { api, fmt, sign, cls } from '../api.js'
import s from './Heatmap.module.css'

function heatColor(chg, maxAbs) {
  const t = Math.min(1, Math.abs(chg) / (maxAbs + 0.01))
  if (chg > 0) {
    const g = Math.floor(100 + t * 114)
    const r = Math.floor(t * 14)
    return `rgb(${r},${g},${Math.floor(60 + t * 10)})`
  }
  const r = Math.floor(120 + t * 135)
  return `rgb(${r},${Math.floor(20 + t * 10)},${Math.floor(30 + t * 20)})`
}

function HeatCell({ co, maxAbs, onClick }) {
  const chg = co.change_pct || 0
  const bg  = heatColor(chg, maxAbs)
  const up  = chg >= 0
  return (
    <div
      className={s.cell}
      style={{ background: bg }}
      onClick={() => onClick(co.symbol)}
      title={`${co.symbol}: ${sign(co.change_pct)}`}
    >
      <div className={s.csym}>{co.symbol}</div>
      <div className={s.cpct}>{sign(co.change_pct)}</div>
      <div className={s.cprice}>₹{fmt(co.close)}</div>
      <div className={s.cname}>{co.name}</div>
    </div>
  )
}

export default function Heatmap() {
  const { companies, setActiveSym, setTab, tab } = useApp()
  const [sectors, setSectors] = useState([])
  const [view,    setView]    = useState('all') // all | sector

  useEffect(() => {
    api.sectors().then(setSectors).catch(() => {})
  }, [])

  if (tab !== 'heatmap') return null

  function goTo(sym) { setActiveSym(sym); setTab('chart') }

  const all    = [...companies].sort((a, b) => (b.change_pct || 0) - (a.change_pct || 0))
  const maxAbs = Math.max(...all.map(c => Math.abs(c.change_pct || 0)), 0.1)

  return (
    <div className={s.panel}>
      {/* Header */}
      <div className={s.header}>
        <div className={s.headerLeft}>
          <span className={s.title}>Market Heatmap</span>
          <span className={s.subtitle}>Daily Change % · Click to open chart</span>
        </div>
        <div className={s.viewToggle}>
          <button className={`${s.vBtn} ${view === 'all' ? s.vOn : ''}`} onClick={() => setView('all')}>All Stocks</button>
          <button className={`${s.vBtn} ${view === 'sector' ? s.vOn : ''}`} onClick={() => setView('sector')}>By Sector</button>
        </div>
        <div className={s.legend}>
          <div className={s.legendBar} />
          <div className={s.legendLabels}>
            <span className="dn">–5%</span>
            <span className={s.mid}>0</span>
            <span className="up">+5%</span>
          </div>
        </div>
      </div>

      {view === 'all' ? (
        <div className={s.grid}>
          {all.map(co => (
            <HeatCell key={co.symbol} co={co} maxAbs={maxAbs} onClick={goTo} />
          ))}
        </div>
      ) : (
        <div className={s.sectorView}>
          {sectors
            .sort((a, b) => b.avg_change - a.avg_change)
            .map(sec => {
              const secCos = companies.filter(c => c.sector === sec.sector)
              const secMax = Math.max(...secCos.map(c => Math.abs(c.change_pct || 0)), 0.1)
              const up     = sec.avg_change >= 0
              return (
                <div key={sec.sector} className={s.secBlock}>
                  <div className={s.secHead}>
                    <span className={s.secName}>{sec.sector}</span>
                    <span className={`${s.secAvg} ${up ? s.up : s.dn}`}>
                      Avg {sign(sec.avg_change)}
                    </span>
                    <div className={s.secBarWrap}>
                      <div
                        className={`${s.secBar} ${up ? s.barUp : s.barDn}`}
                        style={{ width: `${Math.min(100, Math.abs(sec.avg_change) * 20)}%` }}
                      />
                    </div>
                    <span className={s.secCount}>{sec.count} stocks</span>
                  </div>
                  <div className={s.secGrid}>
                    {secCos
                      .sort((a, b) => (b.change_pct || 0) - (a.change_pct || 0))
                      .map(co => (
                        <HeatCell key={co.symbol} co={co} maxAbs={secMax} onClick={goTo} />
                      ))}
                  </div>
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}
