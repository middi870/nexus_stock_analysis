import { useState } from 'react'
import { Sparkles, Search } from 'lucide-react'
import AIInsight from '../components/AIInsight'

const QUICK_SYMBOLS = [
  'TCS.NS', 'RELIANCE.NS', 'INFY.NS', 'HDFCBANK.NS',
  'WIPRO.NS', 'TATAMOTORS.NS', 'BAJFINANCE.NS', 'ICICIBANK.NS',
]

export default function AIPage() {
  const [symbol, setSymbol] = useState('TCS.NS')
  const [input,  setInput]  = useState('TCS.NS')

  const apply = () => {
    if (input.trim()) setSymbol(input.trim().toUpperCase())
  }

  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded-xl bg-accent-purple/10 border border-accent-purple/20 flex items-center justify-center">
            <Sparkles size={15} className="text-accent-purple" />
          </div>
          <h1 className="font-display font-700 text-2xl text-text-primary tracking-tight">
            AI Insights
          </h1>
        </div>
        <p className="text-sm text-text-muted">
          Get AI-powered analysis for any NSE stock using your preferred provider
        </p>
      </div>

      {/* Symbol picker */}
      <div className="bg-bg-card border border-bg-border rounded-2xl p-5">
        <label className="block text-[10px] text-text-muted font-mono uppercase tracking-widest mb-3">
          Stock Symbol
        </label>
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              value={input}
              onChange={e => setInput(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && apply()}
              placeholder="e.g. INFY.NS"
              className="w-full bg-bg-base border border-bg-border rounded-xl pl-8 pr-3 py-2.5 text-sm font-mono text-text-primary focus:outline-none focus:border-accent-cyan/50 focus:ring-1 focus:ring-accent-cyan/20 placeholder-text-muted transition-all"
            />
          </div>
          <button
            onClick={apply}
            className="px-5 py-2.5 rounded-xl bg-accent-purple/10 border border-accent-purple/30 text-accent-purple text-sm font-body hover:bg-accent-purple/20 transition-all active:scale-95"
          >
            Analyze
          </button>
        </div>

        {/* Quick select chips */}
        <div className="flex flex-wrap gap-2">
          <span className="text-[10px] font-mono text-text-muted self-center mr-1">Quick:</span>
          {QUICK_SYMBOLS.map(sym => (
            <button
              key={sym}
              onClick={() => { setInput(sym); setSymbol(sym) }}
              className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border transition-all ${
                symbol === sym
                  ? 'bg-accent-cyan/10 border-accent-cyan/30 text-accent-cyan'
                  : 'bg-bg-base border-bg-border text-text-muted hover:text-text-secondary hover:border-bg-border'
              }`}
            >
              {sym}
            </button>
          ))}
        </div>
      </div>

      {/* AI Panel — expanded */}
      <div className="max-w-3xl">
        <AIInsight symbol={symbol} />
      </div>
    </div>
  )
}
