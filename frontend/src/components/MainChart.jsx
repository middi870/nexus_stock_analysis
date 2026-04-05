import { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { api, fmt, sign, cls, sd } from '../api.js'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer, ReferenceLine,
} from 'recharts'

const DAYS_OPTS  = [30, 60, 90, 180, 365]
const OVERLAYS   = ['MA20','MA50','BB']
const PANEL2_OPTS= ['Volume','RSI','MACD','Stochastic']

function PriceTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div style={{
      background:'var(--s2)', border:'1px solid var(--b2)',
      borderRadius:'var(--rr)', padding:'9px 13px',
      fontSize:11, fontFamily:'var(--mono)', minWidth:150,
      boxShadow:'0 8px 24px rgba(0,0,0,.5)',
    }}>
      <div style={{ color:'var(--t3)', marginBottom:6, fontSize:10 }}>{d.date}</div>
      {d.open  != null && <div>O <span style={{color:'var(--t2)'  }}>₹{fmt(d.open)}</span></div>}
      {d.high  != null && <div>H <span style={{color:'var(--g)'   }}>₹{fmt(d.high)}</span></div>}
      {d.low   != null && <div>L <span style={{color:'var(--r)'   }}>₹{fmt(d.low)}</span></div>}
      {d.close != null && <div>C <span style={{color:'var(--t1)',fontWeight:600}}>₹{fmt(d.close)}</span></div>}
      {d.volume!= null && (
        <div style={{marginTop:5,paddingTop:5,borderTop:'1px solid var(--b1)',color:'var(--t3)'}}>
          {(d.volume/1e6).toFixed(2)}M vol
        </div>
      )}
    </div>
  )
}

function P2Tooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background:'var(--s2)', border:'1px solid var(--b2)',
      borderRadius:'var(--rr)', padding:'7px 11px',
      fontSize:11, fontFamily:'var(--mono)',
      boxShadow:'0 8px 24px rgba(0,0,0,.5)',
    }}>
      {payload.map((p,i) => (
        <div key={i} style={{ color:p.color }}>
          {p.name}: {typeof p.value==='number' ? p.value.toFixed(2) : p.value}
        </div>
      ))}
    </div>
  )
}

