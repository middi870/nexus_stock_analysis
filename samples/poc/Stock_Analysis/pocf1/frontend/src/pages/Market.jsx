import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, RefreshCw, Zap, BarChart2 } from 'lucide-react'
import { fetchMarketMovers } from '../api/api'
import { CardSkeleton } from '../components/Skeleton'
import ErrorState from '../components/ErrorState'
import { useApp } from '../contexts/AppContext'
import { useNavigate } from 'react-router-dom'

function MoverCard({ stock, type, rank }) {
  const navigate = useNavigate()
  const { setActiveSymbol } = useApp()
  const isGainer = type === 'gainer'
  const pct = Number(stock.change_pct || stock.change || 0)

  return (
    <button
      onClick={() => { setActiveSymbol(stock.symbol); navigate(`/?symbol=${encodeURIComponent(stock.symbol)}`) }}
      className={`w-full text-left group relative bg-bg-card border rounded-2xl p-4 hover:bg-bg-hover transition-all overflow-hidden active:scale-[0.99] ${
        isGainer ? 'border-accent-green/20 hover:border-accent-green/35' : 'border-accent-red/20 hover:border-accent-red/35'
      }`}>
      <span className="absolute top-3 right-4 font-mono text-5xl font-800 text-bg-hover select-none pointer-events-none leading-none">
        #{rank}
      </span>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="font-mono text-sm text-text-primary font-600">{stock.symbol}</div>
          <div className="text-[11px] text-text-muted mt-0.5 truncate max-w-[140px]">{stock.name || 'NSE Listed'}</div>
        </div>
        <div className={`text-right ${isGainer ? 'text-accent-green' : 'text-accent-red'}`}>
          <div className="text-base font-mono font-700">{isGainer?'+':''}{pct.toFixed(2)}%</div>
          <div className="text-[10px] opacity-70">{isGainer?'▲':'▼'} today</div>
        </div>
      </div>
      <div className="flex justify-between text-xs font-mono mb-3">
        <span className="text-text-primary">₹{Number(stock.price||0).toLocaleString('en-IN',{maximumFractionDigits:2})}</span>
        {stock.volume && <span className="text-text-muted">{(stock.volume/1e6).toFixed(2)}M</span>}
      </div>
      <div className="h-1 rounded-full bg-bg-base overflow-hidden">
        <div className={`h-full rounded-full ${isGainer?'bg-accent-green':'bg-accent-red'} transition-all duration-700`}
          style={{ width:`${Math.min(Math.abs(pct)*8,100)}%` }} />
      </div>
    </button>
  )
}

export default function Market() {
  const { backendStatus } = useApp()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [updated, setUpdated] = useState(null)

  const load = async () => {
    setLoading(true); setError(null)
    try { setData(await fetchMarketMovers()); setUpdated(new Date()) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { if (backendStatus === 'online') load() }, [backendStatus])

  const gainers = data?.gainers || data?.top_gainers || []
  const losers  = data?.losers  || data?.top_losers  || []
  const total   = gainers.length + losers.length
  const gainPct = total ? Math.round(gainers.length / total * 100) : 50

  return (
    <div className="page-enter space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-accent-amber/10 border border-accent-amber/20 flex items-center justify-center">
              <Zap size={15} className="text-accent-amber" />
            </div>
            <h1 className="font-display font-700 text-xl sm:text-2xl text-text-primary">Market Movers</h1>
          </div>
          <p className="text-sm text-text-muted">
            NSE top gainers &amp; losers
            {updated && <span className="font-mono text-[11px]"> · {updated.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</span>}
          </p>
        </div>
        <button onClick={load} disabled={loading || backendStatus==='offline'}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-body border border-bg-border text-text-muted hover:text-text-primary hover:bg-bg-hover transition-all disabled:opacity-50 active:scale-95">
          <RefreshCw size={12} className={loading?'animate-spin':''} /> Refresh
        </button>
      </div>

      {/* Breadth bar */}
      {!loading && !error && total > 0 && (
        <div className="bg-bg-card border border-bg-border rounded-2xl p-5 slide-up">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-mono text-text-muted">
              <BarChart2 size={12} /> Market Breadth
            </div>
            <div className="flex gap-3 text-xs font-mono">
              <span className="text-accent-green">{gainers.length} Adv</span>
              <span className="text-text-muted">·</span>
              <span className="text-accent-red">{losers.length} Dec</span>
            </div>
          </div>
          <div className="flex h-2 rounded-full overflow-hidden gap-px">
            <div className="bg-accent-green rounded-l-full transition-all duration-700" style={{ width:`${gainPct}%` }} />
            <div className="bg-accent-red rounded-r-full transition-all duration-700" style={{ width:`${100-gainPct}%` }} />
          </div>
          <div className="flex justify-between mt-1.5 text-[10px] font-mono text-text-muted">
            <span>{gainPct}% advancing</span>
            <span>{100-gainPct}% declining</span>
          </div>
        </div>
      )}

      {error && <ErrorState message={error} onRetry={load} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={15} className="text-accent-green" />
            <h2 className="font-display font-700 text-text-primary">Top Gainers</h2>
            {gainers.length > 0 && <span className="text-xs font-mono text-text-muted">({gainers.length})</span>}
          </div>
          <div className="space-y-3">
            {loading
              ? Array.from({length:5}).map((_,i)=><CardSkeleton key={i}/>)
              : gainers.length > 0
              ? gainers.map((s,i)=><MoverCard key={s.symbol||i} stock={s} type="gainer" rank={i+1}/>)
              : <div className="bg-bg-card border border-bg-border rounded-2xl p-8 text-center text-sm text-text-muted">
                  {backendStatus==='offline'?'Backend offline':'No data available'}
                </div>
            }
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown size={15} className="text-accent-red" />
            <h2 className="font-display font-700 text-text-primary">Top Losers</h2>
            {losers.length > 0 && <span className="text-xs font-mono text-text-muted">({losers.length})</span>}
          </div>
          <div className="space-y-3">
            {loading
              ? Array.from({length:5}).map((_,i)=><CardSkeleton key={i}/>)
              : losers.length > 0
              ? losers.map((s,i)=><MoverCard key={s.symbol||i} stock={s} type="loser" rank={i+1}/>)
              : <div className="bg-bg-card border border-bg-border rounded-2xl p-8 text-center text-sm text-text-muted">
                  {backendStatus==='offline'?'Backend offline':'No data available'}
                </div>
            }
          </div>
        </div>
      </div>
    </div>
  )
}
