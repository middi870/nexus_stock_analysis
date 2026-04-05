import { useState, useEffect, useCallback } from 'react'
import { ScanSearch, ChevronUp, ChevronDown, Filter, RotateCcw } from 'lucide-react'
import { fetchScreener } from '../api/api'
import { TableRowSkeleton } from '../components/Skeleton'
import ErrorState from '../components/ErrorState'

const SECTORS = [
  'All', 'Technology', 'Finance', 'Healthcare', 'Energy',
  'Consumer', 'Industrials', 'Materials', 'Utilities',
]

const DEFAULT_FILTERS = {
  rsi_min: '', rsi_max: '',
  price_min: '', price_max: '',
  sector: 'All',
}

function RSIBadge({ v }) {
  if (v == null) return <span className="text-text-muted">—</span>
  const cls = v > 70
    ? 'bg-accent-red/10 text-accent-red border-accent-red/20'
    : v < 30
    ? 'bg-accent-green/10 text-accent-green border-accent-green/20'
    : 'bg-bg-hover text-text-secondary border-bg-border'
  return (
    <span className={`font-mono text-xs px-2 py-0.5 rounded-md border ${cls}`}>
      {Number(v).toFixed(1)}
    </span>
  )
}

function SortIcon({ col, sort }) {
  if (sort.col !== col) return <ChevronUp size={11} className="text-text-muted opacity-30" />
  return sort.dir === 'asc'
    ? <ChevronUp   size={11} className="text-accent-cyan" />
    : <ChevronDown size={11} className="text-accent-cyan" />
}

