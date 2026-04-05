import { useApp } from '../context/AppContext.jsx'
import { fmt } from '../api.js'
import s from './Heatmap.module.css'

function heatColor(chg, max) {
  const t = Math.abs(chg) / (max + 0.01)
  if (chg >= 0) {
    const g = Math.floor(80 + t * 175)
    const r = Math.floor(t * 20)
    return `rgb(${r}, ${g}, 60)`
  }
  const r = Math.floor(120 + t * 135)
  return `rgb(${r}, 30, 50)`
}

export default function Heatmap() {
  const { companies, setActiveSym, setActiveTab } = useApp()

  const all = companies.map(c => ({ ...c, chg: c.change_pct || 0 }))
  const max = Math.max(...all.map(c => Math.abs(c.chg)))

  function goTo(sym) { setActiveSym(sym); setActiveTab('overview') }

  return (
    <div className={`${s.wrap} fade-in`}>
      <div className="card">
        <div className="card-head">
          <span className="card-title">Market Heatmap — Daily Change %</span>
          <div className={s.scale}>
            <span style={{ color: 'var(--red)' }}>▼ Loss</span>
            <div className={s.scaleBar} />
            <span style={{ color: 'var(--teal)' }}>▲ Gain</span>
          </div>
        </div>
        <div className={s.grid}>
          {all.map(c => (
            <div key={c.symbol}
              className={s.cell}
              style={{ background: heatColor(c.chg, max) }}
              onClick={() => goTo(c.symbol)}>
              <div className={s.csym}>{c.symbol}</div>
              <div className={s.cpct}>{c.chg >= 0 ? '+' : ''}{c.chg}%</div>
              <div className={s.cprice}>₹{fmt(c.latest_close)}</div>
              <div className={s.cname}>{c.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Sector breakdown */}
      <div className="card">
        <div className="card-head"><span className="card-title">Sector Performance</span></div>
        <div className={s.sectors}>
          {[...new Set(companies.map(c => c.sector))].sort().map(sec => {
            const secCos = companies.filter(c => c.sector === sec)
            const avg    = secCos.reduce((a, c) => a + (c.change_pct || 0), 0) / secCos.length
            const up     = avg >= 0
            return (
              <div key={sec} className={s.secRow}>
                <span className={s.secName}>{sec}</span>
                <div className={s.secBarWrap}>
                  <div className={`${s.secBar} ${up ? s.secUp : s.secDn}`}
                    style={{ width: `${Math.min(100, Math.abs(avg) * 25)}%` }} />
                </div>
                <span className={`${s.secPct} ${up ? s.up : s.dn}`}>
                  {up ? '+' : ''}{avg.toFixed(2)}%
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
