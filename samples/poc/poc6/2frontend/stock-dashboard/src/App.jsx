import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider, useApp } from './contexts/AppContext'
import Sidebar from './components/Sidebar'
import Navbar from './components/Navbar'
import AIPanel from './components/AIPanel'
import { ToastContainer } from './components/Toast'
import { useToast } from './hooks'
import Dashboard from './pages/Dashboard'
import Screener from './pages/Screener'
import Market from './pages/Market'
import AIPage from './pages/AIPage'

function Layout() {
  const { aiPanelOpen } = useApp()
  const { toasts, toast, removeToast } = useToast()

  return (
    <div className="min-h-screen bg-bg-base grid-bg">
      <Sidebar />
      <Navbar />

      {/* Main content — shifts right when AI panel opens on desktop */}
      <main className={`main-content${aiPanelOpen ? ' ai-open' : ''}`}>
        <div className="p-4 sm:p-6 max-w-[1600px]">
          <Routes>
            <Route path="/"         element={<Dashboard />} />
            <Route path="/screener" element={<Screener />} />
            <Route path="/market"   element={<Market />} />
            <Route path="/ai"       element={<AIPage />} />
            <Route path="*" element={
              <div className="flex flex-col items-center justify-center h-64 text-center page-enter">
                <div className="font-mono text-6xl text-text-muted/20 mb-4">404</div>
                <p className="text-text-muted text-sm">Page not found</p>
              </div>
            } />
          </Routes>
        </div>
      </main>

      {/* Collapsible right AI panel */}
      <AIPanel />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Layout />
      </AppProvider>
    </BrowserRouter>
  )
}
