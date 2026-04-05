import { useEffect } from 'react'
import { Sparkles, MessageSquare, History, Settings2, ArrowRight } from 'lucide-react'
import { useApp } from '../contexts/AppContext'

export default function AIPage() {
  const { openAIPanel, aiPanelOpen, setAIPanelTab } = useApp()

  // Auto-open panel when landing on this page
  useEffect(() => {
    if (!aiPanelOpen) openAIPanel('chat')
  }, [])

  const features = [
    {
      icon: MessageSquare,
      color: 'text-accent-cyan',
      bg: 'bg-accent-cyan/8 border-accent-cyan/20',
      title: 'Live Chat',
      desc: 'Stream AI analysis for any NSE stock — RSI signals, price targets, momentum',
      action: () => { openAIPanel('chat'); setAIPanelTab('chat') },
    },
    {
      icon: History,
      color: 'text-accent-amber',
      bg: 'bg-accent-amber/8 border-accent-amber/20',
      title: 'Conversation History',
      desc: 'All past analyses saved locally — grouped by date, searchable, deletable',
      action: () => { openAIPanel('history'); setAIPanelTab('history') },
    },
    {
      icon: Settings2,
      color: 'text-accent-green',
      bg: 'bg-accent-green/8 border-accent-green/20',
      title: 'Provider Settings',
      desc: 'Switch between Ollama, OpenAI, OpenRouter — manage API keys securely',
      action: () => { openAIPanel('settings'); setAIPanelTab('settings') },
    },
  ]

  return (
    <div className="page-enter space-y-8 max-w-2xl">
      {/* Hero */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-2xl bg-accent-purple/10 border border-accent-purple/25 flex items-center justify-center">
            <Sparkles size={18} className="text-accent-purple" />
          </div>
          <div>
            <h1 className="font-display font-700 text-2xl text-text-primary tracking-tight">AI Analyst</h1>
            <p className="text-xs text-text-muted font-mono">ChatGPT-style streaming · Multi-provider</p>
          </div>
        </div>
        <p className="text-sm text-text-secondary leading-relaxed">
          Get institutional-grade analysis for any NSE stock. Powered by your choice of Ollama, OpenAI, or OpenRouter — with full streaming and persistent conversation history.
        </p>
      </div>

      {/* Feature cards */}
      <div className="space-y-3">
        {features.map(f => (
          <button key={f.title} onClick={f.action}
            className={`w-full text-left flex items-center gap-4 bg-bg-card border rounded-2xl px-5 py-4 hover:bg-bg-hover transition-all group active:scale-[0.99] ${f.bg}`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${f.bg}`}>
              <f.icon size={16} className={f.color} />
            </div>
            <div className="flex-1">
              <div className={`text-sm font-body font-600 ${f.color}`}>{f.title}</div>
              <div className="text-xs text-text-muted mt-0.5">{f.desc}</div>
            </div>
            <ArrowRight size={14} className="text-text-muted group-hover:text-text-secondary transition-colors flex-shrink-0" />
          </button>
        ))}
      </div>

      {/* Info box */}
      <div className="bg-bg-card border border-bg-border rounded-2xl p-5">
        <h3 className="text-xs font-display font-600 text-text-primary mb-3">How it works</h3>
        <div className="space-y-2.5">
          {[
            'Your stock data is fetched live from the backend and sent as context',
            'Conversations are identified by a unique ID — the backend maintains history',
            'Responses stream token-by-token just like ChatGPT',
            'All settings and history are stored only in your browser',
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2.5 text-xs text-text-muted font-body">
              <span className="w-4 h-4 rounded-md bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center text-[9px] font-mono text-accent-cyan flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              {item}
            </div>
          ))}
        </div>
      </div>

      {!aiPanelOpen && (
        <button onClick={() => openAIPanel('chat')}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-accent-purple/10 border border-accent-purple/25 text-accent-purple font-body font-500 hover:bg-accent-purple/18 transition-all active:scale-[0.99]">
          <Sparkles size={15} />
          Open AI Panel
        </button>
      )}
    </div>
  )
}
