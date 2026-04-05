import { useApp } from '../context/AppContext.jsx'
import s from './Header.module.css'

const TABS = ['overview', 'chart', 'compare', 'movers', 'heatmap']
const PERIODS = [{ d: 30, l: '1M' }, { d: 90, l: '3M' }, { d: 180, l: '6M' }, { d: 365, l: '1Y' }]
const HIDE_PERIOD = ['compare', 'movers', 'heatmap']

export default function Header({ onSearch }) {
  const { activeTab, setActiveTab, activePeriod, setActivePeriod } = useApp()

  return (
    <header className={s.hdr}>
      <div className={s.logo}>
        <div className={s.mark}>
          <svg viewBox="0 0 14 10" fill="none" width="15">
            <polyline points="1,9 4,4 7,6.5 10,2 13,4"
              stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <div className={s.logoWord}>PULSE</div>
          <div className={s.logoSub}>NSE Intelligence</div>
        </div>
      </div>

      <div className={s.sep} />

      <div className={s.live}>
        <span className={s.dot} />
        <span>LIVE</span>
      </div>

      <div className={s.sep} />

      <nav className={s.nav}>
        {TABS.map(t => (
          <button key={t} className={`${s.navBtn} ${activeTab === t ? s.navOn : ''}`}
            onClick={() => setActiveTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </nav>

      <div className={s.sep} />

      <div className={s.periods} style={{ visibility: HIDE_PERIOD.includes(activeTab) ? 'hidden' : '' }}>
        {PERIODS.map(p => (
          <button key={p.d}
            className={`${s.per} ${activePeriod === p.d ? s.perOn : ''}`}
            onClick={() => setActivePeriod(p.d)}>
            {p.l}
          </button>
        ))}
      </div>

      <div className={s.sep} />

      <input className={s.search} placeholder="⌕  Search…"
        onChange={e => onSearch(e.target.value)} />
    </header>
  )
}
