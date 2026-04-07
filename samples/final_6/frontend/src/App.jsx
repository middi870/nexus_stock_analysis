import { AppProvider, useApp } from './context/AppContext.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import TopBar     from './components/TopBar.jsx'
import Sidebar    from './components/Sidebar.jsx'
import InfoBar    from './components/InfoBar.jsx'
import BottomNav  from './components/BottomNav.jsx'
import MainChart  from './components/MainChart.jsx'
import Analysis   from './components/Analysis.jsx'
import Screener   from './components/Screener.jsx'
import Heatmap    from './components/Heatmap.jsx'
import Compare    from './components/Compare.jsx'
import StockList  from './components/StockList.jsx'
import Portfolio  from './components/Portfolio.jsx'
import SectorChart from './components/SectorChart.jsx'

function Wrap({ name, children }) {
  return <ErrorBoundary name={name}>{children}</ErrorBoundary>
}

function ViewSwitch({ id }) {
  switch (id) {
    case 'stocks':    return <Wrap name="Stocks"><StockList/></Wrap>
    case 'chart':     return <Wrap name="Chart"><MainChart/></Wrap>
    case 'analysis':  return <Wrap name="Analysis"><Analysis/></Wrap>
    case 'screener':  return <Wrap name="Screener"><Screener/></Wrap>
    case 'heatmap':   return <Wrap name="Heatmap"><Heatmap/></Wrap>
    case 'sectors':   return <Wrap name="Sectors"><SectorChart/></Wrap>
    case 'compare':   return <Wrap name="Compare"><Compare/></Wrap>
    case 'portfolio': return <Wrap name="Portfolio"><Portfolio/></Wrap>
    default:          return <Wrap name="Chart"><MainChart/></Wrap>
  }
}

function Inner() {
  const { loading, error, tab, mobileTab } = useApp()

  if (loading) return (
    <div className="app">
      <div className="spin-center">
        <svg width="40" height="40" viewBox="0 0 40 40">
          <rect width="40" height="40" rx="8" fill="#14161F"/>
          <polyline points="5,28 13,17 20,22 28,10 35,15"
            stroke="#22C55E" strokeWidth="2.5" fill="none"
            strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="35" cy="15" r="3" fill="#22C55E"/>
        </svg>
        <div className="spinner"/>
        <div style={{ fontWeight:700, fontSize:14, color:'var(--t2)',
          letterSpacing:'.12em', marginTop:4 }}>NEXUS</div>
        <div style={{ fontSize:10, color:'var(--t4)' }}>
          Connecting to market feed…
        </div>
      </div>
    </div>
  )

  if (error) return (
    <div className="app" style={{ alignItems:'center',
      justifyContent:'center', padding:24 }}>
      <div className="err-panel" style={{ maxWidth:460 }}>
        <div style={{ color:'var(--red)', fontWeight:700,
          marginBottom:10, fontSize:14 }}>
          Cannot connect to backend
        </div>
        <div style={{ marginBottom:12 }}>{error}</div>
        <code>uvicorn app.main:app --reload --port 8000</code>
      </div>
    </div>
  )

  return (
    <div className="app">
      <ErrorBoundary name="TopBar"><TopBar/></ErrorBoundary>

      {/* Desktop layout (≥1024px) */}
      <div className="body">
        <Wrap name="Sidebar"><Sidebar/></Wrap>
        <div className="main-view">
          <ViewSwitch id={tab}/>
        </div>
        <Wrap name="InfoBar"><InfoBar/></Wrap>
      </div>

      {/* Mobile overlay */}
      <div className="mobile-screen">
        <ViewSwitch id={mobileTab}/>
      </div>

      <ErrorBoundary name="BottomNav"><BottomNav/></ErrorBoundary>
    </div>
  )
}

export default function App() {
  return <AppProvider><Inner/></AppProvider>
}
