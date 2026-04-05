import { useState } from 'react'
import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from 'recharts'
import { useApp } from '../context/AppContext.jsx'
import { api, fmt, shortDate } from '../api.js'
import s from './Compare.module.css'

const PERIODS = [{ d: 30, l: '1M' }, { d: 90, l: '3M' }, { d: 180, l: '6M' }, { d: 365, l: '1Y' }]
const tick = { fill: 'var(--txt3)', fontFamily: 'var(--f-mono)', fontSize: 9 }

const TT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className={s.tooltip}>
      <div className={s.ttDate}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} className={s.ttRow}>
          <span style={{ color: p.color }}>{p.name}</span>
          <span>{typeof p.value === 'number' ? p.value.toFixed(2) : '—'}</span>
        </div>
      ))}
    </div>
  )
}

export default function Compare() {
  const { companies, activeSym } = useApp()
  const other = companies.find(c => c.symbol !== activeSym)?.symbol || ''

  const [s1,      setS1]      = useState(activeSym)
  const [s2,      setS2]      = useState(other)
  const [period,  setPeriod]  = useState(90)
  const [result,  setResult]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  async function run() {
    if (!s1 || !s2 || s1 === s2) return
    setLoading(true); setError(null); setResult(null)
    try {
      const d = await api.compare(s1, s2, period)
      setResult(d)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const chartData = result?.series?.map(r => ({
    date:              shortDate(r.date),
    [`norm_${s1}`]:    r[`norm_${s1}`],
    [`norm_${s2}`]:    r[`norm_${s2}`],
  })) || []

  return (
    <div className={`${s.wrap} fade-in`}>
      {/* Picker */}
      <div className="card">
        <div className={s.picker}>
          <select className={s.sel} value={s1} onChange={e => setS1(e.target.value)}>
            {companies.map(c => <option key={c.symbol} value={c.symbol}>{c.symbol} — {c.name}</option>)}
          </select>
          <span className={s.vs}>vs</span>
          <select className={s.sel} value={s2} onChange={e => setS2(e.target.value)}>
            {companies.map(c => <option key={c.symbol} value={c.symbol}>{c.symbol} — {c.name}</option>)}
          </select>
          <div className={s.periods}>
            {PERIODS.map(p => (
              <button key={p.d}
                className={`${s.per} ${period === p.d ? s.perOn : ''}`}
                onClick={() => setPeriod(p.d)}>{p.l}</button>
            ))}
          </div>
          <button className={s.go} onClick={run}>Compare →</button>
        </div>
      </div>

      {loading && <div className="loading-wrap"><div className="spinner"/><div className="spinner-txt">Comparing…</div></div>}
      {error   && <div className="err-box">{error}</div>}

      {result && (
        <>
          {/* Stats */}
          <div className={s.statsRow}>
            {[
              { l: 'Correlation',     v: result.correlation.toFixed(3), cls: '' },
              { l: `${s1} Return`,    v: `${result.return1_pct >= 0 ? '+' : ''}${result.return1_pct}%`, cls: result.return1_pct >= 0 ? s.up : s.dn },
              { l: `${s2} Return`,    v: `${result.return2_pct >= 0 ? '+' : ''}${result.return2_pct}%`, cls: result.return2_pct >= 0 ? s.up : s.dn },
              { l: 'Period',          v: `${result.days}d`, cls: '' },
            ].map(({ l, v, cls }) => (
              <div key={l} className={`card ${s.statCell}`}>
                <div className={s.statLabel}>{l}</div>
                <div className={`${s.statVal} ${cls}`}>{v}</div>
              </div>
            ))}
          </div>

          {/* Normalised chart */}
          <div className="card">
            <div className="card-head">
              <span className="card-title">Normalised Performance (Base = 100)</span>
              <div className={s.legend}>
                <span style={{ color: 'var(--teal)' }}>● {s1}</span>
                <span style={{ color: 'var(--amber)' }}>● {s2}</span>
              </div>
            </div>
            <div className={s.chartWrap}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="var(--ln)" />
                  <XAxis dataKey="date" tick={tick} interval="preserveStartEnd" />
                  <YAxis tick={tick} orientation="right" width={45} />
                  <Tooltip content={<TT />} />
                  <Line type="monotone" dataKey={`norm_${s1}`} name={s1} stroke="var(--teal)"  strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey={`norm_${s2}`} name={s2} stroke="var(--amber)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
