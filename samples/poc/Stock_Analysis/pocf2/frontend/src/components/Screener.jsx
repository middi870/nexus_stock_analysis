import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { api, fmt, sign, cls, fmtCr } from '../api.js'
import s from './Screener.module.css'

const SECTORS = ['Banking','IT','FMCG','Auto','Finance','Pharma','Energy','Infra','Materials','Utilities','Conglomerate']

const COLS = [
  { key:'symbol',      label:'Symbol',     mono:true, w:90  },
  { key:'close',       label:'Price',      mono:true, w:80, prefix:'₹' },
  { key:'change_pct',  label:'Change',     mono:true, w:76, signed:true },
  { key:'pe',          label:'P/E',        mono:true, w:60 },
  { key:'pb',          label:'P/B',        mono:true, w:56 },
  { key:'div_yield',   label:'Div%',       mono:true, w:60 },
  { key:'mktcap',      label:'Mkt Cap',    mono:true, w:80 },
  { key:'rsi',         label:'RSI',        mono:true, w:60 },
  { key:'volatility',  label:'Volatility', mono:true, w:80 },
  { key:'sector',      label:'Sector',     mono:false,w:110 },
]

function RsiGauge({ v }) {
  if (!v) return <span>—</span>
  const color = v > 70 ? 'var(--r)' : v < 30 ? 'var(--g)' : 'var(--t2)'
  return <span style={{ color, fontFamily:'var(--mono)' }}>{v}</span>
}

export default function Screener() {
  const { setActiveSym, setTab } = useApp()
  const [filters, setFilters] = useState({
    sector:'', min_pe:'', max_pe:'', min_pb:'', max_pb:'',
    min_div:'', min_chg:'', max_chg:'', min_vol:'', max_vol:'',
    min_rsi:'', max_rsi:'', sort_by:'change_pct', sort_asc:false,
  })
  const [results,  setResults]  = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  function set(key, val) { setFilters(f => ({ ...f, [key]:val })) }

  async function run() {
    setLoading(true); setError(null)
    try {
      const data = await api.screener(filters)
      setResults(data)
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }

  function reset() { setFilters(f => ({ ...f, sector:'', min_pe:'', max_pe:'', min_pb:'', max_pb:'', min_div:'', min_chg:'', max_chg:'', min_vol:'', max_vol:'', min_rsi:'', max_rsi:'' })); setResults(null) }

  function toggleSort(key) {
    if (filters.sort_by === key) set('sort_asc', !filters.sort_asc)
    else { set('sort_by', key); set('sort_asc', false) }
  }

  function goTo(sym) { setActiveSym(sym); setTab('chart') }

  return (
    <div className={s.panel}>
      {/* Filter bar */}
      <div className={s.filters}>
        <div className={s.filterSection}>
          <div className={s.filterLabel}>Sector</div>
          <select className={s.sel} value={filters.sector} onChange={e=>set('sector',e.target.value)}>
            <option value="">All</option>
            {SECTORS.map(sec=><option key={sec} value={sec}>{sec}</option>)}
          </select>
        </div>

        {[
          {label:'P/E Range',   minK:'min_pe',  maxK:'max_pe',  ph:'0 – 100'},
          {label:'P/B Range',   minK:'min_pb',  maxK:'max_pb',  ph:'0 – 20'},
          {label:'Div Yield %', minK:'min_div', maxK:null,       ph:'Min %'},
          {label:'Change %',    minK:'min_chg', maxK:'max_chg', ph:'-10 – 10'},
          {label:'Volatility %',minK:'min_vol', maxK:'max_vol', ph:'10 – 60'},
          {label:'RSI',         minK:'min_rsi', maxK:'max_rsi', ph:'0 – 100'},
        ].map(({label,minK,maxK,ph})=>(
          <div key={label} className={s.filterSection}>
            <div className={s.filterLabel}>{label}</div>
            <div className={s.rangeInputs}>
              <input className={s.inp} type="number" placeholder="Min"
                value={filters[minK]} onChange={e=>set(minK,e.target.value)}/>
              {maxK && <input className={s.inp} type="number" placeholder="Max"
                value={filters[maxK]} onChange={e=>set(maxK,e.target.value)}/>}
            </div>
          </div>
        ))}

        <div className={s.filterActions}>
          <button className={s.runBtn} onClick={run} disabled={loading}>
            {loading ? 'Scanning…' : '▶ Scan'}
          </button>
          <button className={s.resetBtn} onClick={reset}>Reset</button>
        </div>
      </div>

      {/* Results */}
      <div className={s.results}>
        {error   && <div className="err-panel" style={{margin:12}}>{error}</div>}
        {!results && !loading && (
          <div className={s.empty}>
            <div className={s.emptyIcon}>⊙</div>
            <div className={s.emptyText}>Set filters and click Scan to screen stocks</div>
            <div className={s.emptyHint}>Scans all {20} NSE blue-chips with live metrics</div>
          </div>
        )}
        {results && (
          <div className={s.tableWrap}>
            <div className={s.tableHdr}>
              <span className={s.resultCount}>{results.length} result{results.length!==1?'s':''}</span>
            </div>
            <table className={s.table}>
              <thead>
                <tr>
                  {COLS.map(c=>(
                    <th key={c.key} style={{width:c.w,minWidth:c.w}}
                      className={`${s.th} ${filters.sort_by===c.key?s.sortedTh:''}`}
                      onClick={()=>toggleSort(c.key)}>
                      {c.label}
                      {filters.sort_by===c.key && <span>{filters.sort_asc?'↑':'↓'}</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map(r=>(
                  <tr key={r.symbol} className={s.tr} onClick={()=>goTo(r.symbol)}>
                    <td className={s.tdSym}>{r.symbol}</td>
                    <td className={s.tdMono}>₹{fmt(r.close)}</td>
                    <td className={`${s.tdMono} ${cls(r.change_pct)}`}>{sign(r.change_pct)}</td>
                    <td className={s.tdMono}>{r.pe ? `${r.pe}×` : '—'}</td>
                    <td className={s.tdMono}>{r.pb ? `${r.pb}×` : '—'}</td>
                    <td className={`${s.tdMono} ${r.div_yield>3?'up':''}`}>{r.div_yield ? `${r.div_yield}%` : '—'}</td>
                    <td className={s.tdMono}>{fmtCr(r.mktcap)}</td>
                    <td><RsiGauge v={r.rsi}/></td>
                    <td className={s.tdMono}>{r.volatility ? `${r.volatility}%` : '—'}</td>
                    <td className={s.tdSector}>{r.sector}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
