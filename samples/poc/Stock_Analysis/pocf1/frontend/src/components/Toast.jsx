import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

const ICONS = {
  success: <CheckCircle  size={14} className="text-accent-green" />,
  error:   <AlertCircle  size={14} className="text-accent-red"   />,
  warning: <AlertTriangle size={14} className="text-accent-amber"  />,
  info:    <Info          size={14} className="text-accent-cyan"  />,
}

export function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="fixed bottom-5 right-5 z-50 space-y-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-center gap-3 bg-bg-card border border-bg-border rounded-xl px-4 py-3 shadow-xl min-w-56 max-w-xs animate-slide-up"
        >
          {ICONS[t.type] || ICONS.info}
          <span className="text-sm text-text-primary flex-1">{t.msg}</span>
          <button
            onClick={() => onRemove(t.id)}
            className="text-text-muted hover:text-text-primary ml-1"
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  )
}
