import { useState, useEffect } from 'react'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, Area, AreaChart
} from 'recharts'
import { useApp } from '../context/AppContext.jsx'
import { api, fmt, fmtVol, shortDate } from '../api.js'
import s from './Overview.module.css'

const TT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className={s.tooltip}>
      <div className={s.ttDate}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} className={s.ttRow}>
          <span style={{ color: p.color || p.fill }}>{p.name}</span>
          <span>{typeof p.value === 'number' ? p.value.toFixed(2) : '—'}</span>
        </div>
      ))}
    </div>
  )
}

const VolTT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className={s.tooltip}>
      <div className={s.ttDate}>{label}</div>
      <div className={s.ttRow}>
        <span style={{ color: '#4D9EFF' }}>Volume</span>
        <span>{fmtVol(payload[0]?.value)}</span>
      </div>
    </div>
  )
}

function RangeBar({ low, high, current }) {
  const span = high - low || 1
  const pct  = ((current - low) / span * 100).toFixed(1)
  return (
    <div className={s.rangeWrap}>
      <div className={s.rangeLabels}>
        <span>52-WEEK RANGE</span>
        <span>{pct}th percentile</span>
      </div>
      <div className={s.rangeTrack}>
        <div className={s.rangeFill} style={{ width: `${pct}%` }} />
        <div className={s.rangeThumb} style={{ left: `${pct}%` }} />
      </div>
      <div className={s.rangeVals}>
        <span>₹{fmt(low)}</span>
        <span className={s.rangeCenter}>₹{fmt(current)}</span>
        <span>₹{fmt(high)}</span>
      </div>
    </div>
  )
}

const xtick = { fill: 'var(--txt3)', fontFamily: 'var(--f-mono)', fontSize: 9 }
const ytick = { fill: 'var(--txt3)', fontFamily: 'var(--f-mono)', fontSize: 9 }

