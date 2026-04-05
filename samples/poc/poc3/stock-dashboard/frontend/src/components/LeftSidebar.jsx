import { useMemo } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { fmt } from '../api.js'
import s from './LeftSidebar.module.css'

function Spark({ data }) {
  if (!data || data.length < 2) return null
  const W = 44, H = 18
  const mn = Math.min(...data), mx = Math.max(...data)
  const span = mx - mn || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W
    const y = H - ((v - mn) / span) * H
    return `${x},${y}`
  }).join(' ')
  const up = data[data.length - 1] >= data[0]
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <polyline points={pts} fill="none"
        stroke={up ? 'var(--teal)' : 'var(--red)'}
        strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}

export default function LeftSidebar({ query }) {
  const { companies, activeSym, setActiveSym } = useApp()

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return companies.filter(c =>
      c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
    )
  }, [companies, query])

  const sectors = useMemo(() =>
    [...new Set(filtered.map(c => c.sector))].sort(), [filtered])

  return (
    <aside className={s.sidebar}>
      <div className={s.head}>
        <span className={s.headLabel}>NSE Companies</span>
        <span className={s.headCount}>{companies.length}</span>
      </div>
      <div className={s.list}>
        {sectors.map(sec => (
          <div key={sec}>
            <div className={s.sector}>{sec}</div>
            {filtered.filter(c => c.sector === sec).map(c => {
              const up = (c.change_pct || 0) >= 0
              return (
                <div key={c.symbol}
                  className={`${s.row} ${activeSym === c.symbol ? s.active : ''}`}
                  onClick={() => setActiveSym(c.symbol)}>
                  <div className={s.spark}>
                    {c._closes && <Spark data={c._closes} />}
                  </div>
                  <div className={s.info}>
                    <div className={s.sym}>{c.symbol}</div>
                    <div className={s.name}>{c.name}</div>
                  </div>
                  <div className={s.nums}>
                    <div className={s.price}>₹{fmt(c.latest_close)}</div>
                    <div className={`${s.chg} ${up ? s.up : s.dn}`}>
                      {up ? '+' : ''}{c.change_pct}%
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </aside>
  )
}
