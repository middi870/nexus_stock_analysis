import { useState } from 'react'
import { AppProvider, useApp } from './context/AppContext.jsx'
import TopBar       from './components/TopBar.jsx'
import Watchlist    from './components/Watchlist.jsx'
import MainChart    from './components/MainChart.jsx'
import Screener     from './components/Screener.jsx'
import Heatmap      from './components/Heatmap.jsx'
import Compare      from './components/Compare.jsx'
import StockInfoBar from './components/StockInfoBar.jsx'

function Inner() {
  const { loading, error, tab } = useApp()
  const [query, setQuery] = useState('')

  if (loading) return (
    <div className="app">
      <div className="spin-center">
        <svg width="36" height="36" viewBox="0 0 32 32">
          <rect width="32" height="32" rx="6" fill="#0F1220"/>
          <polyline points="4,22 10,14 16,18 22,8 28,12"
            stroke="#10B981" strokeWidth="2.5" fill="none"
            strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <div className="spinner"/>
        <div style={{ fontFamily:'var(--display)', fontSize:14, color:'var(--t2)', letterSpacing:'.12em' }}>
          NEXUS
        </div>
        <div style={{ fontSize:10, color:'var(--t4)', letterSpacing:'.05em' }}>
          Loading market data…
        </div>
      </div>
    </div>
  )

  if (error) return (
    <div className="app" style={{ alignItems:'center', justifyContent:'center' }}>
      <div className="err-panel" style={{ maxWidth:480, margin:'0 auto' }}>
        <div style={{ fontFamily:'var(--display)', fontSize:15, color:'var(--r)', marginBottom:12 }}>
          ⚠ Cannot connect to backend
        </div>
        <div style={{ marginBottom:10, color:'var(--t2)', lineHeight:1.7 }}>{error}</div>
        <div style={{ fontSize:11, color:'var(--t3)' }}>
          Run: <code>uvicorn app.main:app --reload</code>
        </div>
      </div>
    </div>
  )

  return (
    <div className="app">
      <TopBar onSearch={setQuery}/>
      <div className="workspace">
        <Watchlist query={query}/>
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
          <MainChart/>
          <Screener/>
          <Heatmap/>
          <Compare/>
        </div>
        <StockInfoBar/>
      </div>
    </div>
  )
}

export default function App() {
  return <AppProvider><Inner/></AppProvider>
}
