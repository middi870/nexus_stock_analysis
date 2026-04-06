import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { api } from '../api.js'

const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

export function AppProvider({ children }) {
  const [companies,  setCompanies ] = useState([])
  const [activeSym,  setActiveSym ] = useState('RELIANCE')
  const [summary,    setSummary   ] = useState(null)          // lazy, enriches after load
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [tab,        setTab       ] = useState('chart')
  const [loading,    setLoading   ] = useState(true)
  const [error,      setError     ] = useState(null)
  const [movers,     setMovers    ] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)         // mobile stock picker drawer

  // Boot: company list (has all price data we need for instant render)
  useEffect(() => {
    const ctrl = new AbortController()
    api.companies(ctrl.signal)
      .then(data => { setCompanies(data); setLoading(false) })
      .catch(e => {
        if (e.name !== 'AbortError') { setError(e.message || 'Cannot connect to backend'); setLoading(false) }
      })
    return () => ctrl.abort()
  }, [])

  // Movers (background, non-blocking)
  useEffect(() => {
    api.movers(7).then(setMovers).catch(() => {})
  }, [])

  // Summary: loaded lazily — does NOT block anything
  useEffect(() => {
    if (!activeSym) return
    setSummary(null)
    setSummaryLoading(true)
    const ctrl = new AbortController()
    api.summary(activeSym, ctrl.signal)
      .then(d => { setSummary(d); setSummaryLoading(false) })
      .catch(e => { if (e.name !== 'AbortError') setSummaryLoading(false) })
    return () => ctrl.abort()
  }, [activeSym])

  // Instant data: the company row from the list (available immediately after boot)
  const activeCompany = useMemo(
    () => companies.find(c => c.symbol === activeSym) || null,
    [companies, activeSym]
  )

  const selectSymbol = useCallback(sym => {
    setActiveSym(sym)
    setTab('chart')
    setDrawerOpen(false)
  }, [])

  return (
    <Ctx.Provider value={{
      companies, activeSym, selectSymbol,
      activeCompany,        // instant — from companies list
      summary,              // lazy — from /summary endpoint
      summaryLoading,
      tab, setTab,
      loading, error,
      movers,
      drawerOpen, setDrawerOpen,
    }}>
      {children}
    </Ctx.Provider>
  )
}
