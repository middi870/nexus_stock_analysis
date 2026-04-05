import { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { api, fmt, sign, cls, sd } from '../api.js'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer, ReferenceLine,
} from 'recharts'

const DAYS_OPTS = [30, 60, 90, 180, 365]
const OVERLAYS  = ['MA7','MA20','MA50','BB']
const PANEL2    = ['RSI','MACD','Volume','Stochastic']

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div style={{
      background:'var(--s2)', border:'1px solid var(--b2)',
      borderRadius:'var(--rr)', padding:'10px 14px',
      fontSize:11, fontFamily:'var(--mono)', minWidth:160,
    }}>
      <div style={{ color:'var(--t2)', marginBottom:6 }}>{d.date}</div>
      {d.open  != null && <div>O <span style={{color:'var(--t1)'}}>{fmt(d.open)}</span></div>}
      {d.high  != null && <div>H <span style={{color:'var(--g)' }}>{fmt(d.high)}</span></div>}
      {d.low   != null && <div>L <span style={{color:'var(--r)' }}>{fmt(d.low)}</span></div>}
      {d.close != null && <div>C <span style={{color:'var(--t1)',fontWeight:600}}>{fmt(d.close)}</span></div>}
      {d.volume!= null && <div style={{marginTop:4, color:'var(--t3)'}}>{(d.volume/1e6).toFixed(2)}M vol</div>}
    </div>
  )
}

function Panel2Tooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background:'var(--s2)', border:'1px solid var(--b2)',
      borderRadius:'var(--rr)', padding:'8px 12px',
      fontSize:11, fontFamily:'var(--mono)',
    }}>
      {payload.map((p,i) => (
        <div key={i} style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
        </div>
      ))}
    </div>
  )
}