export default function Overview() {
  const { activeSym, activePeriod, activeSummary: sum } = useApp()
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    if (!activeSym) return
    setLoading(true); setError(null)
    api.data(activeSym, activePeriod)
      .then(d => { setRows(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [activeSym, activePeriod])

  if (loading) return (
    <div className="loading-wrap">
      <div className="spinner" />
      <div className="spinner-txt">Loading market data…</div>
    </div>
  )
  if (error) return <div className="err-box">{error}</div>
  if (!sum)  return null

  const chartData = rows.map(r => ({
    date:     shortDate(r.date),
    close:    r.close,
    ma7:      r.ma_7,
    ma20:     r.ma_20,
    return:   r.daily_return,
    volume:   r.volume,
    momentum: r.momentum_score,
  }))

  const prices = chartData.map(d => d.close).filter(Boolean)
  const minP   = prices.length ? Math.min(...prices) * 0.995 : 0
  const maxP   = prices.length ? Math.max(...prices) * 1.005 : 1

  return (
    <div className={`${s.wrap} fade-in`}>

      {/* ── Stat cards ── */}
      <div className="g4">
        {[
          {
            l: 'Current Price',
            v: '₹' + fmt(sum.latest_close),
            sub: `prev ₹${fmt(sum.prev_close)} · ${sum.change_pct >= 0 ? '+' : ''}${sum.change_pct}% today`,
            cls: 'sc-teal',
          },
          {
            l: '52-Week Low',
            v: '₹' + fmt(sum.week52_low),
            sub: `${((sum.latest_close - sum.week52_low) / sum.week52_low * 100).toFixed(1)}% above low`,
            cls: 'sc-red',
          },
          {
            l: '52-Week High',
            v: '₹' + fmt(sum.week52_high),
            sub: `${((sum.week52_high - sum.latest_close) / sum.week52_high * 100).toFixed(1)}% off high`,
            cls: 'sc-blue',
          },
          {
            l: 'Ann. Volatility',
            v: sum.volatility_pct + '%',
            sub: `1Y return ${sum.total_return_pct >= 0 ? '+' : ''}${sum.total_return_pct}%`,
            cls: 'sc-amber',
          },
        ].map(({ l, v, sub, cls }) => (
          <div key={l} className={`stat-card ${cls}`}>
            <div className="stat-label">{l}</div>
            <div className="stat-val">{v}</div>
            <div className="stat-sub">{sub}</div>
          </div>
        ))}
      </div>

      {/* ── 52W Range bar ── */}
      <div className="card">
        <RangeBar
          low={sum.week52_low}
          high={sum.week52_high}
          current={sum.latest_close}
        />
      </div>

      {/* ── Price + MA / Daily Return ── */}
      <div className="g2">
        <div className="card">
          <div className="card-head">
            <span className="card-title">Price · MA7 · MA20</span>
            <div className={s.legend}>
              <span style={{ color: 'var(--teal)'  }}>● Close</span>
              <span style={{ color: 'var(--amber)' }}>● MA7</span>
              <span style={{ color: 'var(--blue)'  }}>● MA20</span>
            </div>
          </div>
          <div className={s.chartWrap}>
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="closeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="var(--teal)" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="var(--teal)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--ln)" strokeDasharray="0" />
                <XAxis dataKey="date" tick={xtick} interval="preserveStartEnd" />
                <YAxis
                  domain={[minP, maxP]}
                  tick={ytick} orientation="right" width={72}
                  tickFormatter={v => '₹' + fmt(v, 0)}
                />
                <Tooltip content={<TT />} />
                <Area
                  type="monotone" dataKey="close" name="Close"
                  stroke="var(--teal)" strokeWidth={1.8}
                  fill="url(#closeGrad)" dot={false}
                />
                <Line type="monotone" dataKey="ma7"  name="MA7"  stroke="var(--amber)" strokeWidth={1} dot={false} strokeDasharray="4 4" />
                <Line type="monotone" dataKey="ma20" name="MA20" stroke="var(--blue)"  strokeWidth={1} dot={false} strokeDasharray="6 4" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <span className="card-title">Daily Return %</span>
          </div>
          <div className={s.chartWrap}>
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--ln)" />
                <XAxis dataKey="date" tick={xtick} interval="preserveStartEnd" />
                <YAxis tick={ytick} orientation="right" width={40} />
                <Tooltip content={<TT />} />
                <ReferenceLine y={0} stroke="var(--ln2)" />
                <Bar dataKey="return" name="Return %" radius={[2, 2, 0, 0]} isAnimationActive={false}>
                  {chartData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={(entry.return || 0) >= 0 ? 'rgba(0,255,179,.55)' : 'rgba(255,69,96,.55)'}
                      stroke={(entry.return || 0) >= 0 ? 'var(--teal)' : 'var(--red)'}
                      strokeWidth={1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Volume + Momentum ── */}
      <div className="g2">
        <div className="card">
          <div className="card-head">
            <span className="card-title">Volume</span>
          </div>
          <div className={s.chartWrap}>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--ln)" />
                <XAxis dataKey="date" tick={xtick} interval="preserveStartEnd" />
                <YAxis tick={ytick} orientation="right" width={58} tickFormatter={fmtVol} />
                <Tooltip content={<VolTT />} />
                <Bar
                  dataKey="volume" name="Volume"
                  fill="rgba(77,158,255,.3)" stroke="rgba(77,158,255,.65)"
                  strokeWidth={1} radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <span className="card-title">Momentum Score</span>
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: '8px', color: 'var(--txt3)' }}>
              0–100 composite
            </span>
          </div>
          <div className={s.chartWrap}>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="momGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="var(--teal)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="var(--teal)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--ln)" />
                <XAxis dataKey="date" tick={xtick} interval="preserveStartEnd" />
                <YAxis domain={[0, 100]} tick={ytick} orientation="right" width={35} />
                <Tooltip content={<TT />} />
                <ReferenceLine y={50} stroke="var(--ln2)" strokeDasharray="4 4" />
                <Area
                  type="monotone" dataKey="momentum" name="Momentum"
                  stroke="var(--teal)" strokeWidth={1.5}
                  fill="url(#momGrad)" dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

    </div>
  )
}
