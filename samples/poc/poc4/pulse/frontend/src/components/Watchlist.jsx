import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { fmt, sign, cls } from '../api.js'
import s from './Watchlist.module.css'

function MiniBar({ pct, up }) {
  return (
    <div className={s.miniBar}>
      <div className={`${s.miniBarFill} ${up ? s.barUp : s.barDn}`}
        style={{ width: `${Math.min(100, Math.abs(pct || 0) * 20)}%` }} />
    </div>
  )
}

function CompanyRow({ co, active, onSelect }) {
  const up = (co.change_pct || 0) >= 0
  return (
    <div className={`${s.row} ${active ? s.rowActive : ''}`} onClick={() => onSelect(co.symbol)}>
      <div className={s.rowLeft}>
        <div className={s.sym}>{co.symbol}</div>
        <div className={s.sector}>{co.sector}</div>
      </div>
      <div className={s.rowRight}>
        <div className={`${s.price} ${up ? s.up : s.dn}`}>
          ₹{fmt(co.close)}
        </div>
        <div className={s.chgRow}>
          <span className={`${s.chg} ${up ? s.up : s.dn}`}>{sign(co.change_pct)}</span>
          <MiniBar pct={co.change_pct} up={up} />
        </div>
      </div>
    </div>
  )
}

export default function Watchlist({ query }) {
  const { companies, activeSym, setActiveSym, watchlist, isWatched, toggleWatch } = useApp()
  const [showAll, setShowAll] = useState(false)
  const [sortBy,  setSortBy]  = useState('change') // change | name | price

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return companies.filter(c =>
      c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
    )
  }, [companies, query])

  const watched = useMemo(() => filtered.filter(c => watchlist.includes(c.symbol)), [filtered, watchlist])
  const all     = useMemo(() => {
    const arr = [...filtered]
    if (sortBy === 'change') arr.sort((a,b) => (b.change_pct||0) - (a.change_pct||0))
    if (sortBy === 'name')   arr.sort((a,b) => a.symbol.localeCompare(b.symbol))
    if (sortBy === 'price')  arr.sort((a,b) => (b.close||0) - (a.close||0))
    return arr
  }, [filtered, sortBy])

  const displayList = showAll ? all : (watched.length ? watched : all.slice(0, 8))

  // Top gainers/losers for quick glance
  const sorted = [...companies].sort((a,b) => (b.change_pct||0)-(a.change_pct||0))
  const topGainer = sorted[0], topLoser = sorted[sorted.length-1]

  return (
    <aside className={s.sidebar}>
      {/* Mini market summary */}
      <div className={s.marketSummary}>
        <div className={s.summaryCell}>
          <span className={s.summaryLabel}>Top Gainer</span>
          {topGainer && (
            <div className={s.summaryVal}>
              <span className={s.summarySymbol} onClick={() => setActiveSym(topGainer.symbol)}>
                {topGainer.symbol}
              </span>
              <span className="up">+{topGainer.change_pct}%</span>
            </div>
          )}
        </div>
        <div className={s.summaryDivider}/>
        <div className={s.summaryCell}>
          <span className={s.summaryLabel}>Top Loser</span>
          {topLoser && (
            <div className={s.summaryVal}>
              <span className={s.summarySymbol} onClick={() => setActiveSym(topLoser.symbol)}>
                {topLoser.symbol}
              </span>
              <span className="dn">{topLoser.change_pct}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Watchlist header */}
      <div className={s.head}>
        <div className={s.headLeft}>
          <button className={`${s.viewBtn} ${!showAll ? s.viewOn : ''}`} onClick={() => setShowAll(false)}>
            Watchlist
          </button>
          <button className={`${s.viewBtn} ${showAll ? s.viewOn : ''}`} onClick={() => setShowAll(true)}>
            All ({companies.length})
          </button>
        </div>
        {showAll && (
          <select className={s.sortSel} value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="change">By Change</option>
            <option value="name">By Name</option>
            <option value="price">By Price</option>
          </select>
        )}
      </div>

      {/* Column headers */}
      <div className={s.colHdr}>
        <span>SYMBOL</span>
        <span>LTP / CHG</span>
      </div>

      {/* List */}
      <div className={s.list}>
        {displayList.map(co => (
          <div key={co.symbol} className={s.rowWrap}>
            <CompanyRow
              co={co}
              active={activeSym === co.symbol}
              onSelect={setActiveSym}
            />
            <button
              className={`${s.watchBtn} ${isWatched(co.symbol) ? s.watched : ''}`}
              onClick={e => { e.stopPropagation(); toggleWatch(co.symbol) }}
              title={isWatched(co.symbol) ? 'Remove from watchlist' : 'Add to watchlist'}
            >
              {isWatched(co.symbol) ? '★' : '☆'}
            </button>
          </div>
        ))}
      </div>

      {/* Sector summary at bottom */}
      <div className={s.sectorBar}>
        <div className={s.sectorLabel}>Sectors</div>
        {[...new Set(companies.map(c=>c.sector))].sort().map(sec => {
          const cos  = companies.filter(c=>c.sector===sec)
          const avg  = cos.reduce((a,c)=>a+(c.change_pct||0),0)/cos.length
          const up   = avg>=0
          return (
            <div key={sec} className={s.secRow}>
              <span className={s.secName}>{sec}</span>
              <span className={`${s.secChg} ${up ? s.up : s.dn}`}>{sign(avg)}</span>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
