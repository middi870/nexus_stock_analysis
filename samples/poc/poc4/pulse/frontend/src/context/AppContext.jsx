import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from '../api.js'

const Ctx = createContext(null)

export function AppProvider({ children }) {
  const [companies,   setCompanies]   = useState([])
  const [activeSym,   setActiveSym]   = useState('TCS')
  const [summary,     setSummary]     = useState(null)
  const [period,      setPeriod]      = useState(30)
  const [tab,         setTab]         = useState('chart')
  const [watchlist,   setWatchlist]   = useState(['TCS','RELIANCE','INFY','HDFCBANK','SBIN'])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)

  useEffect(() => {
    api.companies()
      .then(d => { setCompanies(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  useEffect(() => {
    if (!activeSym) return
    setSummary(null)
    api.summary(activeSym).then(setSummary).catch(() => setSummary(null))
  }, [activeSym])

  const toggleWatch = useCallback((sym) => {
    setWatchlist(prev => prev.includes(sym) ? prev.filter(s => s !== sym) : [...prev, sym])
  }, [])

  const isWatched = useCallback((sym) => watchlist.includes(sym), [watchlist])

  return (
    <Ctx.Provider value={{
      companies, activeSym, setActiveSym,
      summary, period, setPeriod,
      tab, setTab,
      watchlist, toggleWatch, isWatched,
      loading, error,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const useApp = () => useContext(Ctx)
