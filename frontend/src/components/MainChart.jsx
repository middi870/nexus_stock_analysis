import { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { api, fmt, sign, cls, sd } from '../api.js'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer, ReferenceLine,
} from 'recharts'

const DAYS  = [30,60,90,180,365]
const OVS   = ['MA20','MA50','BB','VWAP']
const P2S   = ['Volume','RSI','MACD','Stochastic']

const TIP_STYLE = {
  background:'var(--s2)',border:'1px solid var(--b2)',
  borderRadius:'var(--rr)',padding:'9px 12px',
  fontSize:11,fontFamily:'var(--mono)',
  boxShadow:'0 12px 40px rgba(0,0,0,.7)',
}

function PTip({active,payload}){
  if(!active||!payload?.length)return null
  const d=payload[0]?.payload;if(!d)return null
  return(
    <div style={{...TIP_STYLE,minWidth:145}}>
      <div style={{color:'var(--t3)',marginBottom:5,fontSize:9}}>{d.date}</div>
      {d.high !=null&&<div>H <span style={{color:'var(--green)'}}>₹{fmt(d.high)}</span></div>}
      {d.low  !=null&&<div>L <span style={{color:'var(--red)'}}>₹{fmt(d.low)}</span></div>}
      {d.open !=null&&<div>O <span style={{color:'var(--t2)'}}>₹{fmt(d.open)}</span></div>}
      {d.close!=null&&<div>C <span style={{color:'var(--t1)',fontWeight:700}}>₹{fmt(d.close)}</span></div>}
      {d.volume!=null&&<div style={{borderTop:'1px solid var(--b1)',marginTop:5,paddingTop:5,color:'var(--t3)'}}>
        {(d.volume/1e6).toFixed(2)}M vol</div>}
    </div>
  )
}

function P2Tip({active,payload}){
  if(!active||!payload?.length)return null
  return(
    <div style={TIP_STYLE}>
      {payload.map((p,i)=>(
        <div key={i} style={{color:p.color}}>
          {p.name}: {typeof p.value==='number'?p.value.toFixed(2):p.value}
        </div>
      ))}
    </div>
  )
}

