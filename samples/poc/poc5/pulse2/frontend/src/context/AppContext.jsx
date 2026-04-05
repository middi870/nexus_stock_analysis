import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { api, invalidate } from '../api.js'

const Ctx = createContext(null)

export function AppProvider({ children }) {
  const [companies,   setCompanies]   = useState([])
  const [activeSym,   setActiveSym_]  = useState('TCS')
  const [summary,     setSummary]     = useState(null)
  const [tab,         setTab]         = useState('chart')  // chart|screener|heatmap|compare
  const [period,      setPeriod]      = useState(90)
  const [watchlist,   setWatchlist]   = useState(['TCS','RELIANCE','INFY','HDFCBANK','SBIN','BAJFINANCE'])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [lastRefresh, setLastRefresh] = useState(Date.now())
  const refreshTimer  = useRef(null)

  // Load companies
  useEffect(() => {
    const ctrl = new AbortController()
    api.companies(ctrl.signal)
      .then(d => { setCompanies(d); setLoading(false) })
      .catch(e => { if (e.name!=='AbortError') { setError(e.message); setLoading(false) } })
    return () => ctrl.abort()
  }, [lastRefresh])

  // Load summary when active symbol changes
  useEffect(() => {
    if (!activeSym) return
    setSummary(null)
    const ctrl = new AbortController()
    api.summary(activeSym, ctrl.signal)
      .then(setSummary).catch(() => setSummary(null))
    return () => ctrl.abort()
  }, [activeSym])

  // Auto-refresh every 60s
  useEffect(() => {
    refreshTimer.current = setInterval(() => {
      invalidate('/companies'); invalidate('/movers')
      setLastRefresh(Date.now())
    }, 60000)
    return () => clearInterval(refreshTimer.current)
  }, [])

  const setActiveSym = useCallback((sym) => {
    setActiveSym_(sym); setSummary(null)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const syms = companies.map(c => c.symbol)
    const idx  = syms.indexOf(activeSym)
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return
      if (e.key === 'j' || e.key === 'ArrowDown') { if (idx < syms.length-1) setActiveSym(syms[idx+1]) }
      if (e.key === 'k' || e.key === 'ArrowUp')   { if (idx > 0) setActiveSym(syms[idx-1]) }
      if (e.key === '1') setPeriod(7)
      if (e.key === '2') setPeriod(30)
      if (e.key === '3') setPeriod(90)
      if (e.key === '4') setPeriod(180)
      if (e.key === '5') setPeriod(365)
      if (e.key === 'w') toggleWatch(activeSym)
      if (e.key === 'c') setTab('chart')
      if (e.key === 'f') setTab('screener')
      if (e.key === 'h') setTab('heatmap')
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [companies, activeSym])

  const toggleWatch  = useCallback((sym) => setWatchlist(p => p.includes(sym) ? p.filter(s=>s!==sym) : [...p,sym]), [])
  const isWatched    = useCallback((sym) => watchlist.includes(sym), [watchlist])

  return (
    <Ctx.Provider value={{
      companies, activeSym, setActiveSym,
      summary, tab, setTab,
      period, setPeriod,
      watchlist, toggleWatch, isWatched,
      loading, error, lastRefresh,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const useApp = () => useContext(Ctx)
