import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, Command, Bell } from 'lucide-react'
import { useDebounce } from '../hooks'

const SUGGESTIONS = [
  'TCS.NS', 'RELIANCE.NS', 'INFY.NS', 'HDFCBANK.NS', 'WIPRO.NS',
  'TATAMOTORS.NS', 'BAJFINANCE.NS', 'ICICIBANK.NS', 'SBIN.NS', 'AXISBANK.NS',
]

export default function Navbar({ onSymbolSelect }) {
  const [query, setQuery]         = useState('')
  const [open, setOpen]           = useState(false)
  const [filtered, setFiltered]   = useState([])
  const debounced                  = useDebounce(query, 250)
  const navigate                   = useNavigate()
  const inputRef                   = useRef(null)

  useEffect(() => {
    if (!debounced.trim()) { setFiltered([]); return }
    setFiltered(
      SUGGESTIONS.filter(s => s.toLowerCase().includes(debounced.toLowerCase()))
    )
  }, [debounced])

  // Global ⌘K shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleSelect = (sym) => {
    setQuery(sym)
    setOpen(false)
    setFiltered([])
    onSymbolSelect?.(sym)
    navigate(`/?symbol=${encodeURIComponent(sym)}`)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (query.trim()) handleSelect(query.trim().toUpperCase())
  }

  return (
    <header className="fixed top-0 left-56 right-0 h-14 bg-bg-surface/80 backdrop-blur border-b border-bg-border flex items-center px-6 gap-4 z-10">
      {/* Search */}
      <form onSubmit={handleSubmit} className="relative flex-1 max-w-md">
        <div className="relative flex items-center">
          <Search size={14} className="absolute left-3 text-text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Search symbol…  e.g. TCS.NS"
            className="w-full bg-bg-card border border-bg-border rounded-lg pl-9 pr-20 py-2 text-sm font-mono text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-cyan/50 focus:ring-1 focus:ring-accent-cyan/20 transition-all"
          />
          {query ? (
            <button
              type="button"
              onClick={() => { setQuery(''); setFiltered([]) }}
              className="absolute right-8 text-text-muted hover:text-text-primary"
            >
              <X size={12} />
            </button>
          ) : null}
          <div className="absolute right-2 flex items-center gap-0.5 text-[10px] text-text-muted bg-bg-hover px-1.5 py-0.5 rounded border border-bg-border font-mono pointer-events-none">
            <Command size={9} />K
          </div>
        </div>

        {/* Dropdown suggestions */}
        {open && filtered.length > 0 && (
          <div className="absolute top-full mt-1 w-full bg-bg-card border border-bg-border rounded-lg shadow-xl z-50 overflow-hidden animate-fade-in">
            {filtered.map(sym => (
              <button
                key={sym}
                type="button"
                onMouseDown={() => handleSelect(sym)}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-mono hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors border-b border-bg-border last:border-0"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan/40 flex-shrink-0" />
                {sym}
              </button>
            ))}
          </div>
        )}
      </form>

      <div className="flex-1" />

      {/* Right controls */}
      <button className="relative p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors">
        <Bell size={16} />
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-accent-cyan rounded-full" />
      </button>

      <div className="flex items-center gap-2 pl-3 border-l border-bg-border">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-cyan/20 to-accent-purple/20 border border-bg-border flex items-center justify-center text-xs font-mono text-accent-cyan">
          M
        </div>
        <div className="text-xs text-text-secondary hidden sm:block">middi</div>
      </div>
    </header>
  )
}