export default function Screener() {
  const [filters,   setFilters]   = useState(DEFAULT_FILTERS)
  const [data,      setData]      = useState([])
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)
  const [sort,      setSort]      = useState({ col: 'rsi', dir: 'asc' })
  const [page,      setPage]      = useState(1)
  const PER_PAGE = 15

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {}
      if (filters.rsi_min)   params.rsi_min   = filters.rsi_min
      if (filters.rsi_max)   params.rsi_max   = filters.rsi_max
      if (filters.price_min) params.price_min = filters.price_min
      if (filters.price_max) params.price_max = filters.price_max
      if (filters.sector !== 'All') params.sector = filters.sector
      const res = await fetchScreener(params)
      setData(res?.stocks || res || [])
      setPage(1)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { load() }, [])

  const reset = () => { setFilters(DEFAULT_FILTERS) }

  const handleSort = (col) => {
    setSort(s => s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' })
  }

  const sorted = [...data].sort((a, b) => {
    const av = a[sort.col] ?? 0
    const bv = b[sort.col] ?? 0
    const r  = typeof av === 'string' ? av.localeCompare(bv) : av - bv
    return sort.dir === 'asc' ? r : -r
  })

  const totalPages = Math.ceil(sorted.length / PER_PAGE)
  const paged      = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const cols = [
    { key: 'symbol',    label: 'Symbol'    },
    { key: 'name',      label: 'Company'   },
    { key: 'price',     label: 'Price'     },
    { key: 'change_pct',label: 'Change'    },
    { key: 'rsi',       label: 'RSI'       },
    { key: 'sector',    label: 'Sector'    },
    { key: 'volume',    label: 'Volume'    },
  ]

  return (
    <div className="page-enter space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <ScanSearch size={18} className="text-accent-cyan" />
          <h1 className="font-display font-700 text-2xl text-text-primary tracking-tight">Screener</h1>
        </div>
        <p className="text-sm text-text-muted">Filter NSE stocks by technical indicators</p>
      </div>

      {/* Filters */}
      <div className="bg-bg-card border border-bg-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-xs text-text-secondary font-mono">
            <Filter size={12} /> Filters
          </div>
          <button
            onClick={reset}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary font-mono transition-colors"
          >
            <RotateCcw size={11} /> Reset
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* RSI range */}
          <div>
            <label className="block text-[10px] text-text-muted font-mono uppercase tracking-widest mb-1.5">RSI Min</label>
            <input
              type="number" min={0} max={100}
              value={filters.rsi_min}
              onChange={e => setFilters(f => ({ ...f, rsi_min: e.target.value }))}
              placeholder="0"
              className="w-full bg-bg-base border border-bg-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:border-accent-cyan/50 focus:ring-1 focus:ring-accent-cyan/20 placeholder-text-muted transition-all"
            />
          </div>
          <div>
            <label className="block text-[10px] text-text-muted font-mono uppercase tracking-widest mb-1.5">RSI Max</label>
            <input
              type="number" min={0} max={100}
              value={filters.rsi_max}
              onChange={e => setFilters(f => ({ ...f, rsi_max: e.target.value }))}
              placeholder="100"
              className="w-full bg-bg-base border border-bg-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:border-accent-cyan/50 focus:ring-1 focus:ring-accent-cyan/20 placeholder-text-muted transition-all"
            />
          </div>
          <div>
            <label className="block text-[10px] text-text-muted font-mono uppercase tracking-widest mb-1.5">Price Min (₹)</label>
            <input
              type="number" min={0}
              value={filters.price_min}
              onChange={e => setFilters(f => ({ ...f, price_min: e.target.value }))}
              placeholder="0"
              className="w-full bg-bg-base border border-bg-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:border-accent-cyan/50 focus:ring-1 focus:ring-accent-cyan/20 placeholder-text-muted transition-all"
            />
          </div>
          <div>
            <label className="block text-[10px] text-text-muted font-mono uppercase tracking-widest mb-1.5">Price Max (₹)</label>
            <input
              type="number" min={0}
              value={filters.price_max}
              onChange={e => setFilters(f => ({ ...f, price_max: e.target.value }))}
              placeholder="∞"
              className="w-full bg-bg-base border border-bg-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:border-accent-cyan/50 focus:ring-1 focus:ring-accent-cyan/20 placeholder-text-muted transition-all"
            />
          </div>
          <div>
            <label className="block text-[10px] text-text-muted font-mono uppercase tracking-widest mb-1.5">Sector</label>
            <select
              value={filters.sector}
              onChange={e => setFilters(f => ({ ...f, sector: e.target.value }))}
              className="w-full bg-bg-base border border-bg-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:border-accent-cyan/50 focus:ring-1 focus:ring-accent-cyan/20 transition-all"
            >
              {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <button
          onClick={load}
          disabled={loading}
          className="mt-4 flex items-center gap-2 px-5 py-2 rounded-xl bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan text-sm font-body hover:bg-accent-cyan/20 transition-all disabled:opacity-50"
        >
          {loading ? 'Scanning…' : <><ScanSearch size={14} /> Run Screener</>}
        </button>
      </div>

      {/* Error */}
      {error && <ErrorState message={error} onRetry={load} />}

      {/* Results */}
      <div className="bg-bg-card border border-bg-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-bg-border">
          <span className="text-sm font-display font-600 text-text-primary">Results</span>
          <span className="text-xs font-mono text-text-muted">
            {loading ? 'Scanning…' : `${sorted.length} stocks`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-bg-border">
                {cols.map(c => (
                  <th
                    key={c.key}
                    onClick={() => handleSort(c.key)}
                    className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-widest text-text-muted cursor-pointer hover:text-text-secondary transition-colors select-none"
                  >
                    <div className="flex items-center gap-1">
                      {c.label}
                      <SortIcon col={c.key} sort={sort} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} cols={cols.length} />)
                : paged.map((row, i) => {
                  const chg = row.change_pct || row.change
                  return (
                    <tr
                      key={row.symbol || i}
                      className="border-b border-bg-border hover:bg-bg-hover transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-sm text-accent-cyan">{row.symbol}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{row.name || '—'}</td>
                      <td className="px-4 py-3 font-mono text-sm text-text-primary">
                        ₹{Number(row.price || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>
                      <td className={`px-4 py-3 font-mono text-sm ${(chg || 0) >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                        {chg != null ? `${chg >= 0 ? '+' : ''}${Number(chg).toFixed(2)}%` : '—'}
                      </td>
                      <td className="px-4 py-3"><RSIBadge v={row.rsi} /></td>
                      <td className="px-4 py-3 text-xs text-text-muted">{row.sector || '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-text-muted">
                        {row.volume ? `${(row.volume / 1e6).toFixed(2)}M` : '—'}
                      </td>
                    </tr>
                  )
                })
              }
              {!loading && paged.length === 0 && (
                <tr>
                  <td colSpan={cols.length} className="px-4 py-12 text-center text-sm text-text-muted">
                    No results. Try adjusting your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-bg-border">
            <span className="text-xs font-mono text-text-muted">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).slice(
                Math.max(0, page - 3), Math.min(totalPages, page + 2)
              ).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-7 h-7 rounded-lg text-xs font-mono transition-colors ${
                    p === page
                      ? 'bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/30'
                      : 'text-text-muted hover:text-text-primary hover:bg-bg-hover border border-transparent'
                  }`}
                >
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
