import { useState, useEffect } from 'react'
import {
  ResponsiveContainer, ComposedChart, Line, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, Area
} from 'recharts'
import { useApp } from '../context/AppContext.jsx'
import { api, fmt, fmtVol, shortDate } from '../api.js'
import s from './ChartPanel.module.css'

const TT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className={s.tooltip}>
      <div className={s.ttDate}>{label}</div>
      {payload.filter(p => p.value != null).map((p, i) => (
        <div key={i} className={s.ttRow}>
          <span style={{ color: p.color || p.fill }}>{p.name}</span>
          <span>{typeof p.value === 'number' ? (p.name === 'Volume' ? fmtVol(p.value) : '₹' + fmt(p.value)) : '—'}</span>
        </div>
      ))}
    </div>
  )
}

const tick = { fill: 'var(--txt3)', fontFamily: 'var(--f-mono)', fontSize: 9 }

export default function ChartPanel() {
  const { activeSym, activePeriod } = useApp()
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    if (!activeSym) return
    setLoading(true); setError(null)
    api.data(activeSym, activePeriod)
      .then(d => { setRows(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [activeSym, activePeriod])

  if (loading) return <div className="loading-wrap"><div className="spinner"/><div className="spinner-txt">Loading…</div></div>
  if (error)   return <div className="err-box">{error}</div>

  const data = rows.map(r => ({
    date: shortDate(r.date),
    close: r.close, ma7: r.ma_7, ma20: r.ma_20,
    high: r.high, low: r.low,
    volume: r.volume,
    dailyReturn: r.daily_return,
  }))

  const prices = data.map(d => d.close).filter(Boolean)
  const minP   = Math.min(...prices) * 0.995
  const maxP   = Math.max(...prices) * 1.005

  return (
    <div className={`${s.wrap} fade-in`}>
      {/* Main price chart */}
      <div className="card">
        <div className="card-head">
          <span className="card-title">{activeSym} — Price History · {activePeriod}d</span>
          <div className={s.legend}>
            <span style={{ color: 'var(--teal)' }}>━ Close</span>
            <span style={{ color: 'var(--amber)' }}>╌ MA7</span>
            <span style={{ color: 'var(--blue)' }}>╌ MA20</span>
          </div>
        </div>
        <div className={s.bigChartWrap}>
          <ResponsiveContainer width="100%" height={340}>
            <ComposedChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="var(--teal)" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="var(--teal)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--ln)" strokeDasharray="0" />
              <XAxis dataKey="date" tick={tick} interval="preserveStartEnd" />
              <YAxis
                domain={[minP, maxP]}
                tick={tick} orientation="right" width={72}
                tickFormatter={v => '₹' + fmt(v, 0)}
              />
              <Tooltip content={<TT />} />
              <Area
                type="monotone" dataKey="close" name="Close"
                stroke="var(--teal)" strokeWidth={2}
                fill="url(#priceGrad)" dot={false}
              />
              <Line type="monotone" dataKey="ma7"  name="MA7"  stroke="var(--amber)" strokeWidth={1.2} dot={false} strokeDasharray="4 4" />
              <Line type="monotone" dataKey="ma20" name="MA20" stroke="var(--blue)"  strokeWidth={1.2} dot={false} strokeDasharray="6 4" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Volume + Return row */}
      <div className="g2">
        <div className="card">
          <div className="card-head"><span className="card-title">Volume</span></div>
          <div className={s.subChartWrap}>
            <ResponsiveContainer width="100%" height={130}>
              <ComposedChart data={data} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--ln)" />
                <XAxis dataKey="date" tick={tick} interval="preserveStartEnd" />
                <YAxis tick={tick} orientation="right" width={55} tickFormatter={fmtVol} />
                <Tooltip content={<TT />} />
                <Bar dataKey="volume" name="Volume" fill="rgba(77,158,255,.35)" stroke="rgba(77,158,255,.6)" strokeWidth={1} radius={[2, 2, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><span className="card-title">Daily Return %</span></div>
          <div className={s.subChartWrap}>
            <ResponsiveContainer width="100%" height={130}>
              <ComposedChart data={data} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--ln)" />
                <XAxis dataKey="date" tick={tick} interval="preserveStartEnd" />
                <YAxis tick={tick} orientation="right" width={40} />
                <Tooltip content={<TT />} />
                <Bar dataKey="dailyReturn" name="Return %"
                  fill="var(--teal)" radius={[2, 2, 0, 0]}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
