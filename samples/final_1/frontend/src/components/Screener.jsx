import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { api, fmt, sign, cls } from '../api.js'

const SECTORS = ['IT','Banking','Finance','Energy','FMCG','Auto','Pharma','Infra','Materials','Utilities','Conglomerate']

const COLS = [
  { key:'symbol',    label:'Symbol',    fmt:v=>v },
  { key:'name',      label:'Name',      fmt:v=>v?.length>22?v.slice(0,21)+'…':v },
  { key:'sector',    label:'Sector',    fmt:v=>v },
  { key:'close',     label:'Price',     fmt:v=>'₹'+fmt(v) },
  { key:'change_pct',label:'Change',    fmt:(v,r)=><span className={cls(v)}>{sign(v)}</span> },
  { key:'rsi',       label:'RSI',       fmt:v=>v?.toFixed(1)??'—' },
  { key:'volatility',label:'Vol%',      fmt:v=>v?v+'%':'—' },
  { key:'pe',        label:'P/E',       fmt:v=>v??'—' },
  { key:'pb',        label:'P/B',       fmt:v=>v??'—' },
  { key:'div_yield', label:'Div%',      fmt:v=>v?v+'%':'—' },
  { key:'mktcap',    label:'MCap',      fmt:v=>v?'₹'+v+'L Cr':'—' },
]

export default function Screener() {
  const { tab, selectSymbol } = useApp()
  const [params,   setParams  ] = useState({})
  const [results,  setResults ] = useState([])
  const [loading,  setLoading ] = useState(false)
  const [sortBy,   setSortBy  ] = useState('change_pct')
  const [sortAsc,  setSortAsc ] = useState(false)

  const setParam = (k, v) => setParams(p => ({ ...p, [k]: v }))

  const run = () => {
    setLoading(true)
    api.screener({ ...params, sort_by:sortBy, sort_asc:sortAsc })
      .then(d => { setResults(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { if (tab === 'screener') run() }, [tab, sortBy, sortAsc])

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
        <div style={{ display:'flex', flexWrap:'wrap', gap:8, alignItems:'center' }}>
          {/* Sector */}
          <select className="input" style={{ width:130 }}
            value={params.sector||''} onChange={e=>setParam('sector',e.target.value||null)}>
            <option value="">All Sectors</option>
            {SECTORS.map(s=><option key={s}>{s}</option>)}
          </select>

          {/* RSI range */}
          <input className="input" style={{ width:80 }} type="number" placeholder="RSI min"
            value={params.min_rsi||''} onChange={e=>setParam('min_rsi',e.target.value||null)}/>
          <input className="input" style={{ width:80 }} type="number" placeholder="RSI max"
            value={params.max_rsi||''} onChange={e=>setParam('max_rsi',e.target.value||null)}/>

          {/* PE range */}
          <input className="input" style={{ width:80 }} type="number" placeholder="PE max"
            value={params.max_pe||''} onChange={e=>setParam('max_pe',e.target.value||null)}/>

          {/* Dividend */}
          <input className="input" style={{ width:80 }} type="number" placeholder="Div min%"
            value={params.min_div||''} onChange={e=>setParam('min_div',e.target.value||null)}/>

          {/* Change % */}
          <input className="input" style={{ width:80 }} type="number" placeholder="Chg% min"
            value={params.min_chg||''} onChange={e=>setParam('min_chg',e.target.value||null)}/>
          <input className="input" style={{ width:80 }} type="number" placeholder="Chg% max"
            value={params.max_chg||''} onChange={e=>setParam('max_chg',e.target.value||null)}/>

          <button className="btn btn-primary" onClick={run}>
            {loading ? '…' : 'Screen'}
          </button>
          <button className="btn btn-ghost" onClick={()=>{ setParams({}); setTimeout(run,50) }}>
            Reset
          </button>

          <span style={{ marginLeft:'auto', fontSize:11, color:'var(--t3)', fontFamily:'var(--mono)' }}>
            {results.length} result{results.length!==1?'s':''}
          </span>
        </div>
      </div>

      {/* Table */}
      <div style={{ flex:1, overflowY:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
          <thead>
            <tr style={{ background:'var(--s2)', position:'sticky', top:0, zIndex:10 }}>
              {COLS.map(c=>(
                <th key={c.key}
                  onClick={()=>toggleSort(c.key)}
                  style={{
                    padding:'7px 10px', textAlign:'left', cursor:'pointer',
                    color: sortBy===c.key ? 'var(--g)' : 'var(--t3)',
                    fontWeight:500, fontSize:10, letterSpacing:'.06em', textTransform:'uppercase',
                    borderBottom:'1px solid var(--b2)', whiteSpace:'nowrap',
                    transition:'color .15s',
                  }}
                >
                  {c.label} {sortBy===c.key ? (sortAsc?'↑':'↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.map((row,i)=>(
              <tr key={row.symbol}
                onClick={()=>selectSymbol(row.symbol)}
                style={{
                  background: i%2===0 ? 'transparent' : 'rgba(255,255,255,.012)',
                  cursor:'pointer', transition:'background .1s',
                }}
                onMouseEnter={e=>e.currentTarget.style.background='var(--s3)'}
                onMouseLeave={e=>e.currentTarget.style.background=i%2===0?'transparent':'rgba(255,255,255,.012)'}
              >
                {COLS.map(c=>(
                  <td key={c.key} style={{
                    padding:'7px 10px', borderBottom:'1px solid var(--b1)',
                    fontFamily: ['symbol','name','sector'].includes(c.key) ? 'var(--ui)' : 'var(--mono)',
                    color: c.key==='symbol' ? 'var(--g)' : 'var(--t1)',
                    fontWeight: c.key==='symbol' ? 600 : 400,
                    whiteSpace:'nowrap',
                  }}>
                    {c.fmt(row[c.key], row)}
                  </td>
                ))}
              </tr>
            ))}
            {results.length === 0 && !loading && (
              <tr>
                <td colSpan={COLS.length} style={{ padding:40, textAlign:'center', color:'var(--t3)', fontSize:12 }}>
                  No stocks match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
