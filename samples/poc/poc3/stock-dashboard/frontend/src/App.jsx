import { useState } from 'react'
import { AppProvider, useApp } from './context/AppContext.jsx'
import TapeBar      from './components/TapeBar.jsx'
import Header       from './components/Header.jsx'
import LeftSidebar  from './components/LeftSidebar.jsx'
import StockHeader  from './components/StockHeader.jsx'
import AISidebar    from './components/AISidebar.jsx'
import Overview     from './panels/Overview.jsx'
import ChartPanel   from './panels/ChartPanel.jsx'
import Compare      from './panels/Compare.jsx'
import Movers       from './panels/Movers.jsx'
import Heatmap      from './panels/Heatmap.jsx'

function Dashboard() {
  const { activeTab, loading, error } = useApp()
  const [query, setQuery] = useState('')

  const Panel = {
    overview: Overview,
    chart:    ChartPanel,
    compare:  Compare,
    movers:   Movers,
    heatmap:  Heatmap,
  }[activeTab] || Overview

  if (loading) return (
    <div className="loading-wrap" style={{ height: '100%' }}>
      <div className="spinner" />
      <div className="spinner-txt">Connecting to market data…</div>
    </div>
  )

  if (error) return (
    <div style={{ padding: 32 }}>
      <div className="err-box">
        <strong>Cannot connect to backend API</strong><br /><br />
        {error}<br /><br />
        Make sure the backend is running:<br />
        <code style={{ opacity: .7 }}>cd backend && uvicorn main:app --reload</code>
      </div>
    </div>
  )

  return (
    <div className="app">
      <TapeBar />
      <Header onSearch={setQuery} />
      <div className="workspace">
        <LeftSidebar query={query} />
        <div className="main-panel">
          <StockHeader />
          <div className="panel-content">
            <Panel />
          </div>
        </div>
        <AISidebar />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Dashboard />
    </AppProvider>
  )
}
