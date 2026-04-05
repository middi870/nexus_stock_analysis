import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ScanSearch,
  TrendingUp,
  Sparkles,
  Activity,
  ChevronRight,
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/',         icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/screener', icon: ScanSearch,      label: 'Screener'  },
  { to: '/market',   icon: TrendingUp,      label: 'Market Movers' },
  { to: '/ai',       icon: Sparkles,        label: 'AI Insights' },
]

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-full w-56 bg-bg-surface border-r border-bg-border flex flex-col z-20">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-bg-border">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-accent-cyan/10 border border-accent-cyan/30 flex items-center justify-center">
            <Activity size={14} className="text-accent-cyan" />
          </div>
          <div>
            <div className="font-display font-700 text-sm text-text-primary leading-none tracking-wide">
              PULSE
            </div>
            <div className="text-[10px] text-text-muted font-mono mt-0.5">Terminal v2</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <div className="text-[10px] font-mono text-text-muted px-2 pb-2 pt-1 uppercase tracking-widest">
          Navigation
        </div>
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body font-medium transition-all duration-200 ${
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
                {isActive && <ChevronRight size={12} className="text-accent-cyan/60" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-bg-border">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse-slow" />
          <span className="text-xs text-text-muted font-mono">NSE Live</span>
        </div>
        <div className="text-[10px] text-text-muted mt-1">
          Data via localhost:8000
        </div>
      </div>
    </aside>
  )
}
