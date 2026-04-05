import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, Command, Menu, Sparkles, Wifi, WifiOff, Loader } from 'lucide-react'
import { useDebounce } from '../hooks'
import { useApp } from '../contexts/AppContext'

const QUICK = [
  'TCS.NS','RELIANCE.NS','INFY.NS','HDFCBANK.NS','WIPRO.NS',
  'TATAMOTORS.NS','BAJFINANCE.NS','ICICIBANK.NS','SBIN.NS','AXISBANK.NS',
]

function BackendBadge({ status }) {
  if (status === 'checking') return (
    <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-accent-amber bg-accent-amber/10 border border-accent-amber/20 px-2.5 py-1 rounded-lg">
      <Loader size={10} className="animate-spin" /> Connecting
    </div>
  )
  if (status === 'offline') return (
    <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-accent-red bg-accent-red/10 border border-accent-red/20 px-2.5 py-1 rounded-lg animate-pulse">
      <WifiOff size={10} /> Backend Offline
    </div>
  )
  return (
    <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-accent-green bg-accent-green/10 border border-accent-green/20 px-2.5 py-1 rounded-lg">
      <Wifi size={10} /> Live
    </div>
  )
}

export default function Navbar() {
  const { backendStatus, setActiveSymbol, mobileSidebarOpen, setMobileSidebarOpen, toggleAIPanel, aiPanelOpen } = useApp()
  const [query,    setQuery]    = useState('')
  const [open,     setOpen]     = useState(false)
  const [filtered, setFiltered] = useState([])
  const debounced               = useDebounce(query, 200)
  const navigate                = useNavigate()
  const inputRef                = useRef(null)

  useEffect(() => {
    if (!debounced.trim()) { setFiltered([]); return }
    setFiltered(QUICK.filter(s => s.toLowerCase().includes(debounced.toLowerCase())))
  }, [debounced])

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault(); inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const select = (sym) => {
    setQuery(sym); setOpen(false); setFiltered([])
    setActiveSymbol(sym)
    navigate(`/?symbol=${encodeURIComponent(sym)}`)
  }

  return (
    <header className="fixed top-0 left-0 lg:left-56 right-0 h-14 bg-bg-surface/90 backdrop-blur-md border-b border-bg-border z-30 flex items-center px-4 gap-3">
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileSidebarOpen(true)}
        className="lg:hidden p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors flex-shrink-0"
      >
        <Menu size={18} />
      </button>

      {/* Search */}
      <div className="relative flex-1 max-w-sm">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={e => e.key === 'Enter' && query.trim() && select(query.trim().toUpperCase())}
          placeholder="Search symbol…"
          className="w-full bg-bg-card border border-bg-border rounded-xl pl-8 pr-16 py-2 text-sm font-mono text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-cyan/40 focus:ring-1 focus:ring-accent-cyan/15 transition-all"
        />
        {query ? (
          <button type="button" onClick={() => { setQuery(''); setFiltered([]) }}
            className="absolute right-8 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
            <X size={12} />
          </button>
        ) : null}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden xs:flex items-center gap-0.5 text-[10px] text-text-muted bg-bg-hover px-1.5 py-0.5 rounded-md border border-bg-border font-mono pointer-events-none">
          <Command size={8} />K
        </div>
        {open && filtered.length > 0 && (
          <div className="absolute top-full mt-1 w-full bg-bg-card border border-bg-border rounded-xl shadow-2xl z-50 overflow-hidden fade-in">
            {filtered.map(sym => (
              <button key={sym} type="button" onMouseDown={() => select(sym)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-mono hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors border-b border-bg-border last:border-0">
                <span className="w-1 h-1 rounded-full bg-accent-cyan/50 flex-shrink-0" />
                {sym}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1" />

      {/* Backend status badge */}
      <BackendBadge status={backendStatus} />

      {/* AI toggle */}
      <button
        onClick={() => toggleAIPanel('chat')}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-body transition-all ${
          aiPanelOpen
            ? 'bg-accent-purple/15 border border-accent-purple/30 text-accent-purple'
            : 'bg-bg-card border border-bg-border text-text-muted hover:text-text-primary hover:bg-bg-hover'
        }`}
      >
        <Sparkles size={14} />
        <span className="hidden sm:block">AI</span>
      </button>

      {/* Avatar */}
      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-cyan/20 to-accent-purple/20 border border-bg-border flex items-center justify-center text-xs font-mono text-accent-cyan flex-shrink-0">
        M
      </div>
    </header>
  )
}
