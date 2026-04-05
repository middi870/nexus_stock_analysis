import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  TrendingUp, TrendingDown, Activity, Sparkles,
  RefreshCw, BarChart2, ArrowUpRight, WifiOff,
  AlertTriangle, ChevronRight
} from 'lucide-react'
import { PriceChart, RSIChart, MACDChart, MetricCard } from '../components/StockChart'
import { CardSkeleton, ChartSkeleton } from '../components/Skeleton'
import ErrorState from '../components/ErrorState'
import { fetchStock, fetchMarketMovers } from '../api/api'
import { useApp } from '../contexts/AppContext'

const WATCHLIST = ['TCS.NS','RELIANCE.NS','INFY.NS','HDFCBANK.NS','WIPRO.NS','TATAMOTORS.NS']

function OfflineBanner({ onRetry }) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-accent-red/8 border border-accent-red/20 rounded-2xl px-5 py-4 fade-in">
      <div className="w-9 h-9 rounded-xl bg-accent-red/10 border border-accent-red/20 flex items-center justify-center flex-shrink-0">
        <WifiOff size={16} className="text-accent-red" />
      </div>
      <div className="flex-1">
        <div className="text-sm font-body font-600 text-accent-red">Backend is not live</div>
        <div className="text-xs text-text-muted mt-0.5">
          Cannot reach <span className="font-mono">localhost:8000</span> — start your FastAPI server to load data
        </div>
      </div>
      <button onClick={onRetry}
        className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-xl bg-accent-red/10 border border-accent-red/20 text-accent-red hover:bg-accent-red/20 transition-colors flex-shrink-0 self-start sm:self-auto">
        <RefreshCw size={11} /> Retry
      </button>
    </div>
  )
}

