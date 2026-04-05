import { useApp } from '../context/AppContext.jsx'
import { fmt, sign, cls } from '../api.js'
import s from './TopBar.module.css'

// Simulated index values (static for display; replace with real endpoint if available)
const INDICES = [
  { name: 'NIFTY 50',   val: 24198.50, chg: 0.38 },
  { name: 'SENSEX',     val: 79705.91, chg: 0.41 },
  { name: 'NIFTY BANK', val: 51489.15, chg: 0.22 },
  { name: 'NIFTY IT',   val: 39214.80, chg: -0.15 },
]

function Clock() {
  const now = new Date()
  const mkt = now.getHours() >= 9 && now.getHours() < 16
  return (
    <div className={s.clock}>
      <span className={`${s.mktDot} ${mkt ? s.mktOpen : s.mktClosed}`} />
      <span className={s.mktLabel}>{mkt ? 'Market Open' : 'Market Closed'}</span>
      <span className={s.time}>
        {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} IST
      </span>
    </div>
  )
}

export default function TopBar({ onSearch }) {
  const { activeSym, summary } = useApp()

  return (
    <header className={s.bar}>
      {/* Logo */}
      <div className={s.logo}>
        <div className={s.logoMark}>
          <svg viewBox="0 0 14 10" fill="none" width="14">
            <polyline points="1,9 4,4 7,6 10,2 13,4"
              stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span className={s.logoText}>PULSE</span>
        <span className={s.logoTag}>Terminal</span>
      </div>

      <div className={s.divider} />

      {/* Market indices */}
      <div className={s.indices}>
        {INDICES.map(idx => (
          <div key={idx.name} className={s.index}>
            <span className={s.idxName}>{idx.name}</span>
            <span className={s.idxVal}>{fmt(idx.val, 2)}</span>
            <span className={`${s.idxChg} ${cls(idx.chg)}`}>{sign(idx.chg)}</span>
          </div>
        ))}
      </div>

      <div className={s.spacer} />

      <Clock />

      <div className={s.divider} />

      {/* Search */}
      <div className={s.searchWrap}>
        <svg className={s.searchIco} viewBox="0 0 16 16" fill="none" width="12">
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="m11 11 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <input className={s.search} placeholder="Search symbol…"
          onChange={e => onSearch(e.target.value)} />
      </div>
    </header>
  )
}
