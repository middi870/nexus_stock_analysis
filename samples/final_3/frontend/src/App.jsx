import { useState, useEffect, useRef } from 'react'
import { AppProvider, useApp } from './context/AppContext.jsx'
import TopBar    from './components/TopBar.jsx'
import Sidebar   from './components/Sidebar.jsx'
import MainChart from './components/MainChart.jsx'
import Screener  from './components/Screener.jsx'
import Heatmap   from './components/Heatmap.jsx'
import Compare   from './components/Compare.jsx'
import InfoBar   from './components/InfoBar.jsx'
import StockDrawer from './components/StockDrawer.jsx'
import BottomNav from './components/BottomNav.jsx'

function Inner() {
  const { loading, error, tab } = useApp()

  if (loading) return (
    <div className="app">
      <div className="spin-center">
        <svg width="38" height="38" viewBox="0 0 40 40">
          <rect width="40" height="40" rx="8" fill="#11121C"/>
          <polyline points="5,28 13,17 20,22 28,10 35,15"
            stroke="#00C98A" strokeWidth="2.5" fill="none"
            strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <div className="spinner"/>
        <div style={{ fontFamily:'var(--ui)', fontWeight:700, fontSize:14,
          color:'var(--t2)', letterSpacing:'.15em', marginTop:4 }}>NEXUS</div>
        <div style={{ fontSize:10, color:'var(--t4)' }}>Connecting to market feed…</div>
      </div>
    </div>
  )

  if (error) return (
    <div className="app" style={{ alignItems:'center', justifyContent:'center', padding:24 }}>
      <div className="err-panel" style={{ maxWidth:460 }}>
        <div style={{ color:'var(--r)', fontWeight:700, marginBottom:10, fontSize:14 }}>
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
      <div className="body">
        {/* Left sidebar — desktop only */}
        <Sidebar/>

        {/* Main content area */}
        <div className="main-content" style={{
          flex:1, display:'flex', flexDirection:'column',
          overflow:'hidden', minWidth:0,
        }}>
          {tab==='chart'    && <MainChart/>}
          {tab==='screener' && <Screener/>}
          {tab==='heatmap'  && <Heatmap/>}
          {tab==='compare'  && <Compare/>}
        </div>

        {/* Right info bar — desktop only, loads instantly */}
        <InfoBar/>
      </div>

      {/* Mobile stock picker drawer */}
      <StockDrawer/>

      {/* Mobile bottom nav */}
      <BottomNav/>
    </div>
  )
}

export default function App() {
  return <AppProvider><Inner/></AppProvider>
}