function MoverRow({ stock, type, onClick }) {
  const pct = Number(stock.change_pct || stock.change || 0)
  const isUp = type === 'gainer'
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-hover transition-colors border-b border-bg-border last:border-0 text-left">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
        isUp ? 'bg-accent-green/10 border border-accent-green/20' : 'bg-accent-red/10 border border-accent-red/20'
      }`}>
        {isUp ? <TrendingUp size={12} className="text-accent-green" /> : <TrendingDown size={12} className="text-accent-red" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-mono text-text-primary font-600 truncate">{stock.symbol}</div>
        <div className="text-[10px] text-text-muted font-mono">
          ₹{Number(stock.price || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
        </div>
      </div>
      <span className={`text-xs font-mono font-600 flex-shrink-0 ${isUp ? 'text-accent-green' : 'text-accent-red'}`}>
        {isUp ? '+' : ''}{pct.toFixed(2)}%
      </span>
    </button>
  )
}

function WatchChip({ sym, active, onClick }) {
  return (
    <button onClick={onClick}
      className={`flex-shrink-0 text-xs font-mono px-3 py-1.5 rounded-xl border transition-all active:scale-95 ${
        active
          ? 'bg-accent-cyan/10 border-accent-cyan/30 text-accent-cyan'
          : 'bg-bg-card border-bg-border text-text-muted hover:text-text-secondary'
      }`}>
      {sym}
    </button>
  )
}

export default function Dashboard() {
  const [urlParams]                     = useSearchParams()
  const navigate                         = useNavigate()
  const { backendStatus, checkBackend, setActiveSymbol, openAIPanel } = useApp()

  const [symbol,        setSymbol]       = useState(urlParams.get('symbol') || 'TCS.NS')
  const [stockData,     setStockData]    = useState(null)
  const [moversData,    setMoversData]   = useState(null)
  const [loadingStock,  setLoadingStock] = useState(false)
  const [loadingMovers, setLoadingMovers]= useState(false)
  const [stockError,    setStockError]   = useState(null)

  useEffect(() => {
    const s = urlParams.get('symbol')
    if (s && s !== symbol) setSymbol(s)
  }, [urlParams])

  const loadStock = useCallback(async (sym) => {
    setLoadingStock(true); setStockError(null)
    try   { setStockData(await fetchStock(sym)) }
    catch (e) { setStockError(e.message) }
    finally   { setLoadingStock(false) }
  }, [])

  const loadMovers = useCallback(async () => {
    setLoadingMovers(true)
    try   { setMoversData(await fetchMarketMovers()) }
    catch {}
    finally { setLoadingMovers(false) }
  }, [])

  useEffect(() => { if (backendStatus === 'online') loadStock(symbol) }, [symbol, backendStatus])
  useEffect(() => { if (backendStatus === 'online') loadMovers() }, [backendStatus])

  const selectSymbol = (sym) => {
    setSymbol(sym); setActiveSymbol(sym)
    navigate(`/?symbol=${encodeURIComponent(sym)}`)
  }

  const latest      = stockData?.data?.at(-1) || {}
  const firstBar    = stockData?.data?.at(0)  || {}
  const priceChange = (latest.close && firstBar.close)
    ? ((latest.close - firstBar.close) / firstBar.close) * 100
    : null
  const isUp = (priceChange || 0) >= 0

  const gainers = moversData?.gainers || moversData?.top_gainers || []
  const losers  = moversData?.losers  || moversData?.top_losers  || []

  return (
    <div className="page-enter space-y-5">
      {/* Offline banner */}
      {backendStatus === 'offline' && <OfflineBanner onRetry={checkBackend} />}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display font-700 text-xl sm:text-2xl text-text-primary tracking-tight">Market Overview</h1>
          <p className="text-sm text-text-muted mt-0.5 font-mono">NSE · Real-time analytics</p>
        </div>
        <button onClick={() => openAIPanel('chat')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-purple/10 border border-accent-purple/25 text-accent-purple text-sm font-body hover:bg-accent-purple/20 transition-all flex-shrink-0 active:scale-95">
          <Sparkles size={14} />
          <span className="hidden xs:block">Ask AI</span>
        </button>
      </div>

      {/* Watchlist */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        <span className="text-[11px] font-mono text-text-muted self-center flex-shrink-0 pr-1">Quick:</span>
        {WATCHLIST.map(sym => (
          <WatchChip key={sym} sym={sym} active={symbol === sym} onClick={() => selectSymbol(sym)} />
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Charts column */}
        <div className="xl:col-span-2 space-y-4">
          {/* Stock header */}
          <div className="bg-bg-card border border-bg-border rounded-2xl p-5">
            <div className="flex items-start justify-between mb-4 gap-3">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="font-display font-700 text-xl text-text-primary">{symbol}</h2>
                  {priceChange != null && (
                    <span className={`flex items-center gap-1 text-xs font-mono px-2.5 py-1 rounded-lg border ${
                      isUp
                        ? 'bg-accent-green/10 border-accent-green/20 text-accent-green'
                        : 'bg-accent-red/10 border-accent-red/20 text-accent-red'
                    }`}>
                      {isUp ? <TrendingUp size={11}/> : <TrendingDown size={11}/>}
                      {isUp ? '+' : ''}{priceChange.toFixed(2)}%
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-muted font-mono mt-1">
                  {stockData?.name || 'NSE Listed'} · 90-day window
                </p>
              </div>
              {loadingStock && (
                <div className="w-5 h-5 border-2 border-accent-cyan/30 border-t-accent-cyan rounded-full animate-spin flex-shrink-0 mt-1" />
              )}
            </div>

            {loadingStock ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
              </div>
            ) : stockData ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MetricCard label="Price"
                  value={`₹${Number(latest.close||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`}
                  color="cyan" delta={priceChange} />
                <MetricCard label="RSI (14)"
                  value={latest.rsi?.toFixed(1) || '—'}
                  sub={latest.rsi > 70 ? 'Overbought' : latest.rsi < 30 ? 'Oversold' : 'Neutral'}
                  color={latest.rsi > 70 ? 'red' : latest.rsi < 30 ? 'green' : 'cyan'} />
                <MetricCard label="MACD"
                  value={latest.macd?.toFixed(2) || '—'}
                  sub={`Signal: ${latest.macd_signal?.toFixed(2) || '—'}`}
                  color={latest.macd > latest.macd_signal ? 'green' : 'red'} />
                <MetricCard label="MA20 / MA50"
                  value={`₹${Number(latest.ma20||0).toFixed(0)}`}
                  sub={`MA50: ₹${Number(latest.ma50||0).toFixed(0)}`}
                  color="amber" />
              </div>
            ) : stockError ? (
              <ErrorState message={stockError} onRetry={() => loadStock(symbol)} />
            ) : null}
          </div>

          {/* Charts */}
          {loadingStock ? (
            <>
              <ChartSkeleton />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ChartSkeleton /><ChartSkeleton />
              </div>
            </>
          ) : stockData?.data ? (
            <>
              <PriceChart data={stockData.data} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <RSIChart data={stockData.data} />
                <MACDChart data={stockData.data} />
              </div>
            </>
          ) : backendStatus !== 'online' ? (
            <div className="bg-bg-card border border-bg-border rounded-2xl p-14 flex flex-col items-center text-center">
              <AlertTriangle size={28} className="text-text-muted mb-3" />
              <p className="text-sm text-text-muted">Charts unavailable — backend is offline</p>
            </div>
          ) : !stockError ? (
            <div className="bg-bg-card border border-bg-border rounded-2xl p-14 flex flex-col items-center text-center">
              <Activity size={28} className="text-text-muted mb-3" />
              <p className="text-sm text-text-muted">Select a symbol to load charts</p>
            </div>
          ) : null}
        </div>

        {/* Right column — movers */}
        <div className="xl:col-span-1 space-y-4">
          {/* Gainers */}
          <div className="bg-bg-card border border-bg-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-bg-border">
              <div className="flex items-center gap-2">
                <TrendingUp size={13} className="text-accent-green" />
                <span className="text-sm font-display font-600 text-text-primary">Gainers</span>
              </div>
              <button onClick={() => navigate('/market')}
                className="text-[11px] font-mono text-text-muted hover:text-accent-cyan transition-colors flex items-center gap-1">
                All <ChevronRight size={10} />
              </button>
            </div>
            {loadingMovers
              ? <div className="p-4 space-y-2">{[...Array(3)].map((_,i)=><CardSkeleton key={i}/>)}</div>
              : gainers.length > 0
              ? gainers.slice(0, 5).map((s,i) => <MoverRow key={i} stock={s} type="gainer" onClick={() => selectSymbol(s.symbol)} />)
              : <div className="px-4 py-8 text-center text-xs text-text-muted">{backendStatus==='offline'?'Backend offline':'No data'}</div>
            }
          </div>

          {/* Losers */}
          <div className="bg-bg-card border border-bg-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-bg-border">
              <div className="flex items-center gap-2">
                <TrendingDown size={13} className="text-accent-red" />
                <span className="text-sm font-display font-600 text-text-primary">Losers</span>
              </div>
              <button onClick={() => navigate('/market')}
                className="text-[11px] font-mono text-text-muted hover:text-accent-cyan transition-colors flex items-center gap-1">
                All <ChevronRight size={10} />
              </button>
            </div>
            {loadingMovers
              ? <div className="p-4 space-y-2">{[...Array(3)].map((_,i)=><CardSkeleton key={i}/>)}</div>
              : losers.length > 0
              ? losers.slice(0, 5).map((s,i) => <MoverRow key={i} stock={s} type="loser" onClick={() => selectSymbol(s.symbol)} />)
              : <div className="px-4 py-8 text-center text-xs text-text-muted">{backendStatus==='offline'?'Backend offline':'No data'}</div>
            }
          </div>

          {/* Breadth */}
          {(gainers.length > 0 || losers.length > 0) && (
            <div className="bg-bg-card border border-bg-border rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart2 size={12} className="text-text-muted" />
                <span className="text-xs font-mono text-text-muted">Market Breadth</span>
              </div>
              <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden mb-2">
                <div className="bg-accent-green rounded-l-full transition-all"
                  style={{ width: `${Math.round(gainers.length/(gainers.length+losers.length)*100)}%` }} />
                <div className="bg-accent-red rounded-r-full flex-1" />
              </div>
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-accent-green">{gainers.length} advancing</span>
                <span className="text-accent-red">{losers.length} declining</span>
              </div>
            </div>
          )}

          {/* AI CTA */}
          <button onClick={() => openAIPanel('chat')}
            className="w-full flex items-center gap-3 bg-bg-card border border-accent-purple/20 rounded-2xl px-5 py-4 hover:bg-accent-purple/8 transition-all group">
            <div className="w-8 h-8 rounded-xl bg-accent-purple/15 border border-accent-purple/25 flex items-center justify-center flex-shrink-0">
              <Sparkles size={14} className="text-accent-purple" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-body font-500 text-text-primary">Ask AI Analyst</div>
              <div className="text-[11px] text-text-muted">Analyze {symbol} now</div>
            </div>
            <ArrowUpRight size={14} className="text-text-muted group-hover:text-accent-purple transition-colors" />
          </button>
        </div>
      </div>
    </div>
  )
}