export default function MainChart() {
  const { activeSym, activeCompany:ac } = useApp()
  const [data,    setData  ]=useState([])
  const [days,    setDays  ]=useState(90)
  const [overlays,setOvr   ]=useState(['MA20'])
  const [panel2,  setP2    ]=useState('Volume')
  const [loading, setLoad  ]=useState(false)
  const ctrl=useRef(null)

  useEffect(()=>{
    ctrl.current?.abort()
    ctrl.current=new AbortController()
    setLoad(true)
    api.data(activeSym,days,ctrl.current.signal)
      .then(d=>{setData(d);setLoad(false)})
      .catch(e=>{if(e.name!=='AbortError')setLoad(false)})
    return()=>ctrl.current?.abort()
  },[activeSym,days])

  const toggle=o=>setOvr(p=>p.includes(o)?p.filter(x=>x!==o):[...p,o])

  return(
    <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',background:'var(--bg)'}}>

      {/* Stock strip — instant from activeCompany */}
      {ac&&(
        <div style={{
          padding:'7px 14px',background:'var(--s1)',
          borderBottom:'1px solid var(--b1)',
          display:'flex',alignItems:'center',gap:14,flexWrap:'wrap',flexShrink:0,
        }}>
          <div style={{display:'flex',alignItems:'baseline',gap:10}}>
            <span style={{fontFamily:'var(--mono)',fontSize:12,fontWeight:700,color:'var(--green)'}}>
              {ac.symbol}
            </span>
            <span style={{fontFamily:'var(--mono)',fontSize:20,fontWeight:700,color:'var(--t1)'}}>
              ₹{fmt(ac.close)}
            </span>
            <span className={cls(ac.change_pct)}
              style={{fontFamily:'var(--mono)',fontSize:12,fontWeight:700}}>
              {sign(ac.change_pct)}
            </span>
          </div>
          <div style={{display:'flex',gap:16,fontSize:10,color:'var(--t2)',fontFamily:'var(--mono)'}}>
            <span>H&nbsp;<span style={{color:'var(--green)'}}>₹{fmt(ac.high)}</span></span>
            <span>L&nbsp;<span style={{color:'var(--red)'}}>₹{fmt(ac.low)}</span></span>
            <span>O&nbsp;₹{fmt(ac.open)}</span>
            <span style={{color:'var(--t3)'}}>
              {ac.volume>=1e7?(ac.volume/1e7).toFixed(1)+'Cr vol':
               ac.volume>=1e5?(ac.volume/1e5).toFixed(1)+'L vol':
               ac.volume?.toLocaleString()+' vol'}
            </span>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div style={{
        display:'flex',alignItems:'center',gap:5,flexWrap:'wrap',
        padding:'5px 12px',borderBottom:'1px solid var(--b1)',
        background:'var(--s1)',flexShrink:0,
      }}>
        <div className="tab-row" style={{gap:2}}>
          {DAYS.map(d=>(
            <button key={d} className={`tab-btn ${days===d?'on':''}`}
              style={{padding:'3px 9px',fontSize:10}} onClick={()=>setDays(d)}>{d}D</button>
          ))}
        </div>
        <div className="divider-v"/>
        {OVS.map(o=>(
          <button key={o} className={`tab-btn ${overlays.includes(o)?'on':''}`}
            style={{padding:'3px 9px',fontSize:10}} onClick={()=>toggle(o)}>{o}</button>
        ))}
        <div className="divider-v"/>
        {P2S.map(p=>(
          <button key={p} className={`tab-btn ${panel2===p?'on':''}`}
            style={{padding:'3px 9px',fontSize:10}} onClick={()=>setP2(p)}>{p}</button>
        ))}
        {loading&&<div className="spinner" style={{width:13,height:13,marginLeft:'auto'}}/>}
      </div>

      {/* Charts */}
      {data.length===0&&!loading?(
        <div className="spin-center">
          <div className="spinner"/>
          <span style={{color:'var(--t4)',fontSize:11,fontFamily:'var(--mono)'}}>Loading…</span>
        </div>
      ):(
        <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',padding:'6px 0 2px'}}>

          {/* Price 68% */}
          <div style={{flex:'0 0 68%',minHeight:0}}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{left:4,right:8,top:4,bottom:0}}>
                <CartesianGrid strokeDasharray="1 6" stroke="var(--b1)" vertical={false}/>
                <XAxis dataKey="date" tickFormatter={sd}
                  tick={{fontSize:9,fill:'var(--t3)',fontFamily:'var(--mono)'}}
                  tickLine={false} axisLine={{stroke:'var(--b2)'}} minTickGap={52}/>
                <YAxis orientation="right" domain={['auto','auto']}
                  tick={{fontSize:9,fill:'var(--t3)',fontFamily:'var(--mono)'}}
                  tickLine={false} axisLine={false}
                  tickFormatter={v=>'₹'+Math.round(v).toLocaleString('en-IN')}/>
                <Tooltip content={<PTip/>}/>
                {overlays.includes('BB')&&<>
                  <Line dataKey="bb_up" stroke="var(--blue)" strokeWidth={.7}
                    dot={false} strokeDasharray="3 3" opacity={.65}/>
                  <Line dataKey="bb_dn" stroke="var(--blue)" strokeWidth={.7}
                    dot={false} strokeDasharray="3 3" opacity={.65}/>
                </>}
                {overlays.includes('VWAP')&&
                  <Line dataKey="vwap" stroke="var(--orange)" strokeWidth={1}
                    dot={false} strokeDasharray="4 3" opacity={.8} name="VWAP"/>}
                {overlays.includes('MA20')&&
                  <Line dataKey="ma20" stroke="var(--cyan)" strokeWidth={1.2}
                    dot={false} name="MA20"/>}
                {overlays.includes('MA50')&&
                  <Line dataKey="ma50" stroke="var(--purple)" strokeWidth={1.2}
                    dot={false} name="MA50"/>}
                <Line dataKey="close" stroke="var(--green)" strokeWidth={1.8} dot={false}
                  name="Close" activeDot={{r:4,fill:'var(--green)',stroke:'var(--s1)',strokeWidth:2}}/>
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Panel 2 — 30% */}
          <div style={{flex:'0 0 30%',minHeight:0,borderTop:'1px solid var(--b1)'}}>
            <ResponsiveContainer width="100%" height="100%">
              {panel2==='RSI'?(
                <ComposedChart data={data} margin={{left:4,right:8,top:3,bottom:0}}>
                  <CartesianGrid strokeDasharray="1 6" stroke="var(--b1)" vertical={false}/>
                  <XAxis dataKey="date" tickFormatter={sd}
                    tick={{fontSize:9,fill:'var(--t3)',fontFamily:'var(--mono)'}}
                    tickLine={false} axisLine={false} minTickGap={52}/>
                  <YAxis orientation="right" domain={[0,100]}
                    tick={{fontSize:9,fill:'var(--t3)',fontFamily:'var(--mono)'}}
                    tickLine={false} axisLine={false}/>
                  <Tooltip content={<P2Tip/>}/>
                  <ReferenceLine y={70} stroke="rgba(239,68,68,.4)" strokeDasharray="3 2"/>
                  <ReferenceLine y={50} stroke="var(--b2)" strokeDasharray="2 5"/>
                  <ReferenceLine y={30} stroke="rgba(34,197,94,.4)" strokeDasharray="3 2"/>
                  <Line dataKey="rsi" stroke="var(--cyan)" strokeWidth={1.4}
                    dot={false} name="RSI(14)"/>
                </ComposedChart>
              ):panel2==='MACD'?(
                <ComposedChart data={data} margin={{left:4,right:8,top:3,bottom:0}}>
                  <CartesianGrid strokeDasharray="1 6" stroke="var(--b1)" vertical={false}/>
                  <XAxis dataKey="date" tickFormatter={sd}
                    tick={{fontSize:9,fill:'var(--t3)',fontFamily:'var(--mono)'}}
                    tickLine={false} axisLine={false} minTickGap={52}/>
                  <YAxis orientation="right"
                    tick={{fontSize:9,fill:'var(--t3)',fontFamily:'var(--mono)'}}
                    tickLine={false} axisLine={false}/>
                  <Tooltip content={<P2Tip/>}/>
                  <ReferenceLine y={0} stroke="var(--b3)" strokeWidth={1}/>
                  <Bar dataKey="macd_hist" fill="var(--cyan)" fillOpacity={.6} name="Hist"/>
                  <Line dataKey="macd"     stroke="var(--green)"  strokeWidth={1.2} dot={false} name="MACD"/>
                  <Line dataKey="macd_sig" stroke="var(--orange)" strokeWidth={1.2} dot={false} name="Signal"/>
                </ComposedChart>
              ):panel2==='Stochastic'?(
                <ComposedChart data={data} margin={{left:4,right:8,top:3,bottom:0}}>
                  <CartesianGrid strokeDasharray="1 6" stroke="var(--b1)" vertical={false}/>
                  <XAxis dataKey="date" tickFormatter={sd}
                    tick={{fontSize:9,fill:'var(--t3)',fontFamily:'var(--mono)'}}
                    tickLine={false} axisLine={false} minTickGap={52}/>
                  <YAxis orientation="right" domain={[0,100]}
                    tick={{fontSize:9,fill:'var(--t3)',fontFamily:'var(--mono)'}}
                    tickLine={false} axisLine={false}/>
                  <Tooltip content={<P2Tip/>}/>
                  <ReferenceLine y={80} stroke="rgba(239,68,68,.35)" strokeDasharray="3 2"/>
                  <ReferenceLine y={20} stroke="rgba(34,197,94,.35)" strokeDasharray="3 2"/>
                  <Line dataKey="stoch_k" stroke="var(--purple)" strokeWidth={1.3} dot={false} name="%K"/>
                  <Line dataKey="stoch_d" stroke="var(--amber)"  strokeWidth={1.3} dot={false} name="%D"/>
                </ComposedChart>
              ):(
                <ComposedChart data={data} margin={{left:4,right:8,top:3,bottom:0}}>
                  <CartesianGrid strokeDasharray="1 6" stroke="var(--b1)" vertical={false}/>
                  <XAxis dataKey="date" tickFormatter={sd}
                    tick={{fontSize:9,fill:'var(--t3)',fontFamily:'var(--mono)'}}
                    tickLine={false} axisLine={false} minTickGap={52}/>
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
