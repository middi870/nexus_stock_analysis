import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { api } from '../api.js'

const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

// Metric options for the stock list toggle
export const STOCK_METRICS = [
  { id:'change_pct',  label:'Day %',   fmt:(v)=>v==null?'—':`${v>=0?'+':''}${v.toFixed(2)}%` },
  { id:'close',       label:'Price',   fmt:(v)=>v==null?'—':`₹${Number(v).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}` },
  { id:'volume',      label:'Volume',  fmt:(v)=>v==null?'—':v>=1e7?(v/1e7).toFixed(2)+'Cr':v>=1e5?(v/1e5).toFixed(1)+'L':v.toLocaleString('en-IN') },
  { id:'pe',          label:'P/E',     fmt:(v)=>v==null?'—':v+'×' },
  { id:'mktcap',      label:'Mkt Cap', fmt:(v)=>v==null?'—':`₹${v}L Cr` },
]

export function AppProvider({ children }) {
  const [companies,      setCompanies      ] = useState([])
  const [activeSym,      setActiveSym      ] = useState('RELIANCE')
  const [summary,        setSummary        ] = useState(null)
  const [summaryLoading, setSummaryLoading ] = useState(false)
  const [tab,            setTab            ] = useState('stocks') // starts on stock list
  const [loading,        setLoading        ] = useState(true)
  const [error,          setError          ] = useState(null)
  const [movers,         setMovers         ] = useState(null)
  const [stockMetric,    setStockMetric    ] = useState('change_pct')  // active metric in stock list
  const [mobileTab,      setMobileTab      ] = useState('stocks')      // mobile nav state

  useEffect(() => {
    const ctrl = new AbortController()
    api.companies(ctrl.signal)
      .then(data => { setCompanies(data); setLoading(false) })
      .catch(e => {
        if (e.name !== 'AbortError') { setError(e.message || 'Cannot connect to backend'); setLoading(false) }
      })
    return () => ctrl.abort()
  }, [])

  useEffect(() => { api.movers(7).then(setMovers).catch(()=>{}) }, [])

  useEffect(() => {
    if (!activeSym) return
    setSummary(null); setSummaryLoading(true)
    const ctrl = new AbortController()
    api.summary(activeSym, ctrl.signal)
      .then(d => { setSummary(d); setSummaryLoading(false) })
      .catch(e => { if (e.name !== 'AbortError') setSummaryLoading(false) })
    return () => ctrl.abort()
  }, [activeSym])

  const activeCompany = useMemo(
    () => companies.find(c => c.symbol === activeSym) || null,
    [companies, activeSym]
  )

  const selectSymbol = useCallback(sym => {
    setActiveSym(sym)
    setMobileTab('chart') // after picking a stock, go to chart
  }, [])

  return (
    <Ctx.Provider value={{
      companies, activeSym, selectSymbol,
      activeCompany, summary, summaryLoading,
      tab, setTab,
      loading, error, movers,
      stockMetric, setStockMetric,
      mobileTab, setMobileTab,
    }}>
      {children}
    </Ctx.Provider>
  )
}
