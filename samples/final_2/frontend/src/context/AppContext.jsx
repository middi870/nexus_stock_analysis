import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from '../api.js'

const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

export function AppProvider({ children }) {
  const [companies,  setCompanies ] = useState([])
  const [activeSym,  setActiveSym ] = useState('RELIANCE')
  const [summary,    setSummary   ] = useState(null)
  const [tab,        setTab       ] = useState('chart')   // 'chart' | 'screener' | 'heatmap' | 'compare'
  const [loading,    setLoading   ] = useState(true)
  const [error,      setError     ] = useState(null)
  const [movers,     setMovers    ] = useState(null)

  // Boot: load company list
  useEffect(() => {
    const ctrl = new AbortController()
    api.companies(ctrl.signal)
      .then(data => {
        setCompanies(data)
        setLoading(false)
      })
      .catch(e => {
        if (e.name !== 'AbortError') {
          setError(e.message || 'Cannot connect to backend')
          setLoading(false)
        }
      })
    return () => ctrl.abort()
  }, [])

  // Load summary when active symbol changes
  useEffect(() => {
    if (!activeSym) return
    setSummary(null)
    const ctrl = new AbortController()
    api.summary(activeSym, ctrl.signal)
      .then(setSummary)
      .catch(e => { if (e.name !== 'AbortError') console.warn('summary:', e) })
    return () => ctrl.abort()
  }, [activeSym])

  // Load movers once on boot
  useEffect(() => {
    api.movers(7)
      .then(setMovers)
      .catch(() => {})
  }, [])

  const selectSymbol = useCallback(sym => {
    setActiveSym(sym)
    setTab('chart')
  }, [])

  return (
    <Ctx.Provider value={{
      companies, activeSym, selectSymbol,
      summary, tab, setTab,
      loading, error,
      movers,
    }}>
      {children}
    </Ctx.Provider>
  )
}
