import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { api, fmt } from '../api.js'
import s from './Movers.module.css'

export default function Movers() {
  const { setActiveSym, setActiveTab } = useApp()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    api.topMovers(6)
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  function goTo(sym) {
    setActiveSym(sym)
    setActiveTab('overview')
  }

  if (loading) return <div className="loading-wrap"><div className="spinner"/><div className="spinner-txt">Loading movers…</div></div>
  if (error)   return <div className="err-box">{error}</div>
  if (!data)   return null

  const Row = ({ m, rank }) => {
    const up = m.change_pct >= 0
    return (
      <div className={s.row} onClick={() => goTo(m.symbol)}>
        <span className={s.rank}>{rank}</span>
        <div className={s.info}>
          <div className={s.sym}>{m.symbol}</div>
          <div className={s.name}>{m.name}</div>
        </div>
        <div className={s.sector}>{m.sector}</div>
        <div className={s.price}>₹{fmt(m.close)}</div>
        <div className={`${s.pct} ${up ? s.up : s.dn}`}>
          {up ? '+' : ''}{m.change_pct}%
        </div>
        <div className={s.bar}>
          <div
            className={`${s.barFill} ${up ? s.barUp : s.barDn}`}
            style={{ width: `${Math.min(100, Math.abs(m.change_pct) * 20)}%` }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className={`${s.wrap} fade-in`}>
      <div className="g2">
        <div className="card">
          <div className="card-head">
            <span className="card-title">Top Gainers</span>
            <span className={s.badge + ' ' + s.gainBadge}>▲ Today</span>
          </div>
          <div className={s.list}>
            {data.gainers.map((m, i) => <Row key={m.symbol} m={m} rank={i + 1} />)}
          </div>
        </div>
        <div className="card">
          <div className="card-head">
            <span className="card-title">Top Losers</span>
            <span className={s.badge + ' ' + s.lossBadge}>▼ Today</span>
          </div>
          <div className={s.list}>
            {data.losers.map((m, i) => <Row key={m.symbol} m={m} rank={i + 1} />)}
          </div>
        </div>
      </div>
    </div>
  )
}
