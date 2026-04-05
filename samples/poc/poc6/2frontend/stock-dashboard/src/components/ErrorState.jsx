import { AlertCircle, RefreshCw } from 'lucide-react'

export default function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
      <div className="w-12 h-12 rounded-2xl bg-accent-red/10 border border-accent-red/20 flex items-center justify-center mb-4">
        <AlertCircle size={20} className="text-accent-red" />
      </div>
      <p className="text-sm text-text-secondary font-body mb-1">Something went wrong</p>
      <p className="text-xs text-text-muted font-mono max-w-64 mb-5">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 text-xs font-body px-4 py-2 rounded-lg bg-bg-card border border-bg-border text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
        >
          <RefreshCw size={12} />
          Try again
        </button>
      )}
    </div>
  )
}
