import { useState, useEffect, useMemo, useRef } from 'react'
import {
  ResponsiveContainer, ComposedChart, Line, Bar, Area,
  XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, Cell
} from 'recharts'
import { useApp } from '../context/AppContext.jsx'
import { api, fmt, fmtK, sign, cls, sd } from '../api.js'
import CandleChart from './CandleChart.jsx'
import s from './MainChart.module.css'

const PERIODS  = [{d:7,l:'1W'},{d:30,l:'1M'},{d:90,l:'3M'},{d:180,l:'6M'},{d:365,l:'1Y'}]
const CHART_TYPES = ['Candle','Area','Line']
const OVERLAYS = ['MA','BB','None']
const SUB_IND  = ['Volume','MACD','RSI','Stoch','OBV','Return']

const TT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className={s.tt}>
      <div className={s.ttDate}>{label}</div>
      {payload.filter(p=>p.value!=null).map((p,i)=>(
        <div key={i} className={s.ttRow}>
          <span style={{color:p.color||p.fill}}>{p.name}</span>
          <span>{typeof p.value==='number'?p.value.toFixed(2):'—'}</span>
        </div>
      ))}
    </div>
  )
}

const xtick = { fill:'var(--t3)', fontFamily:'var(--mono)', fontSize:9 }
const ytick = { fill:'var(--t3)', fontFamily:'var(--mono)', fontSize:9 }

function useChartDims(ref) {
  const [dims, setDims] = useState({ width: 900, height: 340 })
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => {
      setDims({ width: e.contentRect.width, height: e.contentRect.height })
    })
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return dims
}

