import { useState, useCallback } from 'react'
import { ScanSearch, ChevronUp, ChevronDown, Filter, RotateCcw } from 'lucide-react'
import { fetchScreener } from '../api/api'
import { TableRowSkeleton } from '../components/Skeleton'
import ErrorState from '../components/ErrorState'
import { useApp } from '../contexts/AppContext'

const SECTORS = ['All','Technology','Finance','Healthcare','Energy','Consumer','Industrials','Materials','Utilities']
const DEFAULT  = { rsi_min:'', rsi_max:'', price_min:'', price_max:'', sector:'All' }

function RSIBadge({ v }) {
  if (v == null) return <span className="text-text-muted font-mono text-xs">—</span>
  const cls = v > 70
    ? 'bg-accent-red/10 text-accent-red border-accent-red/20'
    : v < 30
    ? 'bg-accent-green/10 text-accent-green border-accent-green/20'
    : 'bg-bg-hover text-text-secondary border-bg-border'
  return <span className={`font-mono text-xs px-2 py-0.5 rounded-md border ${cls}`}>{Number(v).toFixed(1)}</span>
}

function SortBtn({ col, sort }) {
  const active = sort.col === col
  return active
    ? sort.dir === 'asc' ? <ChevronUp size={10} className="text-accent-cyan" /> : <ChevronDown size={10} className="text-accent-cyan" />
    : <ChevronUp size={10} className="text-text-muted opacity-30" />
}

