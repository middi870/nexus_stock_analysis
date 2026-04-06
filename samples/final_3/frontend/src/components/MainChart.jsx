import { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { api, fmt, sign, cls, sd } from '../api.js'
import { IcoBarChart, IcoTrend, IcoSliders, IcoRefresh } from '../icons.jsx'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer, ReferenceLine,
} from 'recharts'

const DAYS  = [30,60,90,180,365]
const OVS   = ['MA20','MA50','BB','VWAP']
const P2S   = ['Volume','RSI','MACD','Stochastic']

function PTip({ active, payload }) {
  if (!active||!payload?.length) return null
  const d = payload[0]?.payload; if (!d) return null
  return (
    <div style={{ background:'var(--s2)', border:'1px solid var(--b2)', borderRadius:'var(--rr)',
      padding:'9px 12px', fontSize:11, fontFamily:'var(--mono)', minWidth:145,
      boxShadow:'0 12px 36px rgba(0,0,0,.6)' }}>
      <div style={{ color:'var(--t3)', marginBottom:5, fontSize:9 }}>{d.date}</div>
      {d.high !=null&&<div>H <span style={{color:'var(--g)'}}>₹{fmt(d.high)}</span></div>}
      {d.low  !=null&&<div>L <span style={{color:'var(--r)'}}>₹{fmt(d.low)}</span></div>}
      {d.open !=null&&<div>O <span style={{color:'var(--t2)'}}>₹{fmt(d.open)}</span></div>}
      {d.close!=null&&<div>C <span style={{color:'var(--t1)',fontWeight:700}}>₹{fmt(d.close)}</span></div>}
      {d.volume!=null&&<div style={{borderTop:'1px solid var(--b1)',marginTop:5,paddingTop:5,color:'var(--t3)'}}>
        {(d.volume/1e6).toFixed(2)}M vol</div>}
    </div>
  )
}

function P2Tip({ active, payload }) {
  if (!active||!payload?.length) return null
  return (
    <div style={{ background:'var(--s2)', border:'1px solid var(--b2)', borderRadius:'var(--rr)',
      padding:'7px 10px', fontSize:11, fontFamily:'var(--mono)',
      boxShadow:'0 12px 36px rgba(0,0,0,.6)' }}>
      {payload.map((p,i)=>(
        <div key={i} style={{color:p.color}}>
          {p.name}: {typeof p.value==='number'?p.value.toFixed(2):p.value}
        </div>
      ))}
    </div>
  )
}

