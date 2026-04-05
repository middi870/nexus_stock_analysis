import { useState } from 'react'
import { AppProvider, useApp } from './context/AppContext.jsx'
import TopBar      from './components/TopBar.jsx'
import Watchlist   from './components/Watchlist.jsx'
import MainChart   from './components/MainChart.jsx'
import Screener    from './components/Screener.jsx'
import Heatmap     from './components/Heatmap.jsx'
import Compare     from './components/Compare.jsx'
import StockInfoBar from './components/StockInfoBar.jsx'
import AISidebar   from './components/AISidebar.jsx'

function Inner() {
  const { loading, error, tab } = useApp()
  const [query, setQuery] = useState('')

  if (loading) return (
    <div className="app">
      <div className="spin-center">
        <svg width="40" height="40" viewBox="0 0 32 32" style={{ marginBottom:8 }}>
          <rect width="32" height="32" rx="6" fill="#0C1120"/>
          <polyline points="4,22 10,14 16,18 22,8 28,12"
            stroke="#00E5A0" strokeWidth="2.5" fill="none"
            strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <div className="spinner"/>
        <div style={{ marginTop:8, fontFamily:'var(--display)', fontSize:13, color:'var(--t3)', letterSpacing:'.1em' }}>
          NEXUS
        </div>
        <div style={{ fontSize:11, color:'var(--t4)', letterSpacing:'.06em' }}>
          Loading market data…
        </div>
      </div>
    </div>
  )

  if (error) return (
    <div className="app" style={{ padding:32 }}>
      <div className="err-panel" style={{ maxWidth:520 }}>
        <div style={{ fontFamily:'var(--display)', fontSize:15, color:'var(--r)', marginBottom:12 }}>
          ⚠ Cannot connect to NEXUS backend
        </div>
        <div style={{ marginBottom:12, color:'var(--t2)' }}>{error}</div>
        <div style={{ fontSize:12, color:'var(--t3)' }}>
          Start the backend with:<br/><br/>
          <code>cd backend && uvicorn app.main:app --reload</code>
          <br/><br/>or via Docker:<br/><br/>
          <code>docker-compose up --build</code>
        </div>
      </div>
    </div>
  )

  return (
    <div className="app">
      <TopBar onSearch={setQuery}/>
      <div className="workspace">
        <Watchlist query={query}/>

        {/* Centre panel — all tabs rendered, visibility via CSS display */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
          <MainChart/>
          <Screener/>
          <Heatmap/>
          <Compare/>
        </div>

        {/* Right panels */}
        <StockInfoBar/>
        <AISidebar/>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Inner/>
    </AppProvider>
  )
}
