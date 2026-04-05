import { useState, useEffect, useMemo } from 'react'
import {
  ResponsiveContainer, ComposedChart, Area, Line, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
  Cell, AreaChart
} from 'recharts'
import { useApp } from '../context/AppContext.jsx'
import { api, fmt, fmtK, sign, cls, sd } from '../api.js'
import StockStats from './StockStats.jsx'
import s from './ChartArea.module.css'

const PERIODS = [
  { d: 7,  l: '1W' },
  { d: 30, l: '1M' },
  { d: 90, l: '3M' },
  { d: 180,l: '6M' },
  { d: 365,l: '1Y' },
]

const INDICATORS = ['Price', 'Volume', 'MA', 'BB', 'RSI', 'Momentum']

// Custom candlestick bar shape
function CandleShape(props) {
  const { x, y, width, height, open, high, low, close, index } = props
  if (open == null || close == null) return null
  const up      = close >= open
  const color   = up ? 'var(--green)' : 'var(--red)'
  const bodyTop = Math.min(y, y + height)
  const bodyH   = Math.max(Math.abs(height), 1)
  return (
    <g>
      {/* Wick */}
      <line x1={x + width/2} y1={props.highY} x2={x + width/2} y2={props.lowY}
        stroke={color} strokeWidth={1} opacity={.8}/>
      {/* Body */}
      <rect x={x + 1} y={bodyTop} width={Math.max(width - 2, 1)} height={bodyH}
        fill={up ? 'var(--green)' : 'var(--red)'}
        fillOpacity={up ? .7 : .8}
        stroke={color} strokeWidth={.5}
      />
    </g>
  )
}

// Chart tooltip
function ChartTT({ active, payload, label, chartType }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div className={s.tt}>
      <div className={s.ttDate}>{label}</div>
      {chartType === 'candle' && d.open != null ? (
        <>
          <div className={s.ttRow}><span>O</span><span className={cls(d.close-d.open)}>₹{fmt(d.open)}</span></div>
          <div className={s.ttRow}><span>H</span><span className="up">₹{fmt(d.high)}</span></div>
          <div className={s.ttRow}><span>L</span><span className="dn">₹{fmt(d.low)}</span></div>
          <div className={s.ttRow}><span>C</span><span className={cls(d.close-d.open)}>₹{fmt(d.close)}</span></div>
        </>
      ) : (
        payload.filter(p=>p.value!=null && p.dataKey!=='range').map((p,i)=>(
          <div key={i} className={s.ttRow}>
            <span style={{color: p.color || p.fill}}>{p.name}</span>
            <span>
              {['volume','return','rsi','momentum'].includes(p.dataKey)
                ? p.dataKey === 'volume' ? fmtK(p.value) : p.value?.toFixed(2)
                : '₹'+fmt(p.value)}
            </span>
          </div>
        ))
      )}
      {d.volume && <div className={s.ttRow}><span style={{color:'var(--t3)'}}>Vol</span><span>{fmtK(d.volume)}</span></div>}
    </div>
  )
}

const xtick = { fill: 'var(--t3)', fontFamily: 'var(--mono)', fontSize: 9 }
const ytick = { fill: 'var(--t3)', fontFamily: 'var(--mono)', fontSize: 9 }