export default function MainChart() {
  const { activeSym, tab } = useApp()
  const [data,    setData   ] = useState([])
  const [days,    setDays   ] = useState(90)
  const [overlays,setOverlays]=useState(['MA20'])
  const [panel2,  setPanel2 ] = useState('Volume')
  const [loading, setLoading] = useState(false)
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

  const toggleOverlay = o =>
    setOverlays(prev => prev.includes(o) ? prev.filter(x=>x!==o) : [...prev,o])

  const showBB = overlays.includes('BB')

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--card)' }}>

      {/* ── Toolbar ── */}
      <div style={{
        display:'flex', alignItems:'center', gap:6, flexWrap:'wrap',
        padding:'6px 12px', borderBottom:'1px solid var(--b1)',
        background:'var(--s1)', flexShrink:0,
      }}>
        {/* Active symbol badge */}
        <span style={{
          fontFamily:'var(--mono)', fontSize:13, color:'var(--g)', fontWeight:600,
          background:'var(--gd)', padding:'2px 9px', borderRadius:'var(--rr)',
          border:'1px solid rgba(16,185,129,.2)', marginRight:4,
        }}>{activeSym}</span>

        {/* Period tabs */}
        {DAYS_OPTS.map(d => (
          <button key={d} className={`tab ${days===d?'active':''}`}
            style={{ padding:'3px 8px', fontSize:10 }}
            onClick={() => setDays(d)}
          >{d}D</button>
        ))}

        <div style={{ width:1, height:14, background:'var(--b2)' }}/>

        {/* Overlays */}
        {OVERLAYS.map(o => (
          <button key={o} className={`tab ${overlays.includes(o)?'active':''}`}
            style={{ padding:'3px 8px', fontSize:10 }}
            onClick={() => toggleOverlay(o)}
          >{o}</button>
        ))}

        <div style={{ width:1, height:14, background:'var(--b2)' }}/>

        {/* Panel 2 */}
        {PANEL2_OPTS.map(p => (
          <button key={p} className={`tab ${panel2===p?'active':''}`}
            style={{ padding:'3px 8px', fontSize:10 }}
            onClick={() => setPanel2(p)}
          >{p}</button>
        ))}

        {loading && (
          <div className="spinner" style={{ width:13,height:13,marginLeft:'auto',borderTopColor:'var(--g)' }}/>
        )}
      </div>

      {data.length === 0 && !loading ? (
        <div className="spin-center">
          <span style={{ color:'var(--t3)', fontSize:12 }}>No data available</span>
        </div>
      ) : (
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', padding:'8px 0 4px' }}>

          {/* Price chart — 68% */}
          <div style={{ flex:'0 0 68%', minHeight:0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ left:4, right:8, top:6, bottom:0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="var(--b1)" vertical={false}/>
                <XAxis dataKey="date" tickFormatter={sd}
                  tick={{ fontSize:9, fill:'var(--t3)', fontFamily:'var(--mono)' }}
                  tickLine={false} axisLine={{ stroke:'var(--b2)' }} minTickGap={44}/>
                <YAxis orientation="right" domain={['auto','auto']}
                  tick={{ fontSize:9, fill:'var(--t3)', fontFamily:'var(--mono)' }}
                  tickLine={false} axisLine={false}
                  tickFormatter={v => '₹'+Math.round(v).toLocaleString('en-IN')}/>
                <Tooltip content={<PriceTooltip/>}/>

                {/* Bollinger Bands */}
                {showBB && <>
                  <Line dataKey="bb_up" stroke="var(--blue)" strokeWidth={.7} dot={false}
                    strokeDasharray="3 3" name="BB Upper"/>
                  <Line dataKey="bb_dn" stroke="var(--blue)" strokeWidth={.7} dot={false}
                    strokeDasharray="3 3" name="BB Lower"/>
                </>}

                {/* Moving averages */}
                {overlays.includes('MA20') && (
                  <Line dataKey="ma20" stroke="var(--cyan)"   strokeWidth={1.2} dot={false} name="MA20"/>
                )}
                {overlays.includes('MA50') && (
                  <Line dataKey="ma50" stroke="var(--purple)" strokeWidth={1.2} dot={false} name="MA50"/>
                )}

                {/* VWAP — always shown as faint reference */}
                <Line dataKey="vwap" stroke="var(--orange)" strokeWidth={.9} dot={false}
                  strokeDasharray="4 3" name="VWAP" opacity={.7}/>

                {/* Main price line */}
                <Line dataKey="close" stroke="var(--g)" strokeWidth={1.8} dot={false}
                  name="Close" activeDot={{ r:4, fill:'var(--g)', stroke:'var(--s1)', strokeWidth:2 }}/>
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Panel 2 — 30% */}
          <div style={{ flex:'0 0 30%', minHeight:0, borderTop:'1px solid var(--b1)' }}>
            <ResponsiveContainer width="100%" height="100%">
              {panel2 === 'RSI' ? (
                <ComposedChart data={data} margin={{ left:4, right:8, top:4, bottom:0 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="var(--b1)" vertical={false}/>
                  <XAxis dataKey="date" tickFormatter={sd}
                    tick={{ fontSize:9, fill:'var(--t3)', fontFamily:'var(--mono)' }}
                    tickLine={false} axisLine={false} minTickGap={44}/>
                  <YAxis orientation="right" domain={[0,100]}
                    tick={{ fontSize:9, fill:'var(--t3)', fontFamily:'var(--mono)' }}
                    tickLine={false} axisLine={false}/>
                  <Tooltip content={<P2Tooltip/>}/>
                  <ReferenceLine y={70} stroke="rgba(239,68,68,.5)"  strokeDasharray="3 2"/>
                  <ReferenceLine y={30} stroke="rgba(16,185,129,.5)" strokeDasharray="3 2"/>
                  <Line dataKey="rsi" stroke="var(--cyan)" strokeWidth={1.3} dot={false} name="RSI(14)"/>
                </ComposedChart>
              ) : panel2 === 'MACD' ? (
                <ComposedChart data={data} margin={{ left:4, right:8, top:4, bottom:0 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="var(--b1)" vertical={false}/>
                  <XAxis dataKey="date" tickFormatter={sd}
                    tick={{ fontSize:9, fill:'var(--t3)', fontFamily:'var(--mono)' }}
                    tickLine={false} axisLine={false} minTickGap={44}/>
                  <YAxis orientation="right"
                    tick={{ fontSize:9, fill:'var(--t3)', fontFamily:'var(--mono)' }}
                    tickLine={false} axisLine={false}/>
                  <Tooltip content={<P2Tooltip/>}/>
                  <ReferenceLine y={0} stroke="var(--b3)" strokeWidth={1}/>
                  <Bar dataKey="macd_hist" fill="var(--cyan)" fillOpacity={.65} name="Histogram"/>
                  <Line dataKey="macd"     stroke="var(--g)"      strokeWidth={1.2} dot={false} name="MACD"/>
                  <Line dataKey="macd_sig" stroke="var(--orange)"  strokeWidth={1.2} dot={false} name="Signal"/>
                </ComposedChart>
              ) : panel2 === 'Stochastic' ? (
                <ComposedChart data={data} margin={{ left:4, right:8, top:4, bottom:0 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="var(--b1)" vertical={false}/>
                  <XAxis dataKey="date" tickFormatter={sd}
                    tick={{ fontSize:9, fill:'var(--t3)', fontFamily:'var(--mono)' }}
                    tickLine={false} axisLine={false} minTickGap={44}/>
                  <YAxis orientation="right" domain={[0,100]}
                    tick={{ fontSize:9, fill:'var(--t3)', fontFamily:'var(--mono)' }}
                    tickLine={false} axisLine={false}/>
                  <Tooltip content={<P2Tooltip/>}/>
                  <ReferenceLine y={80} stroke="rgba(239,68,68,.5)"  strokeDasharray="3 2"/>
                  <ReferenceLine y={20} stroke="rgba(16,185,129,.5)" strokeDasharray="3 2"/>
                  <Line dataKey="stoch_k" stroke="var(--purple)" strokeWidth={1.2} dot={false} name="%K"/>
                  <Line dataKey="stoch_d" stroke="var(--yellow)"  strokeWidth={1.2} dot={false} name="%D"/>
                </ComposedChart>
              ) : (
                <ComposedChart data={data} margin={{ left:4, right:8, top:4, bottom:0 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="var(--b1)" vertical={false}/>
                  <XAxis dataKey="date" tickFormatter={sd}
                    tick={{ fontSize:9, fill:'var(--t3)', fontFamily:'var(--mono)' }}
                    tickLine={false} axisLine={false} minTickGap={44}/>
                  <YAxis orientation="right"
                    tick={{ fontSize:9, fill:'var(--t3)', fontFamily:'var(--mono)' }}
                    tickLine={false} axisLine={false}
                    tickFormatter={v => (v/1e6).toFixed(1)+'M'}/>
                  <Tooltip content={<P2Tooltip/>}/>
                  <Bar dataKey="volume" name="Volume" fill="var(--blue)" fillOpacity={.55}/>
                </ComposedChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