export default function MainChart() {
  const { activeSym, activeCompany } = useApp()
  const [data,    setData   ] = useState([])
  const [days,    setDays   ] = useState(90)
  const [overlays,setOvr    ] = useState(['MA20'])
  const [panel2,  setPanel2 ] = useState('Volume')
  const [loading, setLoading] = useState(false)
  const ctrl = useRef(null)

  useEffect(() => {
    ctrl.current?.abort()
    ctrl.current = new AbortController()
    setLoading(true)
    api.data(activeSym, days, ctrl.current.signal)
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { if (e.name!=='AbortError') setLoading(false) })
    return () => ctrl.current?.abort()
  }, [activeSym, days])

  const toggle = o => setOvr(p => p.includes(o)?p.filter(x=>x!==o):[...p,o])
  const showBB = overlays.includes('BB')

  // Strip info above chart from activeCompany (instant)
  const ac = activeCompany

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden',
      background:'var(--bg)' }}>

      {/* ── Stock strip (instant from company data) ── */}
      {ac && (
        <div style={{
          padding:'6px 14px', background:'var(--s1)', borderBottom:'1px solid var(--b1)',
          display:'flex', alignItems:'center', gap:12, flexWrap:'wrap', flexShrink:0,
        }}>
          <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
            <span style={{ fontFamily:'var(--mono)', fontSize:13, fontWeight:700,
              color:'var(--g)' }}>{ac.symbol}</span>
            <span style={{ fontFamily:'var(--mono)', fontSize:18, fontWeight:700,
              color:'var(--t1)' }}>₹{fmt(ac.close)}</span>
            <span className={cls(ac.change_pct)}
              style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:600 }}>
              {sign(ac.change_pct)}
            </span>
          </div>
          <div style={{ display:'flex', gap:14, fontSize:10, color:'var(--t3)',
            fontFamily:'var(--mono)' }}>
            <span>H&nbsp;<span style={{color:'var(--g)'}}>₹{fmt(ac.high)}</span></span>
            <span>L&nbsp;<span style={{color:'var(--r)'}}>₹{fmt(ac.low)}</span></span>
            <span>Vol&nbsp;<span style={{color:'var(--t2)'}}>
              {ac.volume>=1e7?(ac.volume/1e7).toFixed(1)+'Cr':
               ac.volume>=1e5?(ac.volume/1e5).toFixed(1)+'L':ac.volume}
            </span></span>
          </div>
        </div>
      )}

      {/* ── Toolbar ── */}
      <div style={{
        display:'flex', alignItems:'center', gap:5, flexWrap:'wrap',
        padding:'6px 12px', borderBottom:'1px solid var(--b1)',
        background:'var(--s1)', flexShrink:0,
      }}>
        {/* Period */}
        <div className="tabs" style={{ gap:2 }}>
          {DAYS.map(d=>(
            <button key={d} className={`tab ${days===d?'active':''}`}
              style={{padding:'3px 8px',fontSize:10}}
              onClick={()=>setDays(d)}>{d}D</button>
          ))}
        </div>

        <div className="div-v"/>

        {/* Overlays */}
        {OVS.map(o=>(
          <button key={o} className={`tab ${overlays.includes(o)?'active':''}`}
            style={{padding:'3px 8px',fontSize:10}}
            onClick={()=>toggle(o)}>{o}</button>
        ))}

        <div className="div-v"/>

        {/* Panel 2 */}
        {P2S.map(p=>(
          <button key={p} className={`tab ${panel2===p?'active':''}`}
            style={{padding:'3px 8px',fontSize:10}}
            onClick={()=>setPanel2(p)}>{p}</button>
        ))}

        {loading && <div className="spinner" style={{width:13,height:13,marginLeft:'auto'}}/>}
      </div>

      {/* ── Charts ── */}
      {data.length===0&&!loading ? (
        <div className="spin-center">
          <span style={{color:'var(--t3)',fontSize:12}}>No data</span>
        </div>
      ) : (
        <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',padding:'6px 0 2px'}}>

          {/* Price chart 68% */}
          <div style={{flex:'0 0 68%',minHeight:0}}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{left:4,right:8,top:4,bottom:0}}>
                <CartesianGrid strokeDasharray="1 5" stroke="var(--b1)" vertical={false}/>
                <XAxis dataKey="date" tickFormatter={sd}
                  tick={{fontSize:9,fill:'var(--t3)',fontFamily:'var(--mono)'}}
                  tickLine={false} axisLine={{stroke:'var(--b2)'}} minTickGap={48}/>
                <YAxis orientation="right" domain={['auto','auto']}
                  tick={{fontSize:9,fill:'var(--t3)',fontFamily:'var(--mono)'}}
                  tickLine={false} axisLine={false}
                  tickFormatter={v=>'₹'+Math.round(v).toLocaleString('en-IN')}/>
                <Tooltip content={<PTip/>}/>

                {showBB&&<>
                  <Line dataKey="bb_up" stroke="var(--blue)" strokeWidth={.7}
                    dot={false} strokeDasharray="3 3" name="BB↑" opacity={.7}/>
                  <Line dataKey="bb_dn" stroke="var(--blue)" strokeWidth={.7}
                    dot={false} strokeDasharray="3 3" name="BB↓" opacity={.7}/>
                </>}
                {overlays.includes('VWAP')&&
                  <Line dataKey="vwap" stroke="var(--ind-orange)" strokeWidth={1}
                    dot={false} strokeDasharray="4 3" name="VWAP" opacity={.8}/>}
                {overlays.includes('MA20')&&
                  <Line dataKey="ma20" stroke="var(--ind-cyan)" strokeWidth={1.2}
                    dot={false} name="MA20"/>}
                {overlays.includes('MA50')&&
                  <Line dataKey="ma50" stroke="var(--ind-purple)" strokeWidth={1.2}
                    dot={false} name="MA50"/>}
                <Line dataKey="close" stroke="var(--g)" strokeWidth={1.8} dot={false}
                  name="Close" activeDot={{r:4,fill:'var(--g)',stroke:'var(--s1)',strokeWidth:2}}/>
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Panel 2 — 30% */}
          <div style={{flex:'0 0 30%',minHeight:0,borderTop:'1px solid var(--b1)'}}>
            <ResponsiveContainer width="100%" height="100%">
              {panel2==='RSI' ? (
                <ComposedChart data={data} margin={{left:4,right:8,top:3,bottom:0}}>
                  <CartesianGrid strokeDasharray="1 5" stroke="var(--b1)" vertical={false}/>
                  <XAxis dataKey="date" tickFormatter={sd}
                    tick={{fontSize:9,fill:'var(--t3)',fontFamily:'var(--mono)'}}
                    tickLine={false} axisLine={false} minTickGap={48}/>
                  <YAxis orientation="right" domain={[0,100]}
                    tick={{fontSize:9,fill:'var(--t3)',fontFamily:'var(--mono)'}}
                    tickLine={false} axisLine={false}/>
                  <Tooltip content={<P2Tip/>}/>
                  <ReferenceLine y={70} stroke="rgba(232,67,90,.4)" strokeDasharray="3 2"/>
                  <ReferenceLine y={50} stroke="var(--b3)" strokeDasharray="2 4"/>
                  <ReferenceLine y={30} stroke="rgba(0,201,138,.4)" strokeDasharray="3 2"/>
                  <Line dataKey="rsi" stroke="var(--ind-cyan)" strokeWidth={1.4}
                    dot={false} name="RSI(14)"/>
                </ComposedChart>
              ) : panel2==='MACD' ? (
                <ComposedChart data={data} margin={{left:4,right:8,top:3,bottom:0}}>
                  <CartesianGrid strokeDasharray="1 5" stroke="var(--b1)" vertical={false}/>
                  <XAxis dataKey="date" tickFormatter={sd}
                    tick={{fontSize:9,fill:'var(--t3)',fontFamily:'var(--mono)'}}
                    tickLine={false} axisLine={false} minTickGap={48}/>
                  <YAxis orientation="right"
                    tick={{fontSize:9,fill:'var(--t3)',fontFamily:'var(--mono)'}}
                    tickLine={false} axisLine={false}/>
                  <Tooltip content={<P2Tip/>}/>
                  <ReferenceLine y={0} stroke="var(--b3)" strokeWidth={1}/>
                  <Bar dataKey="macd_hist" fill="var(--ind-cyan)" fillOpacity={.6} name="Hist"/>
                  <Line dataKey="macd"     stroke="var(--g)"          strokeWidth={1.2} dot={false} name="MACD"/>
                  <Line dataKey="macd_sig" stroke="var(--ind-orange)" strokeWidth={1.2} dot={false} name="Signal"/>
                </ComposedChart>
              ) : panel2==='Stochastic' ? (
                <ComposedChart data={data} margin={{left:4,right:8,top:3,bottom:0}}>
                  <CartesianGrid strokeDasharray="1 5" stroke="var(--b1)" vertical={false}/>
                  <XAxis dataKey="date" tickFormatter={sd}
                    tick={{fontSize:9,fill:'var(--t3)',fontFamily:'var(--mono)'}}
                    tickLine={false} axisLine={false} minTickGap={48}/>
                  <YAxis orientation="right" domain={[0,100]}
                    tick={{fontSize:9,fill:'var(--t3)',fontFamily:'var(--mono)'}}
                    tickLine={false} axisLine={false}/>
                  <Tooltip content={<P2Tip/>}/>
                  <ReferenceLine y={80} stroke="rgba(232,67,90,.4)" strokeDasharray="3 2"/>
                  <ReferenceLine y={20} stroke="rgba(0,201,138,.4)" strokeDasharray="3 2"/>
                  <Line dataKey="stoch_k" stroke="var(--ind-purple)" strokeWidth={1.3} dot={false} name="%K"/>
                  <Line dataKey="stoch_d" stroke="var(--ind-yellow)" strokeWidth={1.3} dot={false} name="%D"/>
                </ComposedChart>
              ) : (
                <ComposedChart data={data} margin={{left:4,right:8,top:3,bottom:0}}>
                  <CartesianGrid strokeDasharray="1 5" stroke="var(--b1)" vertical={false}/>
                  <XAxis dataKey="date" tickFormatter={sd}
                    tick={{fontSize:9,fill:'var(--t3)',fontFamily:'var(--mono)'}}
                    tickLine={false} axisLine={false} minTickGap={48}/>
                  <YAxis orientation="right"
                    tick={{fontSize:9,fill:'var(--t3)',fontFamily:'var(--mono)'}}
                    tickLine={false} axisLine={false}
                    tickFormatter={v=>(v/1e6).toFixed(1)+'M'}/>
                  <Tooltip content={<P2Tip/>}/>
                  <Bar dataKey="volume" name="Volume" fill="var(--blue)" fillOpacity={.5}/>
                </ComposedChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