export default function ChartArea() {
  const { activeSym, summary: sum, tab, setTab } = useApp()
  const [period,    setPeriod]    = useState(90)
  const [chartType, setChartType] = useState('area')   // area | candle
  const [indicator, setIndicator] = useState('Price')
  const [rows,      setRows]      = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  useEffect(() => {
    if (!activeSym) return
    setLoading(true); setError(null)
    api.data(activeSym, period)
      .then(d => { setRows(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [activeSym, period])

  const chartData = useMemo(() => rows.map(r => ({
    date:     sd(r.date),
    open:     r.open, high: r.high, low: r.low, close: r.close,
    volume:   r.volume,
    ma7:      r.ma7, ma20: r.ma20, ma50: r.ma50,
    bb_up:    r.bb_up, bb_dn: r.bb_dn, bb_mid: r.bb_mid,
    return:   r.return,
    rsi:      r.rsi,
    momentum: r.momentum,
    // For area chart fill bounds
    range:    r.bb_up && r.bb_dn ? [r.bb_dn, r.bb_up] : undefined,
  })), [rows])

  const prices = chartData.map(d=>d.close).filter(Boolean)
  const minP   = prices.length ? Math.min(...prices)*0.996 : 0
  const maxP   = prices.length ? Math.max(...prices)*1.004 : 1
  const isUp   = sum ? (sum.change_pct||0) >= 0 : true

  function renderMainChart() {
    if (indicator === 'Volume') return (
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{top:8,right:60,left:0,bottom:0}}>
          <CartesianGrid stroke="var(--b1)" strokeDasharray="0"/>
          <XAxis dataKey="date" tick={xtick} interval="preserveStartEnd"/>
          <YAxis tick={ytick} orientation="right" width={58} tickFormatter={fmtK}/>
          <Tooltip content={<ChartTT chartType="area"/>}/>
          <Bar dataKey="volume" name="Volume" radius={[2,2,0,0]} isAnimationActive={false}>
            {chartData.map((d,i)=>(
              <Cell key={i} fill={(d.return||0)>=0?'rgba(14,203,129,.45)':'rgba(246,70,93,.45)'} stroke={(d.return||0)>=0?'var(--green)':'var(--red)'} strokeWidth={1}/>
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    )

    if (indicator === 'RSI') return (
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{top:8,right:60,left:0,bottom:0}}>
          <CartesianGrid stroke="var(--b1)"/>
          <XAxis dataKey="date" tick={xtick} interval="preserveStartEnd"/>
          <YAxis domain={[0,100]} tick={ytick} orientation="right" width={35}/>
          <Tooltip content={<ChartTT chartType="area"/>}/>
          <ReferenceLine y={70} stroke="rgba(246,70,93,.4)" strokeDasharray="4 4"/>
          <ReferenceLine y={30} stroke="rgba(14,203,129,.4)" strokeDasharray="4 4"/>
          <ReferenceLine y={50} stroke="var(--b2)" strokeDasharray="4 4"/>
          <Area type="monotone" dataKey="rsi" name="RSI" stroke="var(--purple)" strokeWidth={1.5} fill="rgba(167,139,250,.1)" dot={false}/>
        </ComposedChart>
      </ResponsiveContainer>
    )

    if (indicator === 'Momentum') return (
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{top:8,right:60,left:0,bottom:0}}>
          <CartesianGrid stroke="var(--b1)"/>
          <XAxis dataKey="date" tick={xtick} interval="preserveStartEnd"/>
          <YAxis domain={[0,100]} tick={ytick} orientation="right" width={35}/>
          <Tooltip content={<ChartTT chartType="area"/>}/>
          <ReferenceLine y={50} stroke="var(--b2)" strokeDasharray="4 4"/>
          <Area type="monotone" dataKey="momentum" name="Momentum" stroke="var(--cyan)" strokeWidth={1.5} fill="rgba(34,211,238,.1)" dot={false}/>
        </ComposedChart>
      </ResponsiveContainer>
    )

    // Price / MA / BB
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{top:8,right:60,left:0,bottom:0}}>
          <defs>
            <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={isUp ? 'var(--green)' : 'var(--red)'} stopOpacity={.25}/>
              <stop offset="100%" stopColor={isUp ? 'var(--green)' : 'var(--red)'} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--b1)" strokeDasharray="0"/>
          <XAxis dataKey="date" tick={xtick} interval="preserveStartEnd"/>
          <YAxis domain={[minP, maxP]} tick={ytick} orientation="right" width={65}
            tickFormatter={v=>'₹'+fmt(v,0)}/>
          <Tooltip content={<ChartTT chartType="area"/>}/>

          {/* Bollinger Band fill */}
          {indicator === 'BB' && (
            <Area type="monotone" dataKey="bb_up" name="BB Upper"
              stroke="rgba(167,139,250,.5)" strokeWidth={1} fill="rgba(167,139,250,.06)" dot={false}
              activeDot={false}/>
          )}
          {indicator === 'BB' && (
            <Line type="monotone" dataKey="bb_dn" name="BB Lower"
              stroke="rgba(167,139,250,.5)" strokeWidth={1} dot={false} strokeDasharray="3 3"/>
          )}
          {indicator === 'BB' && (
            <Line type="monotone" dataKey="bb_mid" name="BB Mid"
              stroke="rgba(167,139,250,.4)" strokeWidth={1} dot={false} strokeDasharray="4 4"/>
          )}

          {/* MAs */}
          {(indicator === 'MA' || indicator === 'Price') && (
            <Line type="monotone" dataKey="ma20" name="MA20"
              stroke="var(--amber)" strokeWidth={1} dot={false} strokeDasharray="5 3"/>
          )}
          {indicator === 'MA' && (
            <Line type="monotone" dataKey="ma50" name="MA50"
              stroke="var(--purple)" strokeWidth={1} dot={false} strokeDasharray="6 4"/>
          )}
          {indicator === 'MA' && (
            <Line type="monotone" dataKey="ma7" name="MA7"
              stroke="var(--cyan)" strokeWidth={1} dot={false} strokeDasharray="3 3"/>
          )}

          {/* Main price */}
          <Area type="monotone" dataKey="close" name="Close"
            stroke={isUp ? 'var(--green)' : 'var(--red)'}
            strokeWidth={2} fill="url(#priceGrad)" dot={false}/>
        </ComposedChart>
      </ResponsiveContainer>
    )
  }

  return (
    <div className={s.area}>
      {/* Stock identity row */}
      {sum && (
        <div className={s.stockId}>
          <div>
            <div className={s.stockSym}>{sum.symbol}</div>
            <div className={s.stockName}>{sum.name}</div>
          </div>
          <div className={s.priceBlock}>
            <div className={`${s.price} ${isUp ? s.up : s.dn}`}>₹{fmt(sum.latest_close)}</div>
            <div className={s.priceChange}>
              <span className={`chip ${isUp ? 'chip-up' : 'chip-dn'}`}>{sign(sum.change_pct)}</span>
              <span className={s.prevClose}>prev ₹{fmt(sum.prev_close)}</span>
            </div>
          </div>
          <div className={s.miniKpis}>
            {[
              { l: 'Open',   v: '₹'+fmt(rows.at(-1)?.open) },
              { l: 'High',   v: '₹'+fmt(rows.at(-1)?.high), c:'up' },
              { l: 'Low',    v: '₹'+fmt(rows.at(-1)?.low),  c:'dn' },
              { l: '52W H',  v: '₹'+fmt(sum.week52_high) },
              { l: '52W L',  v: '₹'+fmt(sum.week52_low)  },
              { l: 'Vol',    v: fmtK(rows.at(-1)?.volume) },
            ].map(({l,v,c})=>(
              <div key={l} className={s.kpi}>
                <span className={s.kpiL}>{l}</span>
                <span className={`${s.kpiV} ${c||''}`}>{v}</span>
              </div>
            ))}
          </div>
          <div className={s.rsiBlock}>
            <div className={s.rsiLabel}>RSI</div>
            <div className={`${s.rsiVal} ${
              (rows.at(-1)?.rsi||50) > 70 ? s.dn : (rows.at(-1)?.rsi||50) < 30 ? s.up : ''
            }`}>{rows.at(-1)?.rsi?.toFixed(1) || '—'}</div>
            <div className={s.rsiHint}>
              {(rows.at(-1)?.rsi||50) > 70 ? 'Overbought' : (rows.at(-1)?.rsi||50) < 30 ? 'Oversold' : 'Neutral'}
            </div>
          </div>
        </div>
      )}

      {/* Tab + Controls */}
      <div className={s.controls}>
        <div className="tabs">
          {['chart','fundamentals','movers','compare'].map(t=>(
            <button key={t} className={`tab ${tab===t?'on':''}`} onClick={()=>setTab(t)}>
              {t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>
        {tab === 'chart' && (
          <div className={s.ctrlRight}>
            <div className={s.indRow}>
              {INDICATORS.map(ind=>(
                <button key={ind} className={`${s.indBtn} ${indicator===ind?s.indOn:''}`}
                  onClick={()=>setIndicator(ind)}>{ind}</button>
              ))}
            </div>
            <div className={s.perRow}>
              {PERIODS.map(p=>(
                <button key={p.d} className={`${s.perBtn} ${period===p.d?s.perOn:''}`}
                  onClick={()=>setPeriod(p.d)}>{p.l}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Content area */}
      <div className={s.content}>
        {tab === 'chart' && (
          <>
            {loading && <div className="spin-wrap"><div className="spinner"/><div className="spin-label">Loading…</div></div>}
            {error   && <div className="err" style={{margin:16}}>{error}</div>}
            {!loading && !error && (
              <div className={`${s.chartSection} fade-in`}>
                {/* Main chart */}
                <div className={s.mainChart}>{renderMainChart()}</div>

                {/* Volume sub-chart */}
                <div className={s.volChart}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{top:2,right:60,left:0,bottom:0}}>
                      <XAxis dataKey="date" tick={false} axisLine={false}/>
                      <YAxis tick={ytick} orientation="right" width={58} tickFormatter={fmtK}/>
                      <Bar dataKey="volume" name="Volume" radius={[1,1,0,0]} isAnimationActive={false}>
                        {chartData.map((d,i)=>(
                          <Cell key={i} fill={(d.return||0)>=0?'rgba(14,203,129,.35)':'rgba(246,70,93,.35)'}/>
                        ))}
                      </Bar>
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'fundamentals' && <StockStats />}

        {tab === 'movers' && <MoversPanel />}

        {tab === 'compare' && <ComparePanel sym={activeSym} />}
      </div>
    </div>
  )
}

// ── Mini sub-panels ────────────────────────────────────────────────────────
function MoversPanel() {
  const [data, setData] = useState(null)
  useEffect(() => { api.movers(8).then(setData).catch(()=>{}) }, [])
  const { setActiveSym, setTab: _setTab } = useApp()
  if (!data) return <div className="spin-wrap"><div className="spinner"/></div>
  return (
    <div className={s.moversGrid}>
      {['gainers','losers'].map(type=>(
        <div key={type} className="card" style={{borderRadius:'var(--r2)'}}>
          <div className="card-head">
            <span className="card-title">{type === 'gainers' ? 'Top Gainers ▲' : 'Top Losers ▼'}</span>
          </div>
          {data[type].map((m,i)=>{
            const up = m.change_pct >= 0
            return (
              <div key={m.symbol} className={s.moverRow} onClick={()=>{setActiveSym(m.symbol)}}>
                <span className={s.moverRank}>{i+1}</span>
                <div className={s.moverCo}>
                  <span className={s.moverSym}>{m.symbol}</span>
                  <span className={s.moverName}>{m.name}</span>
                </div>
                <span className={s.moverPrice}>₹{m.close}</span>
                <span className={`${s.moverChg} ${up?s.up:s.dn}`}>{sign(m.change_pct)}</span>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function ComparePanel({ sym }) {
  const { companies } = useApp()
  const [s2, setS2]   = useState(companies.find(c=>c.symbol!==sym)?.symbol||'')
  const [days, setDays] = useState(90)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  async function run() {
    if (!s2||s2===sym) return
    setLoading(true); setData(null)
    api.compare(sym, s2, days).then(d=>{setData(d);setLoading(false)}).catch(()=>setLoading(false))
  }

  return (
    <div className={s.compareWrap}>
      <div className={s.compareBar}>
        <span className={s.compareFixed}>{sym}</span>
        <span className={s.vs}>vs</span>
        <select className={s.compareSel} value={s2} onChange={e=>setS2(e.target.value)}>
          {companies.filter(c=>c.symbol!==sym).map(c=>(
            <option key={c.symbol} value={c.symbol}>{c.symbol} — {c.name}</option>
          ))}
        </select>
        <select className={s.comparePer} value={days} onChange={e=>setDays(+e.target.value)}>
          <option value={30}>1M</option><option value={90}>3M</option>
          <option value={180}>6M</option><option value={365}>1Y</option>
        </select>
        <button className={s.compareGo} onClick={run}>Compare →</button>
      </div>
      {loading && <div className="spin-wrap"><div className="spinner"/></div>}
      {data && (
        <div className={s.compareResult}>
          <div className={s.corrRow}>
            {[
              {l:'Correlation',   v: data.correlation.toFixed(3)},
              {l:`${sym} Return`, v: sign(data.return1_pct), c: cls(data.return1_pct)},
              {l:`${s2} Return`,  v: sign(data.return2_pct), c: cls(data.return2_pct)},
            ].map(({l,v,c})=>(
              <div key={l} className={s.corrCell}>
                <span className={s.corrLabel}>{l}</span>
                <span className={`${s.corrVal} ${c||''}`}>{v}</span>
              </div>
            ))}
          </div>
          <div className={s.compareChart}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.series.map(d=>({date:sd(d.date),[sym]:d[`norm_${sym}`],[s2]:d[`norm_${s2}`]}))}
                margin={{top:8,right:60,left:0,bottom:0}}>
                <CartesianGrid stroke="var(--b1)"/>
                <XAxis dataKey="date" tick={xtick} interval="preserveStartEnd"/>
                <YAxis tick={ytick} orientation="right" width={45}/>
                <Tooltip/>
                <Line type="monotone" dataKey={sym} stroke="var(--green)"  strokeWidth={2} dot={false}/>
                <Line type="monotone" dataKey={s2}  stroke="var(--amber)"  strokeWidth={2} dot={false}/>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