export default function Screener() {
  const { backendStatus } = useApp()
  const [filters,  setFilters]  = useState(DEFAULT)
  const [data,     setData]     = useState([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [sort,     setSort]     = useState({ col: 'rsi', dir: 'asc' })
  const [page,     setPage]     = useState(1)
  const PER = 15

  const run = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const p = {}
      if (filters.rsi_min)   p.min_rsi     = filters.rsi_min
      if (filters.rsi_max)   p.max_rsi     = filters.rsi_max
      if (filters.price_min) p.min_price   = filters.price_min
      if (filters.price_max) p.max_price   = filters.price_max
      if (filters.sector !== 'All') p.sector = filters.sector
      const res = await fetchScreener(p)
      setData(res?.stocks || res || [])
      setPage(1)
    } catch (e) { setError(e.message) }
    finally     { setLoading(false) }
  }, [filters])

  const sorted = [...data].sort((a, b) => {
    const av = a[sort.col] ?? 0, bv = b[sort.col] ?? 0
    const r  = typeof av === 'string' ? av.localeCompare(bv) : av - bv
    return sort.dir === 'asc' ? r : -r
  })
  const totalPages = Math.ceil(sorted.length / PER)
  const paged      = sorted.slice((page - 1) * PER, page * PER)

  const cols = [
    { key:'symbol',     label:'Symbol'  },
    { key:'name',       label:'Company' },
    { key:'price',      label:'Price'   },
    { key:'change_pct', label:'Change'  },
    { key:'rsi',        label:'RSI'     },
    { key:'sector',     label:'Sector'  },
  ]

  return (
    <div className="page-enter space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <ScanSearch size={18} className="text-accent-cyan" />
          <h1 className="font-display font-700 text-xl sm:text-2xl text-text-primary">Screener</h1>
        </div>
        <p className="text-sm text-text-muted">Filter NSE stocks by technical indicators</p>
      </div>

      {/* Filters */}
      <div className="bg-bg-card border border-bg-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-xs text-text-secondary font-mono">
            <Filter size={12} /> Filters
          </div>
          <button onClick={() => setFilters(DEFAULT)}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary font-mono transition-colors">
            <RotateCcw size={11} /> Reset
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { key:'rsi_min',   label:'RSI Min',    placeholder:'0',   type:'number', min:0, max:100 },
            { key:'rsi_max',   label:'RSI Max',    placeholder:'100', type:'number', min:0, max:100 },
            { key:'price_min', label:'Price Min ₹',placeholder:'0',   type:'number', min:0 },
            { key:'price_max', label:'Price Max ₹',placeholder:'∞',   type:'number', min:0 },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-[10px] text-text-muted font-mono uppercase tracking-widest mb-1.5">{f.label}</label>
              <input type={f.type} min={f.min} max={f.max}
                value={filters[f.key]}
                onChange={e => setFilters(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full bg-bg-base border border-bg-border rounded-xl px-3 py-2.5 text-sm font-mono text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-cyan/40 focus:ring-1 focus:ring-accent-cyan/15 transition-all" />
            </div>
          ))}
          <div>
            <label className="block text-[10px] text-text-muted font-mono uppercase tracking-widest mb-1.5">Sector</label>
            <select value={filters.sector} onChange={e => setFilters(p => ({ ...p, sector: e.target.value }))}
              className="w-full bg-bg-base border border-bg-border rounded-xl px-3 py-2.5 text-sm font-mono text-text-primary focus:outline-none focus:border-accent-cyan/40 transition-all">
              {SECTORS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <button onClick={run} disabled={loading || backendStatus==='offline'}
          className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-cyan/10 border border-accent-cyan/25 text-accent-cyan text-sm font-body hover:bg-accent-cyan/18 transition-all disabled:opacity-50 active:scale-95">
          <ScanSearch size={14} />
          {loading ? 'Scanning…' : 'Run Screener'}
        </button>
        {backendStatus === 'offline' && (
          <p className="mt-2 text-xs text-accent-red font-mono">Backend offline — cannot run screener</p>
        )}
      </div>

      {error && <ErrorState message={error} onRetry={run} />}

      {/* Table */}
      <div className="bg-bg-card border border-bg-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-bg-border">
          <span className="text-sm font-display font-600 text-text-primary">Results</span>
          <span className="text-xs font-mono text-text-muted">
            {loading ? 'Scanning…' : `${sorted.length} stocks`}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-bg-border">
                {cols.map(c => (
                  <th key={c.key} onClick={() => setSort(s => s.col===c.key ? {...s, dir:s.dir==='asc'?'desc':'asc'} : {col:c.key,dir:'asc'})}
                    className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-widest text-text-muted cursor-pointer hover:text-text-secondary select-none">
                    <div className="flex items-center gap-1">
                      {c.label} <SortBtn col={c.key} sort={sort} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({length:6}).map((_,i) => <TableRowSkeleton key={i} cols={cols.length} />)
                : paged.map((row, i) => {
                  const chg = row.change_pct || row.change
                  return (
                    <tr key={i} className="border-b border-bg-border hover:bg-bg-hover transition-colors">
                      <td className="px-4 py-3 font-mono text-sm text-accent-cyan">{row.symbol}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary truncate max-w-[120px]">{row.name || '—'}</td>
                      <td className="px-4 py-3 font-mono text-sm text-text-primary">
                        ₹{Number(row.price||0).toLocaleString('en-IN',{maximumFractionDigits:2})}
                      </td>
                      <td className={`px-4 py-3 font-mono text-sm ${(chg||0)>=0?'text-accent-green':'text-accent-red'}`}>
                        {chg!=null ? `${chg>=0?'+':''}${Number(chg).toFixed(2)}%` : '—'}
                      </td>
                      <td className="px-4 py-3"><RSIBadge v={row.rsi} /></td>
                      <td className="px-4 py-3 text-xs text-text-muted">{row.sector||'—'}</td>
                    </tr>
                  )
                })
              }
              {!loading && paged.length === 0 && (
                <tr>
                  <td colSpan={cols.length} className="px-4 py-12 text-center text-sm text-text-muted">
                    {backendStatus==='offline' ? 'Backend offline' : 'No results — try adjusting filters'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-bg-border">
            <span className="text-xs font-mono text-text-muted">Page {page} of {totalPages}</span>
            <div className="flex gap-1">
              {Array.from({length:totalPages},(_,i)=>i+1)
                .slice(Math.max(0,page-3), Math.min(totalPages,page+2))
                .map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-7 h-7 rounded-lg text-xs font-mono transition-colors ${
                      p===page
                        ? 'bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/30'
                        : 'text-text-muted hover:bg-bg-hover border border-transparent'
                    }`}>
                    {p}
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
