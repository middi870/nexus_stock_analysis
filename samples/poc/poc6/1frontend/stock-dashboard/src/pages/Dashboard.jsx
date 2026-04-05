import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TrendingUp, TrendingDown, Activity, Clock } from 'lucide-react'
import { PriceChart, RSIChart, MACDChart, MetricCard } from '../components/StockChart'
import AIInsight from '../components/AIInsight'
import { ChartSkeleton, CardSkeleton } from '../components/Skeleton'
import ErrorState from '../components/ErrorState'
import { fetchStock } from '../api/api'

const DEFAULT_SYMBOL = 'TCS.NS'

// ── helpers ────────────────────────────────────────────────────────────────
function rsiColor(v) {
  if (v == null) return 'cyan'
  if (v > 70) return 'red'
  if (v < 30) return 'green'
  return 'cyan'
}

function fmt(v, prefix = '') {
  if (v == null) return '—'
  return `${prefix}${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

export default function Dashboard() {
  const [searchParams]          = useSearchParams()
  const [symbol, setSymbol]     = useState(searchParams.get('symbol') || DEFAULT_SYMBOL)
  const [data,   setData]       = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error,   setError]     = useState(null)

  // Sync symbol from URL
  useEffect(() => {
    const s = searchParams.get('symbol')
    if (s && s !== symbol) setSymbol(s)
  }, [searchParams])

  const load = async (sym = symbol) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchStock(sym)
      setData(res)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [symbol])

  // ── Derived ──────────────────────────────────────────────────────────────
  const latestBar  = data?.data?.at(-1) || {}
  const firstBar   = data?.data?.at(0)  || {}
  const priceChange = latestBar.close && firstBar.close
    ? ((latestBar.close - firstBar.close) / firstBar.close) * 100
    : null
  const isPositive  = priceChange >= 0

  return (
    <div className="page-enter space-y-5">
      {/* Stock header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display font-700 text-2xl text-text-primary tracking-tight">{symbol}</h1>
            {data && (
              <span className={`flex items-center gap-1 text-sm font-mono px-2.5 py-0.5 rounded-lg border ${
                isPositive
                  ? 'bg-accent-green/10 border-accent-green/20 text-accent-green'
                  : 'bg-accent-red/10 border-accent-red/20 text-accent-red'
              }`}>
                {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {priceChange != null ? `${isPositive ? '+' : ''}${priceChange.toFixed(2)}%` : '—'}
              </span>
            )}
          </div>
          <p className="text-sm text-text-muted font-body mt-0.5">
            {data?.name || 'NSE Listed Company'} · Last 90 days
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-text-muted font-mono">
          <Clock size={11} />
          {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </div>
      </div>

      {/* Error */}
      {error && <ErrorState message={error} onRetry={() => load()} />}

      {/* Metrics row */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard
            label="Price"
            value={fmt(latestBar.close, '₹')}
            sub={`Open ₹${fmt(latestBar.open)}`}
            color="cyan"
            delta={priceChange}
          />
          <MetricCard
            label="RSI (14)"
            value={fmt(latestBar.rsi)}
            sub={latestBar.rsi > 70 ? 'Overbought' : latestBar.rsi < 30 ? 'Oversold' : 'Neutral'}
            color={rsiColor(latestBar.rsi)}
          />
          <MetricCard
            label="MACD"
            value={fmt(latestBar.macd)}
            sub={`Signal: ${fmt(latestBar.macd_signal)}`}
            color={latestBar.macd > latestBar.macd_signal ? 'green' : 'red'}
          />
          <MetricCard
            label="MA20 / MA50"
            value={`₹${fmt(latestBar.ma20)}`}
            sub={`MA50: ₹${fmt(latestBar.ma50)}`}
            color="amber"
          />
        </div>
      )}

      {/* Charts + AI side by side */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Charts column */}
        <div className="xl:col-span-2 space-y-4">
          {loading ? (
            <>
              <ChartSkeleton />
              <ChartSkeleton />
              <ChartSkeleton />
            </>
          ) : data?.data ? (
            <>
              <PriceChart data={data.data} />
              <RSIChart   data={data.data} />
              <MACDChart  data={data.data} />
            </>
          ) : !error && (
            <div className="bg-bg-card border border-bg-border rounded-2xl p-16 flex flex-col items-center text-center">
              <Activity size={32} className="text-text-muted mb-3" />
              <p className="text-sm text-text-muted">Search for a stock symbol to load charts</p>
            </div>
          )}
        </div>

        {/* AI Panel */}
        <div className="xl:col-span-1">
          <AIInsight symbol={symbol} />
        </div>
      </div>

      {/* Volume bar footer */}
      {!loading && data?.data && (
        <div className="bg-bg-card border border-bg-border rounded-2xl p-5 animate-slide-up">
          <h3 className="font-display font-600 text-text-primary text-sm mb-4">Volume Profile</h3>
          <div className="space-y-1">
            {data.data.slice(-10).map((bar, i) => {
              const maxVol = Math.max(...data.data.slice(-10).map(b => b.volume || 0))
              const pct    = maxVol ? ((bar.volume || 0) / maxVol) * 100 : 0
              const isUp   = (bar.close || 0) >= (bar.open || 0)
              return (
                <div key={i} className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-text-muted w-16 flex-shrink-0">{bar.date}</span>
                  <div className="flex-1 bg-bg-base rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isUp ? 'bg-accent-green' : 'bg-accent-red'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-text-muted w-20 text-right">
                    {(bar.volume / 1e6)?.toFixed(2)}M
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
