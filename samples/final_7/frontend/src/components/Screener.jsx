/**
 * Screener v0.2.0
 * Fixed: auto-runs on mount, persists results when navigating away and back.
 * Added: CSV export button.
 * CSS vars updated.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { api, fmt, sign, cls } from '../api.js'
import { IcoFilter, IcoRefresh, IcoBarChart } from '../icons.jsx'

const SECTORS = ['IT','Banking','Finance','Energy','FMCG','Auto','Pharma','Infra','Materials','Utilities','Conglomerate']

const COLS = [
  { key:'symbol',    label:'Symbol',  mono:true,  w:75,  render: v => <span style={{ color:'var(--green)', fontWeight:700 }}>{v}</span> },
  { key:'name',      label:'Company', mono:false, w:170, render: v => v?.length > 24 ? v.slice(0,23)+'…' : v },
  { key:'sector',    label:'Sector',  mono:false, w:110 },
  { key:'close',     label:'Price ₹', mono:true,  w:85,  render: v => fmt(v) },
  { key:'change_pct',label:'Change',  mono:true,  w:72,  render: v => <span className={cls(v)}>{sign(v)}</span> },
  { key:'rsi',       label:'RSI',     mono:true,  w:55,  render: v => v?.toFixed(1) ?? '—' },
  { key:'volatility',label:'Vol%',    mono:true,  w:60,  render: v => v ? v+'%' : '—' },
  { key:'pe',        label:'P/E',     mono:true,  w:55,  render: v => v ?? '—' },
  { key:'pb',        label:'P/B',     mono:true,  w:50,  render: v => v ?? '—' },
  { key:'div_yield', label:'Div%',    mono:true,  w:55,  render: v => v ? v+'%' : '—' },
  { key:'mktcap',    label:'MCap',    mono:true,  w:90,  render: v => v ? '₹'+v+'L Cr' : '—' },
]

function exportCSV(rows) {
  const headers = COLS.map(c => c.label).join(',')
  const lines   = rows.map(row =>
    COLS.map(c => {
      const v = row[c.key]
      if (v == null) return ''
      const s = String(v)
      return s.includes(',') ? `"${s}"` : s
    }).join(',')
  )
  const blob = new Blob([[headers, ...lines].join('\n')], { type:'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = `nexus-screener-${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function Screener() {
  const { selectSymbol } = useApp()
  const [params,  setP      ] = useState({})
  const [results, setRes    ] = useState(null)   // null = never run; [] = run with 0 results
  const [loading, setLoad   ] = useState(false)
  const [sortBy,  setSort   ] = useState('change_pct')
  const [sortAsc, setSortAsc] = useState(false)
  const hasAutoRun = useRef(false)
  const ctrl = useRef(null)

  const set = useCallback((k, v) => setP(p => ({ ...p, [k]: v || null })), [])

  const run = useCallback((overrideParams) => {
    ctrl.current?.abort()
    ctrl.current = new AbortController()
    const p = overrideParams ?? params
    setLoad(true)
    api.screener({ ...p, sort_by:sortBy, sort_asc:sortAsc })
      .then(d  => { setRes(d); setLoad(false) })
      .catch(e => { if (e.name !== 'AbortError') setLoad(false) })
  }, [params, sortBy, sortAsc])

  // Auto-run on first mount with defaults
  useEffect(() => {
    if (!hasAutoRun.current) { hasAutoRun.current = true; run({}) }
  }, [])

  // Re-run when sort changes if already run
  useEffect(() => {
    if (hasAutoRun.current && results !== null) run()
  }, [sortBy, sortAsc])

  const reset = () => { setP({}); run({}) }

  const toggleSort = col => {
    if (sortBy === col) setSortAsc(p => !p)
    else { setSort(col); setSortAsc(false) }
  }

  const displayedResults = results || []

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--bg)' }}>

      {/* Filter bar */}
      <div style={{
        padding:'10px 14px', borderBottom:'1px solid var(--b1)',
        background:'var(--s1)', flexShrink:0,
      }}>
        <div style={{ display:'flex', flexWrap:'wrap', gap:7, alignItems:'center' }}>

          <select className="input" style={{ width:130 }} value={params.sector || ''}
            onChange={e => set('sector', e.target.value)}>
            <option value="">All Sectors</option>
            {SECTORS.map(s => <option key={s}>{s}</option>)}
          </select>

          {[
            { k:'min_rsi', p:'RSI min' }, { k:'max_rsi', p:'RSI max' },
            { k:'max_pe',  p:'P/E max' }, { k:'min_div', p:'Div% min' },
            { k:'min_chg', p:'Chg% min'}, { k:'max_chg', p:'Chg% max' },
          ].map(({ k, p }) => (
            <input key={k} className="input" type="number" style={{ width:82 }}
              placeholder={p} value={params[k] || ''}
              onChange={e => set(k, e.target.value)}/>
          ))}

          <button className="btn btn-primary" onClick={() => run()} style={{ gap:5 }}>
            <IcoFilter size={12}/>
            {loading ? '…' : 'Screen'}
          </button>
          <button className="btn btn-ghost" style={{ gap:5 }} onClick={reset}>
            <IcoRefresh size={12}/>
            Reset
          </button>

          {/* CSV export */}
          {displayedResults.length > 0 && (
            <button className="btn btn-ghost" style={{ gap:5, marginLeft:'auto' }}
              onClick={() => exportCSV(displayedResults)}
              title="Export results to CSV">
              <IcoBarChart size={12}/>
              Export CSV
            </button>
          )}

          {results !== null && !displayedResults.length && !loading && (
            <span style={{ marginLeft:'auto', fontSize:10, color:'var(--t3)',
              fontFamily:'var(--mono)' }}>
              0 results
            </span>
          )}

          {displayedResults.length > 0 && (
            <span style={{ fontSize:10, color:'var(--t3)', fontFamily:'var(--mono)',
              marginLeft: results?.length ? 0 : 'auto' }}>
              {displayedResults.length} result{displayedResults.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{ flex:1, overflowY:'auto', overflowX:'auto', position:'relative' }}>

        {/* Initial loading overlay */}
        {loading && results === null && (
          <div style={{ position:'absolute', inset:0, display:'flex',
            alignItems:'center', justifyContent:'center', background:'var(--bg)' }}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
              <div className="spinner" style={{ width:28, height:28 }}/>
              <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--t3)' }}>
                Running screen…
              </div>
            </div>
          </div>
        )}

        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, minWidth:800 }}>
          <thead>
            <tr style={{ background:'var(--s2)', position:'sticky', top:0, zIndex:10 }}>
              {COLS.map(c => (
                <th key={c.key} onClick={() => toggleSort(c.key)}
                  style={{
                    padding:'7px 10px', textAlign:'left', cursor:'pointer',
                    whiteSpace:'nowrap', userSelect:'none',
                    fontSize:9, fontWeight:700, letterSpacing:'.07em', textTransform:'uppercase',
                    color: sortBy===c.key ? 'var(--green)' : 'var(--t3)',
                    borderBottom:'1px solid var(--b2)',
                    width:c.w, minWidth:c.w, transition:'color .15s',
                  }}>
                  {c.label}{sortBy===c.key ? (sortAsc?' ↑':' ↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayedResults.map((row, i) => (
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
                    whiteSpace:'nowrap', fontSize: c.mono ? 11 : 12, color:'var(--t1)',
                  }}>
                    {c.render ? c.render(row[c.key], row) : (row[c.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}

            {results !== null && displayedResults.length === 0 && !loading && (
              <tr>
                <td colSpan={COLS.length} style={{ padding:48, textAlign:'center',
                  color:'var(--t4)', fontSize:12, fontFamily:'var(--mono)' }}>
                  No stocks match — try relaxing filters or click Reset
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
