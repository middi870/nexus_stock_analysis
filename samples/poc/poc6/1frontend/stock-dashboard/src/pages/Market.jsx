import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, RefreshCw, Zap, BarChart2 } from 'lucide-react'
import { fetchMarketMovers } from '../api/api'
import { CardSkeleton } from '../components/Skeleton'
import ErrorState from '../components/ErrorState'

function MoverCard({ stock, type, rank }) {
  const isGainer = type === 'gainer'
  const pct      = Number(stock.change_pct || stock.change || 0)

  return (
    <div
      className={`group relative bg-bg-card border rounded-2xl p-4 hover:bg-bg-hover transition-all duration-200 animate-slide-up overflow-hidden ${
        isGainer
          ? 'border-accent-green/20 hover:border-accent-green/40 hover:shadow-glow-green'
          : 'border-accent-red/20   hover:border-accent-red/40   hover:shadow-glow-red'
      }`}
    >
      {/* Rank watermark */}
      <span className="absolute top-3 right-3 font-mono text-4xl font-800 text-text-muted/5 select-none pointer-events-none leading-none">
        #{rank}
      </span>

      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="font-mono text-sm text-text-primary font-600 tracking-wide">
            {stock.symbol}
          </div>
          <div className="text-xs text-text-muted mt-0.5 truncate max-w-[140px]">
            {stock.name || stock.company || 'NSE Listed'}
          </div>
        </div>
        <div className={`text-right ${isGainer ? 'text-accent-green' : 'text-accent-red'}`}>
          <div className="text-base font-mono font-700">
            {isGainer ? '+' : ''}{pct.toFixed(2)}%
          </div>
          <div className="text-[10px] font-mono opacity-70">
            {isGainer ? '▲' : '▼'} today
          </div>
        </div>
      </div>

      {/* Price row */}
      <div className="flex items-center justify-between mb-3 text-xs font-mono">
        <span className="text-text-primary font-500">
          ₹{Number(stock.price || stock.ltp || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
        </span>
        {stock.volume && (
          <span className="text-text-muted">
            {(stock.volume / 1e6).toFixed(2)}M vol
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full bg-bg-base overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            isGainer ? 'bg-accent-green' : 'bg-accent-red'
          }`}
          style={{ width: `${Math.min(Math.abs(pct) * 8, 100)}%` }}
        />
      </div>

      {/* Extra stats */}
      {(stock.high || stock.low) && (
        <div className="flex justify-between mt-2.5 text-[10px] font-mono text-text-muted">
          {stock.high && <span>H ₹{Number(stock.high).toFixed(2)}</span>}
          {stock.low  && <span>L ₹{Number(stock.low).toFixed(2)}</span>}
        </div>
      )}
    </div>
  )
}

function SectionHeader({ icon: Icon, label, color, count }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
          color === 'green'
            ? 'bg-accent-green/10 border border-accent-green/20'
            : 'bg-accent-red/10 border border-accent-red/20'
        }`}>
          <Icon size={14} className={color === 'green' ? 'text-accent-green' : 'text-accent-red'} />
        </div>
        <h2 className="font-display font-700 text-text-primary">
          Top {label}
        </h2>
      </div>
      {count > 0 && (
        <span className="text-xs font-mono text-text-muted bg-bg-card border border-bg-border rounded-lg px-2 py-0.5">
          {count} stocks
        </span>
      )}
    </div>
  )
}

function MarketSummaryBar({ gainers, losers }) {
  const total   = gainers.length + losers.length
  const gainPct = total ? Math.round((gainers.length / total) * 100) : 50

  return (
    <div className="bg-bg-card border border-bg-border rounded-2xl p-5 animate-slide-up">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs font-mono text-text-muted">
          <BarChart2 size={12} />
          Market Breadth
        </div>
        <div className="flex gap-4 text-xs font-mono">
          <span className="text-accent-green">{gainers.length} Adv</span>
          <span className="text-text-muted">·</span>
          <span className="text-accent-red">{losers.length} Dec</span>
        </div>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
        <div
          className="bg-accent-green rounded-l-full transition-all duration-700"
          style={{ width: `${gainPct}%` }}
        />
        <div
          className="bg-accent-red rounded-r-full transition-all duration-700"
          style={{ width: `${100 - gainPct}%` }}
        />
      </div>
      <div className="flex justify-between mt-1.5 text-[10px] font-mono text-text-muted">
        <span>{gainPct}% advancing</span>
        <span>{100 - gainPct}% declining</span>
      </div>
    </div>
  )
}

export default function Market() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchMarketMovers()
      setData(res)
      setLastUpdated(new Date())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const gainers = data?.gainers || data?.top_gainers || []
  const losers  = data?.losers  || data?.top_losers  || []

  return (
    <div className="page-enter space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-accent-amber/10 border border-accent-amber/20 flex items-center justify-center">
              <Zap size={15} className="text-accent-amber" />
            </div>
            <h1 className="font-display font-700 text-2xl text-text-primary tracking-tight">
              Market Movers
            </h1>
          </div>
          <p className="text-sm text-text-muted font-body ml-0.5">
            NSE top gainers & losers{' '}
            {lastUpdated && (
              <span className="font-mono text-[11px]">
                · updated {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </p>
        </div>

        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-body border border-bg-border text-text-muted hover:text-text-primary hover:bg-bg-hover transition-all disabled:opacity-50 active:scale-95"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Market breadth bar */}
      {!loading && !error && (gainers.length > 0 || losers.length > 0) && (
        <MarketSummaryBar gainers={gainers} losers={losers} />
      )}

      {error && <ErrorState message={error} onRetry={load} />}

      {/* Gainers + Losers grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gainers */}
        <div>
          <SectionHeader icon={TrendingUp} label="Gainers" color="green" count={gainers.length} />
          <div className="space-y-3">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)
              : gainers.length > 0
              ? gainers.map((s, i) => (
                  <MoverCard key={s.symbol || i} stock={s} type="gainer" rank={i + 1} />
                ))
              : (
                <div className="bg-bg-card border border-bg-border rounded-2xl p-8 text-center text-sm text-text-muted">
                  No gainer data available
                </div>
              )
            }
          </div>
        </div>

        {/* Losers */}
        <div>
          <SectionHeader icon={TrendingDown} label="Losers" color="red" count={losers.length} />
          <div className="space-y-3">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)
              : losers.length > 0
              ? losers.map((s, i) => (
                  <MoverCard key={s.symbol || i} stock={s} type="loser" rank={i + 1} />
                ))
              : (
                <div className="bg-bg-card border border-bg-border rounded-2xl p-8 text-center text-sm text-text-muted">
                  No loser data available
                </div>
              )
            }
          </div>
        </div>
      </div>
    </div>
  )
}
