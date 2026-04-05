import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { api, fmt, sign, cls } from '../api.js'

const SECTORS = ['IT','Banking','Finance','Energy','FMCG','Auto','Pharma','Infra','Materials','Utilities','Conglomerate']

const COLS = [
  { key:'symbol',    label:'Symbol',  w:75 },
  { key:'name',      label:'Company', w:160, fmt: v => v?.length>24 ? v.slice(0,23)+'…' : v },
  { key:'sector',    label:'Sector',  w:110 },
  { key:'close',     label:'Price ₹', w:80,  fmt: v => fmt(v), mono:true },
  { key:'change_pct',label:'Change',  w:70,  fmt: (v,r) => <span className={cls(v)}>{sign(v)}</span>, mono:true },
  { key:'rsi',       label:'RSI',     w:55,  fmt: v => v?.toFixed(1) ?? '—', mono:true },
  { key:'volatility',label:'Vol %',   w:60,  fmt: v => v ? v+'%' : '—', mono:true },
  { key:'pe',        label:'P/E',     w:55,  fmt: v => v ?? '—', mono:true },
  { key:'pb',        label:'P/B',     w:50,  fmt: v => v ?? '—', mono:true },
  { key:'div_yield', label:'Div %',   w:55,  fmt: v => v ? v+'%' : '—', mono:true },
  { key:'mktcap',    label:'M.Cap',   w:80,  fmt: v => v ? '₹'+v+'L Cr' : '—', mono:true },
]

export default function Screener() {
  const { tab, selectSymbol } = useApp()
  const [params,  setParams ] = useState({})
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [sortBy,  setSortBy ] = useState('change_pct')
  const [sortAsc, setSortAsc] = useState(false)

  const run = () => {
    setLoading(true)
    api.screener({ ...params, sort_by:sortBy, sort_asc:sortAsc })
      .then(d => { setResults(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { if (tab === 'screener') run() }, [tab, sortBy, sortAsc])

  const set = (k, v) => setParams(p => ({ ...p, [k]: v || null }))

  const toggleSort = col => {
    if (sortBy === col) setSortAsc(p => !p)
    else { setSortBy(col); setSortAsc(false) }
  }

  if (tab !== 'screener') return null

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--bg)' }}>

      {/* Filter bar */}
      <div style={{
        padding:'10px 14px', borderBottom:'1px solid var(--b1)',
        background:'var(--s1)', flexShrink:0,
      }}>
        <div style={{ display:'flex', flexWrap:'wrap', gap:7, alignItems:'center' }}>

          <select className="input" style={{ width:132 }}
            value={params.sector||''} onChange={e => set('sector', e.target.value)}>
            <option value="">All Sectors</option>
            {SECTORS.map(s => <option key={s}>{s}</option>)}
          </select>

          <input className="input" type="number" style={{ width:82 }}
            placeholder="RSI min" value={params.min_rsi||''}
            onChange={e => set('min_rsi', e.target.value)}/>
          <input className="input" type="number" style={{ width:82 }}
            placeholder="RSI max" value={params.max_rsi||''}
            onChange={e => set('max_rsi', e.target.value)}/>

          <input className="input" type="number" style={{ width:82 }}
            placeholder="PE max" value={params.max_pe||''}
            onChange={e => set('max_pe', e.target.value)}/>

          <input className="input" type="number" style={{ width:82 }}
            placeholder="Div min %" value={params.min_div||''}
            onChange={e => set('min_div', e.target.value)}/>

          <input className="input" type="number" style={{ width:82 }}
            placeholder="Chg% min" value={params.min_chg||''}
            onChange={e => set('min_chg', e.target.value)}/>
          <input className="input" type="number" style={{ width:82 }}
            placeholder="Chg% max" value={params.max_chg||''}
            onChange={e => set('max_chg', e.target.value)}/>

          <button className="btn btn-primary" onClick={run} style={{ minWidth:70 }}>
            {loading ? '…' : 'Screen'}
          </button>
          <button className="btn btn-ghost" onClick={() => { setParams({}); setTimeout(run, 50) }}>
            Reset
          </button>

          <span style={{ marginLeft:'auto', fontSize:11, color:'var(--t3)', fontFamily:'var(--mono)' }}>
            {results.length} result{results.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Table */}
      <div style={{ flex:1, overflowY:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
          <thead>
            <tr style={{ background:'var(--s2)', position:'sticky', top:0, zIndex:10 }}>
              {COLS.map(c => (
                <th key={c.key}
                  onClick={() => toggleSort(c.key)}
                  style={{
                    padding:'7px 10px', textAlign:'left', cursor:'pointer', whiteSpace:'nowrap',
                    fontSize:10, fontWeight:600, letterSpacing:'.06em', textTransform:'uppercase',
                    color: sortBy===c.key ? 'var(--g)' : 'var(--t3)',
                    borderBottom:'1px solid var(--b2)',
                    width: c.w, minWidth: c.w,
                    userSelect:'none', transition:'color .15s',
                  }}
                >
                  {c.label} {sortBy===c.key ? (sortAsc?'↑':'↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.map((row, i) => (
              <tr key={row.symbol}
                onClick={() => selectSymbol(row.symbol)}
                style={{
                  background: i%2===0 ? 'transparent' : 'rgba(255,255,255,.013)',
                  cursor:'pointer', transition:'background .1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background='var(--s3)'}
                onMouseLeave={e => e.currentTarget.style.background=i%2===0?'transparent':'rgba(255,255,255,.013)'}
              >
                {COLS.map(c => (
                  <td key={c.key} style={{
                    padding:'7px 10px', borderBottom:'1px solid var(--b1)',
                    fontFamily: c.mono ? 'var(--mono)' : 'var(--ui)',
                    color: c.key==='symbol' ? 'var(--g)' : 'var(--t1)',
                    fontWeight: c.key==='symbol' ? 600 : 400,
                    whiteSpace:'nowrap', fontSize: c.mono ? 11 : 12,
                  }}>
                    {c.fmt ? c.fmt(row[c.key], row) : (row[c.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
            {results.length === 0 && !loading && (
              <tr>
                <td colSpan={COLS.length} style={{
                  padding:40, textAlign:'center', color:'var(--t3)', fontSize:12, fontFamily:'var(--mono)',
                }}>
                  No stocks match the current filters — try adjusting or resetting.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
