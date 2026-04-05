import { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../api.js'

const Ctx = createContext(null)

export function AppProvider({ children }) {
  const [companies,    setCompanies]    = useState([])
  const [activeSym,    setActiveSym]    = useState('TCS')
  const [activePeriod, setActivePeriod] = useState(30)
  const [activeTab,    setActiveTab]    = useState('overview')
  const [activeSummary,setActiveSummary] = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)

  useEffect(() => {
    api.companies()
      .then(d => { setCompanies(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  useEffect(() => {
    if (!activeSym) return
    api.summary(activeSym)
      .then(setActiveSummary)
      .catch(() => setActiveSummary(null))
  }, [activeSym])

  return (
    <Ctx.Provider value={{
      companies, activeSym, setActiveSym,
      activePeriod, setActivePeriod,
      activeTab, setActiveTab,
      activeSummary, loading, error,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const useApp = () => useContext(Ctx)