export default function MainChart() {
  const { activeSym, tab } = useApp()
  const [data,     setData    ] = useState([])
  const [days,     setDays    ] = useState(90)
  const [overlays, setOverlays] = useState(['MA20'])
  const [panel2,   setPanel2  ] = useState('Volume')
  const [loading,  setLoading ] = useState(false)
  const abortRef = useRef(null)

  useEffect(() => {
    if (tab !== 'chart' || !activeSym) return
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setLoading(true)
    api.data(activeSym, days, ctrl.signal)
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { if (e.name !== 'AbortError') setLoading(false) })
    return () => ctrl.abort()
  }, [activeSym, days, tab])

  if (tab !== 'chart') return null

  const toggleOverlay = o => setOverlays(prev =>
    prev.includes(o) ? prev.filter(x => x !== o) : [...prev, o]
  )

  // Candlestick bars: use a composed chart with custom rendering
  // We encode OHLC as high/low domain, bar = open-close spread
  const chartData = data.map(d => ({
    ...d,
    candleBase:  Math.min(d.open, d.close),
    candleBody:  Math.abs(d.close - d.open),
    candleColor: d.close >= d.open ? '#00E5A0' : '#FF3D5A',
  }))

  const showBB = overlays.includes('BB')

  return (
    <div style={{
      flex: 1, display:'flex', flexDirection:'column',
      overflow:'hidden', background:'var(--bg)',
    }}>
      {/* Toolbar */}
      <div style={{
        display:'flex', alignItems:'center', gap:8, flexWrap:'wrap',
        padding:'8px 14px', borderBottom:'1px solid var(--b1)',
        background:'var(--s1)', flexShrink:0,
      }}>
        {/* Symbol */}
        <span style={{ fontFamily:'var(--mono)', fontSize:13, color:'var(--g)', fontWeight:600, marginRight:4 }}>
          {activeSym}
        </span>

        {/* Day range */}
        <div style={{ display:'flex', gap:2 }}>
          {DAYS_OPTS.map(d => (
            <button key={d} className={`tab ${days===d?'active':''}`}
              style={{ padding:'3px 9px', fontSize:10 }}
              onClick={() => setDays(d)}
            >{d}D</button>
          ))}
        </div>

        <div style={{ width:1, height:16, background:'var(--b2)', margin:'0 4px' }}/>

        {/* Overlays */}
        {OVERLAYS.map(o => (
          <button key={o} className={`tab ${overlays.includes(o)?'active':''}`}
            style={{ padding:'3px 9px', fontSize:10 }}
            onClick={() => toggleOverlay(o)}
          >{o}</button>
        ))}

        <div style={{ width:1, height:16, background:'var(--b2)', margin:'0 4px' }}/>

        {/* Panel 2 selector */}
        {PANEL2.map(p => (
          <button key={p} className={`tab ${panel2===p?'active':''}`}
            style={{ padding:'3px 9px', fontSize:10 }}
            onClick={() => setPanel2(p)}
          >{p}</button>
        ))}

        {loading && <div className="spinner" style={{ width:14, height:14, marginLeft:'auto' }}/>}
      </div>

      {data.length === 0 && !loading ? (
        <div className="spin-center"><div style={{ color:'var(--t3)', fontSize:12 }}>No data</div></div>
      ) : (
        <div style={{ flex:1, overflow:'hidden', padding:'8px 0', display:'flex', flexDirection:'column' }}>
          {/* Main price chart — 70% */}
          <div style={{ flex:'0 0 68%', minHeight:0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ left:8, right:8, top:8, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--b1)" vertical={false}/>
                <XAxis dataKey="date" tickFormatter={sd} tick={{ fontSize:9, fill:'var(--t3)', fontFamily:'var(--mono)' }}
                  tickLine={false} axisLine={{ stroke:'var(--b2)' }} minTickGap={40}/>
                <YAxis orientation="right" domain={['auto','auto']}
                  tick={{ fontSize:9, fill:'var(--t3)', fontFamily:'var(--mono)' }}
                  tickLine={false} axisLine={false}
                  tickFormatter={v => '₹'+fmt(v,0)}/>
                <Tooltip content={<CustomTooltip/>}/>

                {/* Bollinger bands */}
                {showBB && <>
                  <Line dataKey="bb_up" stroke="var(--blue)" strokeWidth={.7} dot={false} strokeDasharray="3 2" name="BB Upper"/>
                  <Line dataKey="bb_dn" stroke="var(--blue)" strokeWidth={.7} dot={false} strokeDasharray="3 2" name="BB Lower"/>
                  <Line dataKey="bb_mid" stroke="rgba(77,159,255,.4)" strokeWidth={.7} dot={false} name="BB Mid"/>
                </>}

                {/* MAs */}
                {overlays.includes('MA7')  && <Line dataKey="ma7"   stroke="var(--yellow)" strokeWidth={1.2} dot={false} name="MA7"/>}
                {overlays.includes('MA20') && <Line dataKey="ma20"  stroke="var(--cyan)"   strokeWidth={1.4} dot={false} name="MA20"/>}
                {overlays.includes('MA50') && <Line dataKey="ma50"  stroke="var(--purple)" strokeWidth={1.4} dot={false} name="MA50"/>}

                {/* Candle wicks (high-low) */}
                <Bar dataKey="high" fill="transparent" stroke="transparent" stackId="wick"/>

                {/* Close line as fallback / VWAP */}
                <Line dataKey="vwap" stroke="var(--orange)" strokeWidth={1} dot={false} strokeDasharray="4 3" name="VWAP"/>

                {/* Main price line */}
                <Line dataKey="close" stroke="var(--g)" strokeWidth={1.8} dot={false}
                  name="Close" activeDot={{ r:4, fill:'var(--g)' }}/>
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Panel 2 — 30% */}
          <div style={{ flex:'0 0 30%', minHeight:0, borderTop:'1px solid var(--b1)' }}>
            <ResponsiveContainer width="100%" height="100%">
              {panel2 === 'RSI' ? (
                <ComposedChart data={data} margin={{ left:8, right:8, top:4, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--b1)" vertical={false}/>
                  <XAxis dataKey="date" tickFormatter={sd} tick={{ fontSize:9, fill:'var(--t3)', fontFamily:'var(--mono)' }}
                    tickLine={false} axisLine={false} minTickGap={40}/>
                  <YAxis orientation="right" domain={[0, 100]}
                    tick={{ fontSize:9, fill:'var(--t3)', fontFamily:'var(--mono)' }} tickLine={false} axisLine={false}/>
                  <Tooltip content={<Panel2Tooltip/>}/>
                  <ReferenceLine y={70} stroke="rgba(255,61,90,.4)"  strokeDasharray="3 2"/>
                  <ReferenceLine y={30} stroke="rgba(0,229,160,.4)" strokeDasharray="3 2"/>
                  <Line dataKey="rsi" stroke="var(--cyan)" strokeWidth={1.4} dot={false} name="RSI(14)"/>
                </ComposedChart>
              ) : panel2 === 'MACD' ? (
                <ComposedChart data={data} margin={{ left:8, right:8, top:4, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--b1)" vertical={false}/>
                  <XAxis dataKey="date" tickFormatter={sd} tick={{ fontSize:9, fill:'var(--t3)', fontFamily:'var(--mono)' }}
                    tickLine={false} axisLine={false} minTickGap={40}/>
                  <YAxis orientation="right" tick={{ fontSize:9, fill:'var(--t3)', fontFamily:'var(--mono)' }} tickLine={false} axisLine={false}/>
                  <Tooltip content={<Panel2Tooltip/>}/>
                  <ReferenceLine y={0} stroke="var(--b3)" strokeWidth={1}/>
                  <Bar dataKey="macd_hist" fill="var(--cyan)" fillOpacity={.7} name="Histogram"/>
                  <Line dataKey="macd"     stroke="var(--g)"    strokeWidth={1.2} dot={false} name="MACD"/>
                  <Line dataKey="macd_sig" stroke="var(--orange)" strokeWidth={1.2} dot={false} name="Signal"/>
                </ComposedChart>
              ) : panel2 === 'Stochastic' ? (
                <ComposedChart data={data} margin={{ left:8, right:8, top:4, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--b1)" vertical={false}/>
                  <XAxis dataKey="date" tickFormatter={sd} tick={{ fontSize:9, fill:'var(--t3)', fontFamily:'var(--mono)' }}
                    tickLine={false} axisLine={false} minTickGap={40}/>
                  <YAxis orientation="right" domain={[0,100]}
                    tick={{ fontSize:9, fill:'var(--t3)', fontFamily:'var(--mono)' }} tickLine={false} axisLine={false}/>
                  <Tooltip content={<Panel2Tooltip/>}/>
                  <ReferenceLine y={80} stroke="rgba(255,61,90,.4)"  strokeDasharray="3 2"/>
                  <ReferenceLine y={20} stroke="rgba(0,229,160,.4)" strokeDasharray="3 2"/>
                  <Line dataKey="stoch_k" stroke="var(--purple)" strokeWidth={1.2} dot={false} name="%K"/>
                  <Line dataKey="stoch_d" stroke="var(--yellow)"  strokeWidth={1.2} dot={false} name="%D"/>
                </ComposedChart>
              ) : (
                <ComposedChart data={data} margin={{ left:8, right:8, top:4, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--b1)" vertical={false}/>
                  <XAxis dataKey="date" tickFormatter={sd} tick={{ fontSize:9, fill:'var(--t3)', fontFamily:'var(--mono)' }}
                    tickLine={false} axisLine={false} minTickGap={40}/>
                  <YAxis orientation="right" tick={{ fontSize:9, fill:'var(--t3)', fontFamily:'var(--mono)' }} tickLine={false} axisLine={false}
                    tickFormatter={v => (v/1e6).toFixed(1)+'M'}/>
                  <Tooltip content={<Panel2Tooltip/>}/>
                  <Bar dataKey="volume" name="Volume"
                    fill="var(--blue)" fillOpacity={.6}/>
                </ComposedChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
