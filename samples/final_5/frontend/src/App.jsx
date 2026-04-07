/**
 * App.jsx — root shell.
 * Uses a single active-view render pattern (no duplicate mounting).
 * Desktop: tab state. Mobile: mobileTab state.
 * Components are rendered conditionally — never all at once.
 */
import { AppProvider, useApp } from './context/AppContext.jsx'
import TopBar    from './components/TopBar.jsx'
import Sidebar   from './components/Sidebar.jsx'
import InfoBar   from './components/InfoBar.jsx'
import BottomNav from './components/BottomNav.jsx'

// Lazy import — rendered only when active
import MainChart from './components/MainChart.jsx'
import Analysis  from './components/Analysis.jsx'
import Screener  from './components/Screener.jsx'
import Heatmap   from './components/Heatmap.jsx'
import Compare   from './components/Compare.jsx'
import StockList from './components/StockList.jsx'

function ViewSwitch({ activeId }) {
  // Only one branch renders at a time — no hidden/mounted duplicates
  switch (activeId) {
    case 'stocks':   return <StockList/>
    case 'chart':    return <MainChart/>
    case 'analysis': return <Analysis/>
    case 'screener': return <Screener/>
    case 'heatmap':  return <Heatmap/>
    case 'compare':  return <Compare/>
    default:         return <MainChart/>
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
        <div style={{ fontSize:10, color:'var(--t4)' }}>Connecting to market feed…</div>
      </div>
    </div>
  )

  if (error) return (
    <div className="app" style={{ alignItems:'center', justifyContent:'center', padding:24 }}>
      <div className="err-panel" style={{ maxWidth:460 }}>
        <div style={{ color:'var(--red)', fontWeight:700, marginBottom:10, fontSize:14 }}>
          Cannot connect to backend
        </div>
        <div style={{ marginBottom:12 }}>{error}</div>
        <code>uvicorn app.main:app --reload --port 8000</code>
      </div>
    </div>
  )

  return (
    <div className="app">
      <TopBar/>

      {/* ── Desktop layout (≥1024px) ─────────────────────────── */}
      <div className="body">
        <Sidebar/>
        <div className="main-view">
          <ViewSwitch activeId={tab}/>
        </div>
        <InfoBar/>
      </div>

      {/* ── Mobile overlay (shown via CSS, hidden on desktop) ─── */}
      <div className="mobile-screen">
        <ViewSwitch activeId={mobileTab}/>
      </div>

      <BottomNav/>
    </div>
  )
}

export default function App() {
  return <AppProvider><Inner/></AppProvider>
}
