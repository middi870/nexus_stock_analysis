import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { api, fmt, sign, cls } from '../api.js'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts'
import { IcoScale } from '../icons.jsx'

const DAYS=[30,60,90,180,365]

export default function Compare() {
  const { companies, activeSym, selectSymbol } = useApp()
  const [sym1,    setSym1  ] = useState(activeSym||'TCS')
  const [sym2,    setSym2  ] = useState('INFY')
  const [days,    setDays  ] = useState(90)
  const [result,  setResult] = useState(null)
  const [loading, setLoad  ] = useState(false)
  const [err,     setErr   ] = useState(null)

  useEffect(()=>{ if(activeSym) setSym1(activeSym) },[activeSym])

  const run = () => {
    if(!sym1||!sym2||sym1===sym2) return
    setLoad(true); setErr(null)
    api.compare(sym1,sym2,days)
      .then(d=>{setResult(d);setLoad(false)})
      .catch(e=>{setErr(e.message);setLoad(false)})
  }
  useEffect(()=>{ run() },[sym1,sym2,days])

  const syms = companies.map(c=>c.symbol)
  const c1   = companies.find(c=>c.symbol===sym1)
  const c2   = companies.find(c=>c.symbol===sym2)

  const corrColor = result
    ? result.correlation>0.65?'var(--g)':result.correlation<0.3?'var(--r)':'var(--amber)'
    : 'var(--t2)'

  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',background:'var(--bg)'}}>

      {/* Toolbar */}
      <div style={{
        padding:'9px 14px', borderBottom:'1px solid var(--b1)',
        background:'var(--s1)', display:'flex', alignItems:'center', gap:8,
        flexWrap:'wrap', flexShrink:0,
      }}>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <IcoScale width={14} height={14} style={{color:'var(--t2)'}}/>
          <span style={{fontWeight:700,fontSize:13,color:'var(--t1)'}}>Compare</span>
        </div>

        <select className="input" style={{width:128}} value={sym1} onChange={e=>setSym1(e.target.value)}>
          {syms.map(s=><option key={s}>{s}</option>)}
        </select>
        <span style={{color:'var(--t4)',fontSize:11,fontFamily:'var(--mono)'}}>vs</span>
        <select className="input" style={{width:128}} value={sym2}
          onChange={e=>setSym2(e.target.value)}>
          {syms.filter(s=>s!==sym1).map(s=><option key={s}>{s}</option>)}
        </select>

        <div className="tabs" style={{gap:2}}>
          {DAYS.map(d=>(
            <button key={d} className={`tab ${days===d?'active':''}`}
              style={{padding:'3px 8px',fontSize:10}} onClick={()=>setDays(d)}>{d}D</button>
          ))}
        </div>

        {loading&&<div className="spinner" style={{width:13,height:13}}/>}
      </div>

      {err&&(
        <div style={{padding:'12px 16px',color:'var(--r)',fontSize:12,fontFamily:'var(--mono)'}}>
          ⚠ {err}
        </div>
      )}

      {result&&(
        <div style={{flex:1,overflowY:'auto',padding:16}}>

          {/* Stats row */}
          <div style={{display:'flex',gap:10,marginBottom:20,flexWrap:'wrap'}}>
            {[
              {
                sym:sym1, name:c1?.name,
                ret:result.return1,
                price:`₹${fmt(c1?.close)}`,
                chg: sign(c1?.change_pct),
                chgColor: (c1?.change_pct??0)>=0?'var(--g)':'var(--r)',
                lineColor:'var(--g)',
              },
              {
                sym:sym2, name:c2?.name,
                ret:result.return2,
                price:`₹${fmt(c2?.close)}`,
                chg: sign(c2?.change_pct),
                chgColor: (c2?.change_pct??0)>=0?'var(--g)':'var(--r)',
                lineColor:'var(--blue)',
              },
            ].map(s=>(
              <div key={s.sym} style={{
                background:'var(--s2)', border:'1px solid var(--b2)',
                borderRadius:'var(--rr2)', padding:'12px 16px', flex:'1 1 180px',
                borderTop:`3px solid ${s.lineColor}`,
              }}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                  <span style={{fontFamily:'var(--mono)',fontWeight:700,fontSize:13,
                    color:s.lineColor}}>{s.sym}</span>
                  <span style={{fontSize:10,color:'var(--t3)'}}>{s.name?.split(' ').slice(0,2).join(' ')}</span>
                </div>
                <div style={{fontFamily:'var(--mono)',fontSize:16,fontWeight:700,
                  color:'var(--t1)',marginBottom:4}}>{s.price}</div>
                <div style={{display:'flex',gap:10,alignItems:'center'}}>
                  <span style={{fontFamily:'var(--mono)',fontSize:11,color:s.chgColor,fontWeight:600}}>
                    {s.chg} today
                  </span>
                  <span style={{
                    fontFamily:'var(--mono)',fontSize:12,fontWeight:700,
                    color:s.ret>=0?'var(--g)':'var(--r)',
                  }}>
                    {sign(s.ret)} in {days}D
                  </span>
                </div>
              </div>
            ))}

            {/* Correlation card */}
            <div style={{
              background:'var(--s2)', border:'1px solid var(--b2)',
              borderRadius:'var(--rr2)', padding:'12px 16px',
              flex:'0 0 160px',
            }}>
              <div style={{fontSize:10,color:'var(--t3)',textTransform:'uppercase',
                letterSpacing:'.07em',marginBottom:4}}>Correlation</div>
              <div style={{fontFamily:'var(--mono)',fontSize:24,fontWeight:700,
                color:corrColor,lineHeight:1}}>
                {result.correlation?.toFixed(3)}
              </div>
              <div style={{fontSize:9,color:'var(--t4)',fontFamily:'var(--mono)',marginTop:4}}>
                {result.correlation>0.65?'High — moves together':
                 result.correlation<0.3 ?'Low — good diversifier':
                 'Moderate correlation'}
              </div>
            </div>
          </div>

          {/* Chart */}
          <div style={{height:320,background:'var(--s1)',borderRadius:'var(--rr2)',
            border:'1px solid var(--b1)',padding:'12px 8px 8px'}}>
            <div style={{fontSize:9,color:'var(--t3)',fontFamily:'var(--mono)',
              letterSpacing:'.07em',marginBottom:8,paddingLeft:6}}>
              NORMALISED PERFORMANCE · BASE 100 · {result.days}D
            </div>
            <div style={{height:'calc(100% - 24px)'}}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={result.series} margin={{left:4,right:12,top:0,bottom:0}}>
                  <CartesianGrid strokeDasharray="1 5" stroke="var(--b1)" vertical={false}/>
                  <XAxis dataKey="date"
                    tick={{fontSize:9,fill:'var(--t3)',fontFamily:'var(--mono)'}}
                    tickLine={false} axisLine={{stroke:'var(--b2)'}} minTickGap={48}/>
                  <YAxis orientation="right"
                    tick={{fontSize:9,fill:'var(--t3)',fontFamily:'var(--mono)'}}
                    tickLine={false} axisLine={false} tickFormatter={v=>v.toFixed(0)}/>
                  <ReferenceLine y={100} stroke="var(--b3)" strokeDasharray="2 4"/>
                  <Tooltip
                    contentStyle={{background:'var(--s2)',border:'1px solid var(--b2)',
                      borderRadius:'var(--rr)',fontSize:11,fontFamily:'var(--mono)'}}
                    labelStyle={{color:'var(--t2)',marginBottom:4}}
                    formatter={(v,n)=>[v.toFixed(2),n]}/>
                  <Legend wrapperStyle={{fontSize:11,fontFamily:'var(--mono)',
                    color:'var(--t2)',paddingTop:4}}/>
                  <Line dataKey={`norm_${sym1}`} stroke="var(--g)"    strokeWidth={2}
                    dot={false} name={sym1} activeDot={{r:4}}/>
                  <Line dataKey={`norm_${sym2}`} stroke="var(--blue)" strokeWidth={2}
                    dot={false} name={sym2} activeDot={{r:4}}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
