import { NavLink } from 'react-router-dom'
import { LayoutDashboard, ScanSearch, TrendingUp, Sparkles, Activity, X, ChevronRight } from 'lucide-react'
import { useApp } from '../contexts/AppContext'

const NAV = [
  { to: '/',         icon: LayoutDashboard, label: 'Dashboard'     },
  { to: '/screener', icon: ScanSearch,      label: 'Screener'      },
  { to: '/market',   icon: TrendingUp,      label: 'Market Movers' },
  { to: '/ai',       icon: Sparkles,        label: 'AI Insights'   },
]

function StatusDot({ status }) {
  return (
    <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${
      status === 'online'   ? 'bg-accent-green status-online' :
      status === 'checking' ? 'bg-accent-amber animate-pulse'  :
                              'bg-accent-red'
    }`} />
  )
}

export default function Sidebar() {
  const { backendStatus, mobileSidebarOpen, setMobileSidebarOpen } = useApp()

  const content = (
    <aside className="flex flex-col h-full bg-bg-surface border-r border-bg-border w-56">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-bg-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-accent-cyan/10 border border-accent-cyan/25 flex items-center justify-center">
            <Activity size={13} className="text-accent-cyan" />
          </div>
          <div>
            <div className="font-display font-700 text-sm text-text-primary tracking-wide leading-none">PULSE</div>
            <div className="text-[10px] text-text-muted font-mono mt-0.5">Terminal v2</div>
          </div>
        </div>
        {/* Mobile close */}
        <button onClick={() => setMobileSidebarOpen(false)} className="lg:hidden p-1 text-text-muted hover:text-text-primary">
          <X size={16} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <div className="text-[9px] font-mono text-text-muted px-2 pb-2 uppercase tracking-widest">Main</div>
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to} to={to} end={to === '/'}
            onClick={() => setMobileSidebarOpen(false)}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-body font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover border border-transparent'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={15} className={isActive ? 'text-accent-cyan' : 'text-text-muted group-hover:text-text-secondary'} />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight size={11} className="text-accent-cyan/50" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer — backend status */}
      <div className="px-4 py-3 border-t border-bg-border space-y-1">
        <div className="flex items-center gap-2">
          <StatusDot status={backendStatus} />
          <span className="text-[11px] font-mono text-text-muted capitalize">
            {backendStatus === 'checking' ? 'Connecting…' :
             backendStatus === 'online'   ? 'Backend Live'  :
                                           'Backend Offline'}
          </span>
        </div>
        <div className="text-[10px] text-text-dim font-mono truncate">localhost:8000</div>
      </div>
    </aside>
  )

  return (
    <>
      {/* Desktop fixed sidebar */}
      <div className="hidden lg:block fixed left-0 top-0 h-full z-20">
        {content}
      </div>

      {/* Mobile drawer overlay */}
      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm fade-in"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full drawer slide-up">
            {content}
          </div>
        </div>
      )}
    </>
  )
}
