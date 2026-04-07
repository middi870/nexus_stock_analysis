import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { api, invalidate } from '../api.js'
import { useUrlSync } from '../hooks/useUrlSync.js'
import { useQuotePoller } from '../hooks/useQuotePoller.js'

const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

export const STOCK_METRICS = [
  { id:'change_pct', label:'Day %',   fmt: v => v==null?'—':`${v>=0?'+':''}${v.toFixed(2)}%` },
  { id:'close',      label:'Price',   fmt: v => v==null?'—':`₹${Number(v).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}` },
  { id:'volume',     label:'Volume',  fmt: v => v==null?'—':v>=1e7?(v/1e7).toFixed(2)+'Cr':v>=1e5?(v/1e5).toFixed(1)+'L':v.toLocaleString('en-IN') },
  { id:'pe',         label:'P/E',     fmt: v => v==null?'—':v+'×' },
  { id:'mktcap',     label:'Mkt Cap', fmt: v => v==null?'—':`₹${v}L Cr` },
]

// ── Watchlist (localStorage) ────────────────────────────────────────────────
const WL_KEY = 'nexus_watchlist_v1'
function loadWL()  { try { return new Set(JSON.parse(localStorage.getItem(WL_KEY))||[]) } catch { return new Set() } }
function saveWL(s) { try { localStorage.setItem(WL_KEY, JSON.stringify([...s])) } catch {} }

const VALID_TABS = ['stocks','chart','analysis','screener','heatmap','compare']

export function AppProvider({ children }) {
  const [companies,      setCompanies      ] = useState([])
  const [activeSym,      setActiveSym      ] = useState('RELIANCE')
  const [summary,        setSummary        ] = useState(null)
  const [summaryLoading, setSummaryLoading ] = useState(false)
  const [tab,            setTab_           ] = useState('stocks')
  const [loading,        setLoading        ] = useState(true)
  const [error,          setError          ] = useState(null)
  const [movers,         setMovers         ] = useState(null)
  const [stockMetric,    setStockMetric    ] = useState('change_pct')
  const [mobileTab,      setMobileTab      ] = useState('stocks')
  const [chartLoading,   setChartLoading   ] = useState(false)
  const [watchlist,      setWLState        ] = useState(loadWL)

  // Real-time polling
  const { ageLabel, refreshNow } = useQuotePoller(setCompanies)

  const setTab = useCallback(t => { setTab_(t); setMobileTab(t) }, [])

  const toggleWatchlist = useCallback(sym => {
    setWLState(prev => {
      const next = new Set(prev)
      next.has(sym) ? next.delete(sym) : next.add(sym)
      saveWL(next)
      return next
    })
  }, [])

  // Boot
  useEffect(() => {
    const ctrl = new AbortController()
    api.companies(ctrl.signal)
      .then(data => { setCompanies(data); setLoading(false) })
      .catch(e => { if (e.name !== 'AbortError') { setError(e.message||'Cannot connect'); setLoading(false) } })
    return () => ctrl.abort()
  }, [])

  useEffect(() => { api.movers(7).then(setMovers).catch(()=>{}) }, [])

  // Lazy summary
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
    setMobileTab('chart')
    setChartLoading(true)
  }, [])

  const onChartReady = useCallback(() => setChartLoading(false), [])

  // URL sync
  useUrlSync({ tab, activeSym, setTab, selectSymbol, companies })

  return (
    <Ctx.Provider value={{
      companies, activeSym, selectSymbol,
      activeCompany, summary, summaryLoading,
      tab, setTab,
      loading, error, movers,
      stockMetric, setStockMetric,
      mobileTab, setMobileTab,
      chartLoading, onChartReady,
      watchlist, toggleWatchlist,
      ageLabel, refreshNow,        // real-time
    }}>
      {children}
    </Ctx.Provider>
  )
}
