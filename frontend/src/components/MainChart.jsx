/**
 * MainChart v0.2.1
 * Fixes: removed orphaned yAxisId="vol" on intraday volume bar
 * Fixes: proper loading states, no stale data on symbol switch
 * Added: clean intraday vs historical branch rendering
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { api, fmt, sign, cls, sd } from '../api.js'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer, ReferenceLine,
} from 'recharts'

const HIST_DAYS    = [30, 60, 90, 180, 365]
const OVERLAYS_OPT = ['MA20','MA50','BB','VWAP']
const PANEL2_OPTS  = ['Volume','RSI','MACD','Stochastic']
const IV_OPTS      = ['5m','15m','30m']

const TIP = {
  background:'var(--s2)', border:'1px solid var(--b2)', borderRadius:'var(--rr)',
  padding:'9px 12px', fontSize:11, fontFamily:'var(--mono)',
  boxShadow:'0 12px 40px rgba(0,0,0,.7)',
}

function PTip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div style={{ ...TIP, minWidth:148 }}>
      <div style={{ color:'var(--t3)', marginBottom:5, fontSize:9 }}>
        {d.time ?? d.date}
      </div>
      {d.high  != null && <div>H <span style={{ color:'var(--green)' }}>₹{fmt(d.high)}</span></div>}
      {d.low   != null && <div>L <span style={{ color:'var(--red)'   }}>₹{fmt(d.low)}</span></div>}
      {d.open  != null && <div>O <span style={{ color:'var(--t2)'    }}>₹{fmt(d.open)}</span></div>}
      {d.close != null && <div>C <span style={{ color:'var(--t1)', fontWeight:700 }}>₹{fmt(d.close)}</span></div>}
      {d.volume != null && d.volume > 0 && (
        <div style={{ borderTop:'1px solid var(--b1)', marginTop:5, paddingTop:5, color:'var(--t3)' }}>
          {(d.volume / 1e6).toFixed(2)}M vol
        </div>
      )}
    </div>
  )
}

function P2Tip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div style={TIP}>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
        </div>
      ))}
    </div>
  )
}

export default function MainChart() {
  const { activeSym, activeCompany: ac, onChartReady } = useApp()

  const [period,   setPeriod ] = useState(90)      // number | '1D'
  const [interval, setIv     ] = useState('5m')
  const [overlays, setOvr    ] = useState(['MA20'])
  const [panel2,   setPanel2 ] = useState('Volume')
  const [data,     setData   ] = useState([])
  const [loading,  setLoading] = useState(false)
  const [switching,setSwitching]=useState(false)
  const prevSymRef = useRef(null)
  const ctrl       = useRef(null)

  const isIntraday = period === '1D'
  const xKey       = isIntraday ? 'time' : 'date'

  const load = useCallback(async (sym, per, iv) => {
    ctrl.current?.abort()
    ctrl.current = new AbortController()
    const sig = ctrl.current.signal
    try {
      if (per === '1D') {
        const res = await api.quote(sym, iv, sig)
        return Array.isArray(res?.bars) ? res.bars : []
      }
      return await api.data(sym, per, sig)
    } catch (e) {
      if (e.name !== 'AbortError') throw e
      return null  // aborted
    }
  }, [])

  useEffect(() => {
    const symChanged = prevSymRef.current !== null && prevSymRef.current !== activeSym
    if (symChanged) setSwitching(true)
    prevSymRef.current = activeSym

    setLoading(true)
    load(activeSym, period, interval).then(rows => {
      if (rows === null) return  // aborted
      setData(rows)
      setLoading(false)
      setSwitching(false)
      onChartReady(activeSym)
    }).catch(() => {
      setLoading(false)
      setSwitching(false)
    })

    return () => ctrl.current?.abort()
  }, [activeSym, period, interval])

  const toggle = o => setOvr(p => p.includes(o) ? p.filter(x => x !== o) : [...p, o])

  // ── Shared axis props ────────────────────────────────────────────────────────
  const xAxisProps = {
    dataKey:    xKey,
    tickFormatter: isIntraday ? v => v : sd,
    tick:       { fontSize:9, fill:'var(--t3)', fontFamily:'var(--mono)' },
    tickLine:   false,
    axisLine:   { stroke:'var(--b2)' },
    minTickGap: 52,
  }
  const yAxisProps = {
    orientation: 'right',
    tick:        { fontSize:9, fill:'var(--t3)', fontFamily:'var(--mono)' },
    tickLine:    false,
    axisLine:    false,
    tickFormatter: v => '₹' + Math.round(v).toLocaleString('en-IN'),
    domain:      ['auto', 'auto'],
    width:       72,
  }

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column',
      overflow:'hidden', background:'var(--bg)', position:'relative' }}>

      {/* #1 Symbol-switching overlay */}
      {switching && (
        <div style={{
          position:'absolute', inset:0, zIndex:20,
          background:'rgba(9,9,14,.75)', backdropFilter:'blur(3px)',
          display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'center', gap:12,
        }}>
          <div className="spinner" style={{ width:26, height:26 }}/>
          <div style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--t2)' }}>
            Loading <strong style={{ color:'var(--green)' }}>{activeSym}</strong>…
          </div>
        </div>
      )}

      {/* Stock strip — instant from activeCompany */}
      {ac && (
        <div style={{
          padding:'7px 14px', background:'var(--s1)',
          borderBottom:'1px solid var(--b1)',
          display:'flex', alignItems:'center', gap:14,
          flexWrap:'wrap', flexShrink:0,
        }}>
          <div style={{ display:'flex', alignItems:'baseline', gap:10 }}>
            <span style={{ fontFamily:'var(--mono)', fontSize:12,
              fontWeight:700, color:'var(--green)' }}>{ac.symbol}</span>
            <span style={{ fontFamily:'var(--mono)', fontSize:20,
              fontWeight:700, color:'var(--t1)' }}>₹{fmt(ac.close)}</span>
            <span className={cls(ac.change_pct)}
              style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:700 }}>
              {sign(ac.change_pct)}
            </span>
          </div>
          <div style={{ display:'flex', gap:16, fontSize:10,
            color:'var(--t2)', fontFamily:'var(--mono)' }}>
            <span>H <span style={{ color:'var(--green)' }}>₹{fmt(ac.high)}</span></span>
            <span>L <span style={{ color:'var(--red)'   }}>₹{fmt(ac.low)}</span></span>
            <span>O ₹{fmt(ac.open)}</span>
            <span style={{ color:'var(--t3)' }}>
              {ac.volume >= 1e7 ? (ac.volume/1e7).toFixed(1)+'Cr vol' :
               ac.volume >= 1e5 ? (ac.volume/1e5).toFixed(1)+'L vol'  :
               (ac.volume||0).toLocaleString()+' vol'}
            </span>
            {isIntraday && data.length > 0 && (
              <span style={{ color:'var(--amber)' }}>
                INTRADAY · {interval} · {data.length} bars
              </span>
            )}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div style={{
        display:'flex', alignItems:'center', gap:4, flexWrap:'wrap',
        padding:'5px 12px', borderBottom:'1px solid var(--b1)',
        background:'var(--s1)', flexShrink:0,
      }}>
        {/* 1D intraday */}
        <button className={`tab-btn ${isIntraday ? 'on' : ''}`}
          style={{ padding:'3px 9px', fontSize:10 }}
          onClick={() => setPeriod('1D')}>1D</button>

        <div className="divider-v"/>

        {/* Historical periods */}
        <div className="tab-row" style={{ gap:2 }}>
          {HIST_DAYS.map(d => (
            <button key={d} className={`tab-btn ${period===d ? 'on' : ''}`}
              style={{ padding:'3px 9px', fontSize:10 }}
              onClick={() => setPeriod(d)}>{d}D</button>
          ))}
        </div>

        {/* Intraday interval */}
        {isIntraday && <>
          <div className="divider-v"/>
          {IV_OPTS.map(iv => (
            <button key={iv} className={`tab-btn ${interval===iv ? 'on' : ''}`}
              style={{ padding:'3px 9px', fontSize:10 }}
              onClick={() => setIv(iv)}>{iv}</button>
          ))}
        </>}

        {/* Overlays — historical only */}
        {!isIntraday && <>
          <div className="divider-v"/>
          {OVERLAYS_OPT.map(o => (
            <button key={o} className={`tab-btn ${overlays.includes(o) ? 'on' : ''}`}
              style={{ padding:'3px 9px', fontSize:10 }}
              onClick={() => toggle(o)}>{o}</button>
          ))}
          <div className="divider-v"/>
          {PANEL2_OPTS.map(p => (
            <button key={p} className={`tab-btn ${panel2===p ? 'on' : ''}`}
              style={{ padding:'3px 9px', fontSize:10 }}
              onClick={() => setPanel2(p)}>{p}</button>
          ))}
        </>}

        {loading && !switching && (
          <div className="spinner" style={{ width:13, height:13, marginLeft:'auto' }}/>
        )}
      </div>

      {/* Empty / loading state */}
      {data.length === 0 && !loading && (
        <div className="spin-center">
          <span style={{ color:'var(--t4)', fontSize:11, fontFamily:'var(--mono)' }}>
            {isIntraday ? 'Fetching live bars…' : 'No data available'}
          </span>
        </div>
      )}

      {data.length === 0 && loading && !switching && (
        <div className="spin-center">
          <div className="spinner"/>
          <span style={{ color:'var(--t4)', fontSize:11, fontFamily:'var(--mono)' }}>
            Loading {period === '1D' ? `intraday ${interval}` : `${period}D`} chart…
          </span>
        </div>
      )}

      {/* Charts */}
      {data.length > 0 && (
        <div style={{ flex:1, display:'flex', flexDirection:'column',
          overflow:'hidden', padding:'6px 0 2px' }}>

          {/* ── Intraday chart (1D) — full height, single panel ── */}
          {isIntraday && (
            <div style={{ flex:1, minHeight:0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data}
                  margin={{ left:4, right:8, top:4, bottom:0 }}>
                  <CartesianGrid strokeDasharray="1 6"
                    stroke="var(--b1)" vertical={false}/>
                  <XAxis {...xAxisProps}/>
                  <YAxis {...yAxisProps}/>
                  <Tooltip content={<PTip/>}/>
                  {/* Volume as low-opacity fill — no separate yAxis needed */}
                  <Bar dataKey="volume" fill="var(--blue)" fillOpacity={0.12}
                    name="Volume" yAxisId={undefined}/>
                  <Line dataKey="close" stroke="var(--green)" strokeWidth={1.8}
                    dot={false} name="Close"
                    activeDot={{ r:4, fill:'var(--green)',
                      stroke:'var(--s1)', strokeWidth:2 }}/>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── Historical chart — 68% price + 30% indicator panel ── */}
          {!isIntraday && (
            <>
              {/* Price 68% */}
              <div style={{ flex:'0 0 68%', minHeight:0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={data}
                    margin={{ left:4, right:8, top:4, bottom:0 }}>
                    <CartesianGrid strokeDasharray="1 6"
                      stroke="var(--b1)" vertical={false}/>
                    <XAxis {...xAxisProps}/>
                    <YAxis {...yAxisProps}/>
                    <Tooltip content={<PTip/>}/>

                    {overlays.includes('BB') && <>
                      <Line dataKey="bb_up" stroke="var(--blue)" strokeWidth={.7}
                        dot={false} strokeDasharray="3 3" opacity={.6} name="BB↑"/>
                      <Line dataKey="bb_dn" stroke="var(--blue)" strokeWidth={.7}
                        dot={false} strokeDasharray="3 3" opacity={.6} name="BB↓"/>
                    </>}
                    {overlays.includes('VWAP') && (
                      <Line dataKey="vwap" stroke="var(--orange)" strokeWidth={1}
                        dot={false} strokeDasharray="4 3" opacity={.8} name="VWAP"/>
                    )}
                    {overlays.includes('MA20') && (
                      <Line dataKey="ma20" stroke="var(--cyan)" strokeWidth={1.2}
                        dot={false} name="MA20"/>
                    )}
                    {overlays.includes('MA50') && (
                      <Line dataKey="ma50" stroke="var(--purple)" strokeWidth={1.2}
                        dot={false} name="MA50"/>
                    )}
                    <Line dataKey="close" stroke="var(--green)" strokeWidth={1.8}
                      dot={false} name="Close"
                      activeDot={{ r:4, fill:'var(--green)',
                        stroke:'var(--s1)', strokeWidth:2 }}/>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Indicator panel 30% */}
              <div style={{ flex:'0 0 30%', minHeight:0,
                borderTop:'1px solid var(--b1)' }}>
                <ResponsiveContainer width="100%" height="100%">
                  {panel2 === 'RSI' ? (
                    <ComposedChart data={data}
                      margin={{ left:4, right:8, top:3, bottom:0 }}>
                      <CartesianGrid strokeDasharray="1 6"
                        stroke="var(--b1)" vertical={false}/>
                      <XAxis {...xAxisProps}/>
                      <YAxis orientation="right" domain={[0,100]}
                        tick={{ fontSize:9, fill:'var(--t3)',
                          fontFamily:'var(--mono)' }}
                        tickLine={false} axisLine={false} width={36}/>
                      <Tooltip content={<P2Tip/>}/>
                      <ReferenceLine y={70} stroke="rgba(239,68,68,.4)"
                        strokeDasharray="3 2"/>
                      <ReferenceLine y={50} stroke="var(--b2)"
                        strokeDasharray="2 5"/>
                      <ReferenceLine y={30} stroke="rgba(34,197,94,.4)"
                        strokeDasharray="3 2"/>
                      <Line dataKey="rsi" stroke="var(--cyan)"
                        strokeWidth={1.4} dot={false} name="RSI(14)"/>
                    </ComposedChart>

                  ) : panel2 === 'MACD' ? (
                    <ComposedChart data={data}
                      margin={{ left:4, right:8, top:3, bottom:0 }}>
                      <CartesianGrid strokeDasharray="1 6"
                        stroke="var(--b1)" vertical={false}/>
                      <XAxis {...xAxisProps}/>
                      <YAxis orientation="right"
                        tick={{ fontSize:9, fill:'var(--t3)',
                          fontFamily:'var(--mono)' }}
                        tickLine={false} axisLine={false} width={52}/>
                      <Tooltip content={<P2Tip/>}/>
                      <ReferenceLine y={0} stroke="var(--b3)"
                        strokeWidth={1}/>
                      <Bar dataKey="macd_hist" fill="var(--cyan)"
                        fillOpacity={.6} name="Hist"/>
                      <Line dataKey="macd" stroke="var(--green)"
                        strokeWidth={1.2} dot={false} name="MACD"/>
                      <Line dataKey="macd_sig" stroke="var(--orange)"
                        strokeWidth={1.2} dot={false} name="Signal"/>
                    </ComposedChart>

                  ) : panel2 === 'Stochastic' ? (
                    <ComposedChart data={data}
                      margin={{ left:4, right:8, top:3, bottom:0 }}>
                      <CartesianGrid strokeDasharray="1 6"
                        stroke="var(--b1)" vertical={false}/>
                      <XAxis {...xAxisProps}/>
                      <YAxis orientation="right" domain={[0,100]}
                        tick={{ fontSize:9, fill:'var(--t3)',
                          fontFamily:'var(--mono)' }}
                        tickLine={false} axisLine={false} width={36}/>
                      <Tooltip content={<P2Tip/>}/>
                      <ReferenceLine y={80} stroke="rgba(239,68,68,.35)"
                        strokeDasharray="3 2"/>
                      <ReferenceLine y={20} stroke="rgba(34,197,94,.35)"
                        strokeDasharray="3 2"/>
                      <Line dataKey="stoch_k" stroke="var(--purple)"
                        strokeWidth={1.3} dot={false} name="%K"/>
                      <Line dataKey="stoch_d" stroke="var(--amber)"
                        strokeWidth={1.3} dot={false} name="%D"/>
                    </ComposedChart>

                  ) : (
                    /* Volume */
                    <ComposedChart data={data}
                      margin={{ left:4, right:8, top:3, bottom:0 }}>
                      <CartesianGrid strokeDasharray="1 6"
                        stroke="var(--b1)" vertical={false}/>
                      <XAxis {...xAxisProps}/>
                      <YAxis orientation="right"
                        tick={{ fontSize:9, fill:'var(--t3)',
                          fontFamily:'var(--mono)' }}
                        tickLine={false} axisLine={false}
                        tickFormatter={v => (v/1e6).toFixed(1)+'M'}
                        width={44}/>
                      <Tooltip content={<P2Tip/>}/>
                      <Bar dataKey="volume" name="Volume"
                        fill="var(--blue)" fillOpacity={.5}/>
                    </ComposedChart>
                  )}
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
