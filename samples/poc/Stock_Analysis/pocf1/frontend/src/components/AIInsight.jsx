import { useState } from 'react'
import { Sparkles, Loader2, Bot, User, ChevronDown, RefreshCw } from 'lucide-react'
import { fetchAIInsight } from '../api/api'

const PROVIDERS = [
  { value: 'auto',       label: 'Auto',       desc: 'Best available' },
  { value: 'ollama',     label: 'Ollama',      desc: 'Local LLM'     },
  { value: 'openai',     label: 'OpenAI',      desc: 'GPT-4'         },
  { value: 'openrouter', label: 'OpenRouter',  desc: 'Multi-model'   },
]

export default function AIInsight({ symbol }) {
  const [provider,  setProvider]  = useState('auto')
  const [open,      setOpen]      = useState(false)
  const [messages,  setMessages]  = useState([])
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)

  const getInsight = async () => {
    if (!symbol) return
    setLoading(true)
    setError(null)

    try {
      const data = await fetchAIInsight(symbol, provider)
      const text = data?.insight || data?.response || data?.content || JSON.stringify(data)
      setMessages(prev => [
        ...prev,
        { role: 'user',      text: `Analyze ${symbol} with ${provider} provider` },
        { role: 'assistant', text, provider },
      ])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const clear = () => setMessages([])

  const selectedProv = PROVIDERS.find(p => p.value === provider)

  return (
    <div className="bg-bg-card border border-bg-border rounded-2xl overflow-hidden flex flex-col animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-bg-border">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-accent-purple" />
          <span className="font-display font-600 text-text-primary text-sm">AI Insights</span>
          {symbol && (
            <span className="text-[10px] font-mono px-2 py-0.5 bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20 rounded-md ml-1">
              {symbol}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Provider dropdown */}
          <div className="relative">
            <button
              onClick={() => setOpen(o => !o)}
              className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1.5 rounded-lg bg-bg-hover border border-bg-border text-text-secondary hover:text-text-primary transition-colors"
            >
              {selectedProv?.label}
              <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-bg-card border border-bg-border rounded-xl shadow-xl z-30 overflow-hidden animate-fade-in">
                {PROVIDERS.map(p => (
                  <button
                    key={p.value}
                    onClick={() => { setProvider(p.value); setOpen(false) }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-mono hover:bg-bg-hover transition-colors border-b border-bg-border last:border-0 ${
                      provider === p.value ? 'text-accent-cyan' : 'text-text-secondary'
                    }`}
                  >
                    <span>{p.label}</span>
                    <span className="text-text-muted text-[10px]">{p.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {messages.length > 0 && (
            <button onClick={clear} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors">
              <RefreshCw size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[180px] max-h-[400px]">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <div className="w-10 h-10 rounded-xl bg-accent-purple/10 border border-accent-purple/20 flex items-center justify-center mb-3">
              <Sparkles size={16} className="text-accent-purple" />
            </div>
            <p className="text-xs text-text-muted font-body">
              {symbol ? `Click below to get AI analysis for ${symbol}` : 'Select a stock first'}
            </p>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            {m.role === 'assistant' && (
              <div className="w-6 h-6 rounded-lg bg-accent-purple/10 border border-accent-purple/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot size={12} className="text-accent-purple" />
              </div>
            )}
            <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed font-body ${
              m.role === 'user'
                ? 'bg-accent-cyan/10 border border-accent-cyan/20 text-text-secondary'
                : 'bg-bg-hover border border-bg-border text-text-primary'
            }`}>
              {m.role === 'assistant' && m.provider && (
                <div className="text-[10px] text-text-muted font-mono mb-1.5 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-accent-purple inline-block" />
                  {m.provider} · AI Analysis
                </div>
              )}
              <p className="whitespace-pre-wrap">{m.text}</p>
            </div>
            {m.role === 'user' && (
              <div className="w-6 h-6 rounded-lg bg-bg-hover border border-bg-border flex items-center justify-center flex-shrink-0 mt-0.5">
                <User size={12} className="text-text-muted" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-2.5 animate-fade-in">
            <div className="w-6 h-6 rounded-lg bg-accent-purple/10 border border-accent-purple/20 flex items-center justify-center flex-shrink-0">
              <Bot size={12} className="text-accent-purple" />
            </div>
            <div className="bg-bg-hover border border-bg-border rounded-xl px-3.5 py-3 flex items-center gap-2">
              <Loader2 size={13} className="animate-spin text-accent-purple" />
              <span className="text-xs text-text-muted font-mono">Analyzing {symbol}…</span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-accent-red/5 border border-accent-red/20 rounded-xl px-4 py-3 text-xs text-accent-red font-mono animate-fade-in">
            Error: {error}
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="px-4 py-3 border-t border-bg-border">
        <button
          onClick={getInsight}
          disabled={loading || !symbol}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent-purple/10 border border-accent-purple/30 text-accent-purple text-sm font-body font-500 hover:bg-accent-purple/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
        >
          {loading ? (
            <><Loader2 size={14} className="animate-spin" /> Fetching insight…</>
          ) : (
            <><Sparkles size={14} /> Get AI Insight</>
          )}
        </button>
      </div>
    </div>
  )
}