export default function MainChart() {
  const { activeSym, summary: sum, period, setPeriod, tab } = useApp()
  const [chartType,  setChartType]  = useState('Candle')
  const [overlay,    setOverlay]    = useState('MA')
  const [subInd,     setSubInd]     = useState('Volume')
  const [rows,       setRows]       = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const chartRef = useRef(null)
  const dims = useChartDims(chartRef)

  useEffect(() => {
    if (!activeSym) return
    setLoading(true); setError(null)
    const ctrl = new AbortController()
    api.data(activeSym, period, ctrl.signal)
      .then(d => { setRows(d); setLoading(false) })
      .catch(e => { if (e.name!=='AbortError') { setError(e.message); setLoading(false) } })
    return () => ctrl.abort()
  }, [activeSym, period])

  const chartData = useMemo(() => rows.map(r => ({
    date:r.date, dateLabel:sd(r.date),
    open:r.open, high:r.high, low:r.low, close:r.close,
    volume:r.volume, return:r.return,
    ma7:r.ma7, ma20:r.ma20, ma50:r.ma50,
    bb_up:r.bb_up, bb_dn:r.bb_dn, bb_mid:r.bb_mid,
    rsi:r.rsi, macd:r.macd, macd_sig:r.macd_sig, macd_hist:r.macd_hist,
    stoch_k:r.stoch_k, stoch_d:r.stoch_d,
    obv:r.obv, momentum:r.momentum,
  })), [rows])

  const isUp = sum ? (sum.change_pct||0) >= 0 : true
  const prices = rows.map(r=>r.close).filter(Boolean)
  const minP = prices.length ? Math.min(...prices)*0.996 : 0
  const maxP = prices.length ? Math.max(...prices)*1.004 : 1

  // Sub indicator rendering
  function renderSubChart() {
    if (subInd === 'MACD') return (
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{top:2,right:60,left:0,bottom:0}}>
          <CartesianGrid stroke="var(--b1)"/>
          <XAxis dataKey="dateLabel" tick={false} axisLine={false}/>
          <YAxis tick={ytick} orientation="right" width={50}/>
          <Tooltip content={<TT/>}/>
          <ReferenceLine y={0} stroke="var(--b2)"/>
          <Bar dataKey="macd_hist" name="Histogram" isAnimationActive={false}>
            {chartData.map((d,i)=><Cell key={i} fill={(d.macd_hist||0)>=0?'rgba(0,214,143,.55)':'rgba(255,59,87,.55)'}/>)}
          </Bar>
          <Line type="monotone" dataKey="macd"     name="MACD"   stroke="var(--blue)"   strokeWidth={1.2} dot={false}/>
          <Line type="monotone" dataKey="macd_sig" name="Signal" stroke="var(--orange)" strokeWidth={1.2} dot={false}/>
        </ComposedChart>
      </ResponsiveContainer>
    )
    if (subInd === 'RSI') return (
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{top:2,right:60,left:0,bottom:0}}>
          <CartesianGrid stroke="var(--b1)"/>
          <XAxis dataKey="dateLabel" tick={false} axisLine={false}/>
          <YAxis domain={[0,100]} tick={ytick} orientation="right" width={35}/>
          <Tooltip content={<TT/>}/>
          <ReferenceLine y={70} stroke="rgba(255,59,87,.4)"  strokeDasharray="3 3"/>
          <ReferenceLine y={30} stroke="rgba(0,214,143,.4)"  strokeDasharray="3 3"/>
          <ReferenceLine y={50} stroke="var(--b2)" strokeDasharray="4 4"/>
          <Area type="monotone" dataKey="rsi" name="RSI"
            stroke="var(--purple)" strokeWidth={1.5} fill="rgba(180,143,255,.08)" dot={false}/>
        </ComposedChart>
      </ResponsiveContainer>
    )
    if (subInd === 'Stoch') return (
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{top:2,right:60,left:0,bottom:0}}>
          <CartesianGrid stroke="var(--b1)"/>
          <XAxis dataKey="dateLabel" tick={false} axisLine={false}/>
          <YAxis domain={[0,100]} tick={ytick} orientation="right" width={35}/>
          <Tooltip content={<TT/>}/>
          <ReferenceLine y={80} stroke="rgba(255,59,87,.35)" strokeDasharray="3 3"/>
          <ReferenceLine y={20} stroke="rgba(0,214,143,.35)" strokeDasharray="3 3"/>
          <Line type="monotone" dataKey="stoch_k" name="%K" stroke="var(--cyan)"   strokeWidth={1.2} dot={false}/>
          <Line type="monotone" dataKey="stoch_d" name="%D" stroke="var(--orange)" strokeWidth={1.2} dot={false} strokeDasharray="4 3"/>
        </ComposedChart>
      </ResponsiveContainer>
    )
    if (subInd === 'OBV') return (
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{top:2,right:60,left:0,bottom:0}}>
          <CartesianGrid stroke="var(--b1)"/>
          <XAxis dataKey="dateLabel" tick={false} axisLine={false}/>
          <YAxis tick={ytick} orientation="right" width={60} tickFormatter={fmtK}/>
          <Tooltip content={<TT/>}/>
          <Area type="monotone" dataKey="obv" name="OBV"
            stroke="var(--cyan)" strokeWidth={1.2} fill="rgba(0,212,255,.07)" dot={false}/>
        </ComposedChart>
      </ResponsiveContainer>
    )
    if (subInd === 'Return') return (
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{top:2,right:60,left:0,bottom:0}}>
          <CartesianGrid stroke="var(--b1)"/>
          <XAxis dataKey="dateLabel" tick={false} axisLine={false}/>
          <YAxis tick={ytick} orientation="right" width={40}/>
          <Tooltip content={<TT/>}/>
          <ReferenceLine y={0} stroke="var(--b2)"/>
          <Bar dataKey="return" name="Return %" isAnimationActive={false}>
            {chartData.map((d,i)=><Cell key={i} fill={(d.return||0)>=0?'rgba(0,214,143,.5)':'rgba(255,59,87,.5)'}/>)}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    )
    // Volume (default)
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{top:2,right:60,left:0,bottom:0}}>
          <CartesianGrid stroke="var(--b1)"/>
          <XAxis dataKey="dateLabel" tick={false} axisLine={false}/>
          <YAxis tick={ytick} orientation="right" width={58} tickFormatter={fmtK}/>
          <Tooltip content={<TT/>}/>
          <Bar dataKey="volume" name="Volume" isAnimationActive={false}>
            {chartData.map((d,i)=><Cell key={i} fill={(d.return||0)>=0?'rgba(0,214,143,.4)':'rgba(255,59,87,.4)'}/>)}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    )
  }

  // Main chart rendering
  function renderMain() {
    if (chartType === 'Candle') {
      return (
        <div ref={chartRef} className={s.candleWrap}>
          <CandleChart
            data={chartData}
            width={dims.width}
            height={dims.height - 4}
            volumeHeight={0}
          />
        </div>
      )
    }
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{top:8,right:60,left:0,bottom:0}}>
          <defs>
            <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={isUp?'var(--g)':'var(--r)'} stopOpacity={.2}/>
              <stop offset="100%" stopColor={isUp?'var(--g)':'var(--r)'} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--b1)"/>
          <XAxis dataKey="dateLabel" tick={xtick} interval="preserveStartEnd"/>
          <YAxis domain={[minP,maxP]} tick={ytick} orientation="right" width={65}
            tickFormatter={v=>'₹'+fmt(v,0)}/>
          <Tooltip content={<TT/>}/>
          {overlay==='BB' && <>
            <Area type="monotone" dataKey="bb_up" stroke="rgba(180,143,255,.4)" strokeWidth={1} fill="rgba(180,143,255,.05)" dot={false} name="BB↑"/>
            <Line type="monotone" dataKey="bb_dn" stroke="rgba(180,143,255,.4)" strokeWidth={1} dot={false} name="BB↓" strokeDasharray="3 3"/>
            <Line type="monotone" dataKey="bb_mid" stroke="rgba(180,143,255,.3)" strokeWidth={1} dot={false} name="BB Mid" strokeDasharray="5 3"/>
          </>}
          {overlay==='MA' && <>
            <Line type="monotone" dataKey="ma7"  name="MA7"  stroke="var(--cyan)"   strokeWidth={1} dot={false} strokeDasharray="3 3"/>
            <Line type="monotone" dataKey="ma20" name="MA20" stroke="var(--amber)"  strokeWidth={1} dot={false} strokeDasharray="4 4"/>
            <Line type="monotone" dataKey="ma50" name="MA50" stroke="var(--purple)" strokeWidth={1} dot={false} strokeDasharray="6 4"/>
          </>}
          {chartType==='Area'
            ? <Area type="monotone" dataKey="close" name="Price" stroke={isUp?'var(--g)':'var(--r)'} strokeWidth={2} fill="url(#pg)" dot={false}/>
            : <Line type="monotone" dataKey="close" name="Price" stroke={isUp?'var(--g)':'var(--r)'} strokeWidth={2} dot={false}/>
          }
        </ComposedChart>
      </ResponsiveContainer>
    )
  }

  if (tab !== 'chart') return null

  return (
    <div className={s.panel}>
      {/* Toolbar */}
      <div className={s.toolbar}>
        {/* Period */}
        <div className={s.perGroup}>
          {PERIODS.map(p=>(
            <button key={p.d} className={`${s.perBtn} ${period===p.d?s.perOn:''}`}
              onClick={()=>setPeriod(p.d)}>{p.l}</button>
          ))}
        </div>
        <div className={s.sep}/>
        {/* Chart type */}
        <div className={s.btnGroup}>
          {CHART_TYPES.map(t=>(
            <button key={t} className={`${s.typeBtn} ${chartType===t?s.typeOn:''}`}
              onClick={()=>setChartType(t)}>{t}</button>
          ))}
        </div>
        <div className={s.sep}/>
        {/* Overlay */}
        <span className={s.groupLabel}>Overlay</span>
        <div className={s.btnGroup}>
          {OVERLAYS.map(o=>(
            <button key={o} className={`${s.typeBtn} ${overlay===o?s.typeOn:''}`}
              onClick={()=>setOverlay(o)} disabled={chartType==='Candle'&&o!=='None'}>{o}</button>
          ))}
        </div>
        <div className={s.sep}/>
        {/* Sub indicator */}
        <span className={s.groupLabel}>Indicator</span>
        <div className={s.btnGroup}>
          {SUB_IND.map(ind=>(
            <button key={ind} className={`${s.typeBtn} ${subInd===ind?s.typeOn:''}`}
              onClick={()=>setSubInd(ind)}>{ind}</button>
          ))}
        </div>
      </div>

      {/* Chart content */}
      {loading && <div className="spin-center"><div className="spinner"/><div className="spin-txt">Loading…</div></div>}
      {error   && <div className="err-panel" style={{margin:12}}>{error}</div>}
      {!loading && !error && (
        <div className={`${s.charts} fade`}>
          <div className={s.mainChart} ref={chartType!=='Candle'?null:chartRef}>
            {chartType==='Candle'
              ? <div className={s.candleOuter} ref={chartRef}>
                  <CandleChart data={chartData} width={dims.width} height={dims.height-4} volumeHeight={0}/>
                </div>
              : renderMain()
            }
          </div>
          <div className={s.subChart}>{renderSubChart()}</div>
        </div>
      )}
    </div>
  )
}
