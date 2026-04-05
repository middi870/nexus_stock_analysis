import { useState } from 'react'
import {
  ResponsiveContainer, ComposedChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts'
import { useApp } from '../context/AppContext.jsx'
import { api, fmt, sign, cls, sd } from '../api.js'
import s from './Compare.module.css'

const PERIODS = [{ d:30,l:'1M' },{ d:90,l:'3M' },{ d:180,l:'6M' },{ d:365,l:'1Y' }]
const xtick   = { fill:'var(--t3)', fontFamily:'var(--mono)', fontSize:9 }
const ytick   = { fill:'var(--t3)', fontFamily:'var(--mono)', fontSize:9 }

const TT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className={s.tt}>
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
  const { companies, activeSym, tab } = useApp()
  const other = companies.find(c => c.symbol !== activeSym)?.symbol || ''

  const [s1,      setS1]      = useState(activeSym)
  const [s2,      setS2]      = useState(other)
  const [period,  setPeriod]  = useState(90)
  const [result,  setResult]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  if (tab !== 'compare') return null

  async function run() {
    if (!s1 || !s2 || s1 === s2) return
    setLoading(true); setError(null); setResult(null)
    try {
      const d = await api.compare(s1, s2, period)
      setResult(d)
    } catch(e) { setError(e.message) }
    finally    { setLoading(false) }
  }

  const chartData = result?.series?.map(r => ({
    date:       sd(r.date),
    [s1]:       r[`norm_${s1}`],
    [s2]:       r[`norm_${s2}`],
  })) || []

  return (
    <div className={s.panel}>
      {/* Picker */}
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
              className={`${s.perBtn} ${period === p.d ? s.perOn : ''}`}
              onClick={() => setPeriod(p.d)}>{p.l}</button>
          ))}
        </div>
        <button className={s.goBtn} onClick={run} disabled={loading || s1 === s2}>
          {loading ? '…' : 'Compare →'}
        </button>
      </div>

      <div className={s.content}>
        {loading && <div className="spin-center"><div className="spinner"/></div>}
        {error   && <div className="err-panel" style={{margin:16}}>{error}</div>}

        {!result && !loading && !error && (
          <div className={s.empty}>
            <div className={s.emptyIcon}>⇄</div>
            <div className={s.emptyTxt}>Select two stocks and click Compare</div>
          </div>
        )}

        {result && (
          <div className={`${s.resultWrap} fade`}>
            {/* Stat cards */}
            <div className={s.statRow}>
              {[
                { l:'Correlation',       v: result.correlation.toFixed(3), hint: Math.abs(result.correlation) > 0.7 ? 'Highly correlated' : Math.abs(result.correlation) < 0.3 ? 'Low correlation' : 'Moderate correlation' },
                { l:`${s1} Return`,      v: sign(result.return1),          c: cls(result.return1) },
                { l:`${s2} Return`,      v: sign(result.return2),          c: cls(result.return2) },
                { l:'Outperformer',      v: result.return1 >= result.return2 ? s1 : s2, c:'up' },
              ].map(({ l, v, c, hint }) => (
                <div key={l} className={s.stat}>
                  <div className={s.statLabel}>{l}</div>
                  <div className={`${s.statVal} ${c||''}`}>{v}</div>
                  {hint && <div className={s.statHint}>{hint}</div>}
                </div>
              ))}
            </div>

            {/* Chart */}
            <div className={s.chartCard}>
              <div className={s.chartHead}>
                <span className={s.chartTitle}>Normalised Performance (Base = 100)</span>
                <div className={s.chartLegend}>
                  <span style={{ color:'var(--g)' }}>● {s1}</span>
                  <span style={{ color:'var(--amber)' }}>● {s2}</span>
                </div>
              </div>
              <div className={s.chartBody}>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={chartData} margin={{ top:8, right:55, left:0, bottom:0 }}>
                    <CartesianGrid stroke="var(--b1)"/>
                    <XAxis dataKey="date" tick={xtick} interval="preserveStartEnd"/>
                    <YAxis tick={ytick} orientation="right" width={45}/>
                    <Tooltip content={<TT/>}/>
                    <Line type="monotone" dataKey={s1} name={s1} stroke="var(--g)"     strokeWidth={2} dot={false}/>
                    <Line type="monotone" dataKey={s2} name={s2} stroke="var(--amber)" strokeWidth={2} dot={false}/>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
