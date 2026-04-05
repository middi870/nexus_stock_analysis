import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { api, fmt, sign, cls } from '../api.js'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const DAYS_OPTS = [30, 60, 90, 180, 365]

export default function Compare() {
  const { tab, companies, activeSym } = useApp()
  const [sym1,   setSym1  ] = useState(activeSym || 'TCS')
  const [sym2,   setSym2  ] = useState('INFY')
  const [days,   setDays  ] = useState(90)
  const [result, setResult] = useState(null)
  const [loading,setLoading] = useState(false)
  const [err,    setErr   ] = useState(null)

  useEffect(() => {
    if (activeSym) setSym1(activeSym)
  }, [activeSym])

  const run = () => {
    if (!sym1 || !sym2 || sym1 === sym2) return
    setLoading(true); setErr(null)
    api.compare(sym1, sym2, days)
      .then(d => { setResult(d); setLoading(false) })
      .catch(e => { setErr(e.message); setLoading(false) })
  }

  useEffect(() => { if (tab === 'compare') run() }, [tab, sym1, sym2, days])

  if (tab !== 'compare') return null

  const syms = companies.map(c => c.symbol)

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--bg)' }}>
      {/* Toolbar */}
      <div style={{
        padding:'8px 14px', borderBottom:'1px solid var(--b1)',
        background:'var(--s1)', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', flexShrink:0,
      }}>
        <span style={{ fontFamily:'var(--display)', fontSize:13, fontWeight:600, color:'var(--t1)' }}>Compare</span>

        <select className="input" style={{ width:130 }} value={sym1} onChange={e=>setSym1(e.target.value)}>
          {syms.map(s=><option key={s}>{s}</option>)}
        </select>
        <span style={{ color:'var(--t3)', fontSize:12 }}>vs</span>
        <select className="input" style={{ width:130 }} value={sym2} onChange={e=>setSym2(e.target.value)}>
          {syms.filter(s=>s!==sym1).map(s=><option key={s}>{s}</option>)}
        </select>

        {DAYS_OPTS.map(d=>(
          <button key={d} className={`tab ${days===d?'active':''}`} style={{ padding:'3px 9px', fontSize:10 }}
            onClick={()=>setDays(d)}>{d}D</button>
        ))}

        {loading && <div className="spinner" style={{ width:14, height:14 }}/>}
      </div>

      {err && <div style={{ padding:16, color:'var(--r)', fontSize:12, fontFamily:'var(--mono)' }}>{err}</div>}

      {result && (
        <div style={{ flex:1, overflow:'auto', padding:16 }}>
          {/* Stats row */}
          <div style={{ display:'flex', gap:12, marginBottom:16, flexWrap:'wrap' }}>
            {[
              { label:`${result.symbol1} Return`, value:sign(result.return1), color: result.return1>=0?'var(--g)':'var(--r)' },
              { label:`${result.symbol2} Return`, value:sign(result.return2), color: result.return2>=0?'var(--g)':'var(--r)' },
              { label:'Correlation', value:result.correlation?.toFixed(3), color:'var(--blue)' },
              { label:'Period', value:`${result.days}D`, color:'var(--t2)' },
            ].map(stat=>(
              <div key={stat.label} style={{
                background:'var(--s2)', border:'1px solid var(--b2)',
                borderRadius:'var(--rr2)', padding:'10px 16px', minWidth:130,
              }}>
                <div style={{ fontSize:10, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>
                  {stat.label}
                </div>
                <div style={{ fontFamily:'var(--mono)', fontSize:18, fontWeight:700, color:stat.color }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div style={{ height:340 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={result.series} margin={{ left:8, right:8, top:8, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--b1)" vertical={false}/>
                <XAxis dataKey="date" tick={{ fontSize:9, fill:'var(--t3)', fontFamily:'var(--mono)' }}
                  tickLine={false} axisLine={{ stroke:'var(--b2)' }} minTickGap={40}/>
                <YAxis orientation="right" tick={{ fontSize:9, fill:'var(--t3)', fontFamily:'var(--mono)' }}
                  tickLine={false} axisLine={false} tickFormatter={v=>v.toFixed(0)}
                  label={{ value:'Base 100', angle:-90, position:'insideRight', fill:'var(--t4)', fontSize:9 }}/>
                <Tooltip
                  contentStyle={{ background:'var(--s2)', border:'1px solid var(--b2)', borderRadius:'var(--rr)', fontSize:11, fontFamily:'var(--mono)' }}
                  labelStyle={{ color:'var(--t2)' }}/>
                <Legend wrapperStyle={{ fontSize:11, fontFamily:'var(--mono)', color:'var(--t2)' }}/>
                <Line dataKey={`norm_${result.symbol1}`} stroke="var(--g)"    strokeWidth={2} dot={false} name={result.symbol1}/>
                <Line dataKey={`norm_${result.symbol2}`} stroke="var(--blue)" strokeWidth={2} dot={false} name={result.symbol2}/>
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={{ fontSize:10, color:'var(--t3)', fontFamily:'var(--mono)', marginTop:8, textAlign:'center' }}>
            Normalised to base 100. Correlation r={result.correlation?.toFixed(4)}.
          </div>
        </div>
      )}
    </div>
  )
}
