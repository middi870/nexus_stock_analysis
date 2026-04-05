import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Navbar from './components/Navbar'
import { ToastContainer } from './components/Toast'
import Dashboard from './pages/Dashboard'
import Screener from './pages/Screener'
import Market from './pages/Market'
import AIPage from './pages/AIPage'
import { useToast } from './hooks'

export default function App() {
  const { toasts, toast, removeToast } = useToast()
  const [activeSymbol, setActiveSymbol] = useState('TCS.NS')

  const handleSymbolSelect = (sym) => {
    setActiveSymbol(sym)
    toast(`Loaded ${sym}`, 'success')
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-bg-base grid-bg">
        {/* Fixed Sidebar */}
        <Sidebar />

        {/* Fixed Top Navbar */}
        <Navbar onSymbolSelect={handleSymbolSelect} />

        {/* Main content area — offset for sidebar + navbar */}
        <main className="ml-56 pt-14 min-h-screen">
          <div className="p-6 max-w-[1600px]">
            <Routes>
              <Route path="/"         element={<Dashboard />} />
              <Route path="/screener" element={<Screener />} />
              <Route path="/market"   element={<Market />} />
              <Route path="/ai"       element={<AIPage />} />
              {/* Catch-all */}
              <Route path="*" element={
                <div className="flex flex-col items-center justify-center h-64 text-center animate-fade-in">
                  <div className="font-mono text-6xl text-text-muted mb-4">404</div>
                  <p className="text-text-muted text-sm">Page not found</p>
                </div>
              } />
            </Routes>
          </div>
        </main>

        {/* Toast notifications */}
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    </BrowserRouter>
  )
}
