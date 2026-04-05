import { useState } from 'react'
import { AppProvider, useApp } from './context/AppContext.jsx'
import TapeBar   from './components/TapeBar.jsx'
import TopBar    from './components/TopBar.jsx'
import Watchlist from './components/Watchlist.jsx'
import ChartArea from './components/ChartArea.jsx'
import AISidebar from './components/AISidebar.jsx'

function ErrorScreen({ msg }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', flexDirection:'column', gap:16 }}>
      <div style={{ color:'var(--red)', fontFamily:'var(--mono)', fontSize:13 }}>Cannot connect to backend</div>
      <div className="err" style={{ maxWidth:440 }}>
        <strong>API Error:</strong> {msg}<br/><br/>
        Make sure the backend is running:<br/>
        <code style={{opacity:.7}}>docker-compose up  — or —  uvicorn main:app --reload</code>
      </div>
    </div>
  )
}

function Dashboard() {
  const { loading, error } = useApp()
  const [query, setQuery] = useState('')

  if (loading) return (
    <div className="app">
      <div className="spin-wrap" style={{height:'100%'}}>
        <div className="spinner"/>
        <div className="spin-label">Connecting to market data…</div>
      </div>
    </div>
  )

  if (error) return <div className="app"><ErrorScreen msg={error}/></div>

  return (
    <div className="app">
      <TapeBar/>
      <TopBar onSearch={setQuery}/>
      <div className="body">
        <Watchlist query={query}/>
        <ChartArea/>
        <AISidebar/>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Dashboard/>
    </AppProvider>
  )
}
