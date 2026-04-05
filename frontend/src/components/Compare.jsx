import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { api, fmt, sign, cls } from '../api.js'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts'

const DAYS_OPTS = [30, 60, 90, 180, 365]

export default function Compare() {
  const { tab, companies, activeSym } = useApp()
  const [sym1,    setSym1   ] = useState(activeSym || 'TCS')
  const [sym2,    setSym2   ] = useState('INFY')
  const [days,    setDays   ] = useState(90)
  const [result,  setResult ] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err,     setErr    ] = useState(null)

  useEffect(() => { if (activeSym) setSym1(activeSym) }, [activeSym])

  const run = () => {
    if (!sym1 || !sym2 || sym1 === sym2) return
    setLoading(true); setErr(null)
    api.compare(sym1, sym2, days)
      .then(d => { setResult(d); setLoading(false) })
      .catch(e => { setErr(e.message); setLoading(false) })
  }

  useEffect(() => { if (tab === 'compare') run() }, [tab, sym1, sym2, days])

  if (tab !== 'compare') return null

  const syms   = companies.map(c => c.symbol)
  const s1info = companies.find(c => c.symbol === sym1)
  const s2info = companies.find(c => c.symbol === sym2)

  const corrColor = result
    ? result.correlation > .7 ? 'var(--g)' : result.correlation < .3 ? 'var(--r)' : 'var(--amber)'
    : 'var(--t2)'

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--bg)' }}>

      {/* Toolbar */}
      <div style={{
        padding:'8px 14px', borderBottom:'1px solid var(--b1)',
        background:'var(--s1)', display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', flexShrink:0,
      }}>
        <span style={{ fontFamily:'var(--display)', fontSize:13, fontWeight:700, color:'var(--t1)', letterSpacing:'.04em' }}>
          Compare
        </span>

        <select className="input" style={{ width:130 }} value={sym1} onChange={e => setSym1(e.target.value)}>
          {syms.map(s => <option key={s}>{s}</option>)}
        </select>
        <span style={{ color:'var(--t3)', fontSize:11, fontFamily:'var(--mono)' }}>vs</span>
        <select className="input" style={{ width:130 }} value={sym2}
          onChange={e => setSym2(e.target.value)}>
          {syms.filter(s => s !== sym1).map(s => <option key={s}>{s}</option>)}
        </select>

        <div style={{ display:'flex', gap:2 }}>
          {DAYS_OPTS.map(d => (
            <button key={d} className={`tab ${days===d?'active':''}`}
              style={{ padding:'3px 8px', fontSize:10 }}
              onClick={() => setDays(d)}>{d}D</button>
          ))}
        </div>

        {loading && <div className="spinner" style={{ width:13,height:13 }}/>}
      </div>

      {err && (
        <div style={{ padding:'12px 16px', color:'var(--r)', fontSize:12, fontFamily:'var(--mono)' }}>
          ⚠ {err}
        </div>
      )}

      {result && (
        <div style={{ flex:1, overflow:'auto', padding:16 }}>

          {/* Stats cards */}
          <div style={{ display:'flex', gap:10, marginBottom:18, flexWrap:'wrap' }}>
            {[
              {
                label: sym1, sublabel: s1info?.name,
                value: sign(result.return1),
                color: result.return1 >= 0 ? 'var(--g)' : 'var(--r)',
                pill:  result.return1 >= 0 ? 'var(--gd)' : 'var(--rd)',
              },
              {
                label: sym2, sublabel: s2info?.name,
                value: sign(result.return2),
                color: result.return2 >= 0 ? 'var(--g)' : 'var(--r)',
                pill:  result.return2 >= 0 ? 'var(--gd)' : 'var(--rd)',
              },
              {
                label:'Correlation r', sublabel:'Pearson (daily returns)',
                value: result.correlation?.toFixed(3),
                color: corrColor, pill:'var(--blued)',
              },
              {
                label:'Period', sublabel:'trading days',
                value: result.days+'D',
                color:'var(--blue)', pill:'var(--blued)',
              },
            ].map(stat => (
              <div key={stat.label} style={{
                background:'var(--s2)', border:'1px solid var(--b2)',
                borderRadius:'var(--rr2)', padding:'12px 16px', minWidth:140, flex:'0 0 auto',
              }}>
                <div style={{ fontSize:10, color:'var(--t3)', textTransform:'uppercase',
                  letterSpacing:'.06em', marginBottom:2 }}>{stat.label}</div>
                {stat.sublabel && (
                  <div style={{ fontSize:9, color:'var(--t4)', marginBottom:6 }}>{stat.sublabel}</div>
                )}
                <div style={{ fontFamily:'var(--mono)', fontSize:20, fontWeight:700, color:stat.color }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          {/* Chart — normalised to base 100 */}
          <div style={{ marginBottom:8 }}>
            <div style={{ fontSize:10, color:'var(--t3)', fontFamily:'var(--mono)',
              marginBottom:8, letterSpacing:'.06em' }}>
              NORMALISED PERFORMANCE · BASE 100 · {result.days} TRADING DAYS
            </div>
          </div>

          <div style={{ height:340, background:'var(--card)', borderRadius:'var(--rr2)',
            border:'1px solid var(--b1)', padding:'12px 8px 8px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={result.series} margin={{ left:4, right:12, top:4, bottom:0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="var(--b1)" vertical={false}/>
                <XAxis dataKey="date"
                  tick={{ fontSize:9, fill:'var(--t3)', fontFamily:'var(--mono)' }}
                  tickLine={false} axisLine={{ stroke:'var(--b2)' }} minTickGap={44}/>
                <YAxis orientation="right"
                  tick={{ fontSize:9, fill:'var(--t3)', fontFamily:'var(--mono)' }}
                  tickLine={false} axisLine={false}
                  tickFormatter={v => v.toFixed(0)}/>
                <ReferenceLine y={100} stroke="var(--b3)" strokeDasharray="3 3"/>
                <Tooltip
                  contentStyle={{ background:'var(--s2)', border:'1px solid var(--b2)',
                    borderRadius:'var(--rr)', fontSize:11, fontFamily:'var(--mono)' }}
                  labelStyle={{ color:'var(--t2)', marginBottom:4 }}
                  formatter={(v, n) => [v.toFixed(2), n]}/>
                <Legend wrapperStyle={{ fontSize:11, fontFamily:'var(--mono)', color:'var(--t2)', paddingTop:6 }}/>
                <Line dataKey={`norm_${sym1}`} stroke="var(--g)"    strokeWidth={2}
                  dot={false} name={sym1} activeDot={{ r:4 }}/>
                <Line dataKey={`norm_${sym2}`} stroke="var(--blue)" strokeWidth={2}
                  dot={false} name={sym2} activeDot={{ r:4 }}/>
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={{ fontSize:9, color:'var(--t4)', fontFamily:'var(--mono)', marginTop:8, textAlign:'center' }}>
            Base 100 normalised · Correlation r={result.correlation?.toFixed(4)} ·
            {result.correlation > .7 ? ' High positive correlation' :
             result.correlation < .3 ? ' Low correlation — good for diversification' :
             ' Moderate correlation'}
          </div>
        </div>
      )}
    </div>
  )
}
