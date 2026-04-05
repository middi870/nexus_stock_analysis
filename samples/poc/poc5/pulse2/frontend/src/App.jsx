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
        <div className="spinner"/>
        <div className="spin-txt">Connecting to PULSE…</div>
      </div>
    </div>
  )

  if (error) return (
    <div className="app" style={{ padding:32 }}>
      <div className="err-panel" style={{ maxWidth:480 }}>
        <strong>Cannot connect to backend</strong><br/><br/>
        {error}<br/><br/>
        Start with: <code>docker-compose up --build</code><br/>
        or: <code>cd backend && uvicorn main:app --reload</code>
      </div>
    </div>
  )

  // Which panels are visible (StockInfoBar only for chart tab)
  const showInfoBar = tab === 'chart'

  return (
    <div className="app">
      <TopBar onSearch={setQuery}/>
      <div className="workspace">
        <Watchlist query={query}/>

        {/* Centre panel — switches by tab */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
          <MainChart/>
          <Screener/>
          <Heatmap/>
          <Compare/>
        </div>

        {showInfoBar && <StockInfoBar/>}
        <AISidebar/>
      </div>
    </div>
  )
}

export default function App() {
  return <AppProvider><Inner/></AppProvider>
}
