import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Sparkles, X, MessageSquare, History, Settings2,
  Send, Square, Trash2, Plus, Bot, User,
  Eye, EyeOff, RefreshCw, Cpu, Key, AlertTriangle,
  Clock, ChevronRight, CheckCircle2, Info, Lock
} from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { streamAIResponse } from '../api/api'

// ── Provider config ────────────────────────────────────────────────────────
const PROVIDERS = [
  {
    id:       'ollama',
    label:    'Ollama',
    color:    'text-accent-green',
    ring:     'border-accent-green/40',
    bg:       'bg-accent-green/8',
    desc:     'Local LLM — no key needed',
    keyField: null,           // Ollama runs locally; no API key required
    keyHint:  null,
  },
  {
    id:       'openai',
    label:    'OpenAI',
    color:    'text-accent-blue',
    ring:     'border-accent-blue/40',
    bg:       'bg-accent-blue/8',
    desc:     'GPT-4o · Requires API key',
    keyField: 'openai_key',
    keyHint:  'sk-…',
  },
  {
    id:       'openrouter',
    label:    'OpenRouter',
    color:    'text-accent-amber',
    ring:     'border-accent-amber/40',
    bg:       'bg-accent-amber/8',
    desc:     'Multi-model · Requires API key',
    keyField: 'openrouter_key',
    keyHint:  'sk-or-…',
  },
]

// Return the correct API key for the selected provider
function resolveApiKey(provider, settings) {
  const cfg = PROVIDERS.find(p => p.id === provider)
  if (!cfg?.keyField) return ''           // Ollama — no key
  return settings[cfg.keyField] || ''
}

// ── Helpers ────────────────────────────────────────────────────────────────
function relativeDate(ts) {
  const d = Date.now() - ts
  if (d < 60_000)     return 'Just now'
  if (d < 3_600_000)  return `${Math.floor(d / 60_000)}m ago`
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h ago`
  return new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

function groupByDate(convs) {
  const today     = new Date(); today.setHours(0,0,0,0)
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  const week      = new Date(today); week.setDate(today.getDate() - 7)
  const groups    = { Today: [], Yesterday: [], 'This week': [], Older: [] }
  for (const c of convs) {
    const d = new Date(c.updatedAt); d.setHours(0,0,0,0)
    if      (d >= today)     groups['Today'].push(c)
    else if (d >= yesterday) groups['Yesterday'].push(c)
    else if (d >= week)      groups['This week'].push(c)
    else                     groups['Older'].push(c)
  }
  return Object.entries(groups).filter(([, v]) => v.length > 0)
}

// ── Key-missing warning banner ─────────────────────────────────────────────
function KeyWarning({ provider, onGoSettings }) {
  const cfg = PROVIDERS.find(p => p.id === provider)
  if (!cfg?.keyField) return null   // Ollama — no key needed
  return (
    <div className="mx-3 mb-2 flex items-start gap-2.5 bg-accent-amber/8 border border-accent-amber/20 rounded-xl px-3 py-2.5 fade-in">
      <AlertTriangle size={12} className="text-accent-amber flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-accent-amber font-mono leading-relaxed">
          No {cfg.label} key set.
        </p>
        <button onClick={onGoSettings}
          className="text-[11px] text-accent-amber/80 underline underline-offset-2 hover:text-accent-amber transition-colors mt-0.5">
          Add it in Settings →
        </button>
      </div>
    </div>
  )
}

// ── Message bubble ─────────────────────────────────────────────────────────
function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-2.5 msg-enter ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-6 h-6 rounded-lg bg-accent-purple/15 border border-accent-purple/25 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bot size={11} className="text-accent-purple" />
        </div>
      )}
      <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
        isUser
          ? 'bg-accent-cyan/10 border border-accent-cyan/20 text-text-secondary rounded-tr-sm'
          : 'bg-bg-hover border border-bg-border text-text-primary rounded-tl-sm'
      } ${msg.streaming ? 'typing-cursor' : ''}`}>
        {msg.content || (msg.streaming ? '' : '…')}
      </div>
      {isUser && (
        <div className="w-6 h-6 rounded-lg bg-bg-card border border-bg-border flex items-center justify-center flex-shrink-0 mt-0.5">
          <User size={11} className="text-text-muted" />
        </div>
      )}
    </div>
  )
}

// ── Chat Tab ───────────────────────────────────────────────────────────────
function ChatTab({ onGoSettings }) {
  const {
    activeSymbol, aiSettings,
    conversations, activeConvId, activeConversation,
    setActiveConvId, createConversation,
    addMessage, updateLastMessage,
  } = useApp()

  const [symbol,    setSymbol]    = useState(activeSymbol || 'TCS.NS')
  const [input,     setInput]     = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error,     setError]     = useState(null)
  const abortRef                   = useRef(null)
  const bottomRef                  = useRef(null)

  // Sync symbol when global selection changes
  useEffect(() => { if (activeSymbol) setSymbol(activeSymbol) }, [activeSymbol])

  const messages = activeConversation?.messages ?? []

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Resolve the correct API key for this provider — passed in Authorization header
  const provider = aiSettings.provider
  const apiKey   = resolveApiKey(provider, aiSettings)
  const needsKey = PROVIDERS.find(p => p.id === provider)?.keyField && !apiKey

  const stopStream = () => { abortRef.current?.abort(); setStreaming(false) }

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || streaming) return
    setError(null)

    // Guard: require key for cloud providers
    if (needsKey) {
      setError(`An API key is required for ${provider}. Add it in Settings.`)
      return
    }

    // Create or reuse a conversation thread
    let convId = activeConvId
    if (!convId || activeConversation?.symbol !== symbol) {
      convId = createConversation(symbol, provider)
    }

    // Optimistically append user message
    addMessage(convId, { role: 'user', content: text.trim(), timestamp: Date.now() })
    // Append empty assistant placeholder that will stream into
    addMessage(convId, { role: 'assistant', content: '', timestamp: Date.now(), streaming: true })

    setInput('')
    setStreaming(true)

    const ctrl = new AbortController()
    abortRef.current = ctrl
    let accumulated  = ''

    try {
      const gen = streamAIResponse({
        symbol,
        conversationId: convId,
        provider,
        apiKey,           // ← Bearer token passed in Authorization header
        signal: ctrl.signal,
      })

      for await (const chunk of gen) {
        accumulated += chunk
        updateLastMessage(convId, accumulated)
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        setError(e.message)
        updateLastMessage(convId, accumulated || `[Error: ${e.message}]`)
      }
    } finally {
      if (accumulated) updateLastMessage(convId, accumulated)
      setStreaming(false)
    }
  }, [streaming, activeConvId, activeConversation, symbol, provider, apiKey,
      needsKey, createConversation, addMessage, updateLastMessage])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
  }

  const providerCfg = PROVIDERS.find(p => p.id === provider) || PROVIDERS[0]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar: symbol + provider badge + new chat */}
      <div className="px-3 py-2.5 border-b border-bg-border flex items-center gap-2 flex-shrink-0">
        <input
          value={symbol}
          onChange={e => setSymbol(e.target.value.toUpperCase())}
          placeholder="Symbol…"
          className="flex-1 bg-bg-input border border-bg-border rounded-lg px-2.5 py-1.5 text-xs font-mono text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-cyan/40 transition-all min-w-0"
        />

        {/* Provider pill — click goes to settings */}
        <button onClick={onGoSettings} title="Change provider in Settings"
          className={`flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1.5 rounded-lg border ${providerCfg.bg} ${providerCfg.ring} ${providerCfg.color} flex-shrink-0 hover:opacity-80 transition-opacity`}>
          {!providerCfg.keyField
            ? <Lock size={9} />
            : apiKey ? <CheckCircle2 size={9} /> : <AlertTriangle size={9} />
          }
          {providerCfg.label}
        </button>

        <button onClick={() => { setActiveConvId(null); setError(null) }}
          title="New chat"
          className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors flex-shrink-0">
          <Plus size={13} />
        </button>
      </div>

      {/* Key warning banner */}
      {needsKey && <KeyWarning provider={provider} onGoSettings={onGoSettings} />}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-6">
            <div className="w-12 h-12 rounded-2xl bg-accent-purple/10 border border-accent-purple/20 flex items-center justify-center mb-3">
              <Sparkles size={20} className="text-accent-purple" />
            </div>
            <p className="text-xs text-text-secondary font-body mb-1">Ask anything about {symbol}</p>
            <p className="text-[11px] text-text-muted mb-5">Technical analysis · Price targets · Risk</p>
            <div className="space-y-2 w-full">
              {[
                `Analyze ${symbol} technicals`,
                `RSI signal for ${symbol}?`,
                `Price outlook for ${symbol}`,
              ].map(s => (
                <button key={s} onClick={() => sendMessage(s)} disabled={needsKey}
                  className="w-full text-left text-[11px] font-mono px-3 py-2 rounded-xl bg-bg-card border border-bg-border text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors disabled:opacity-40">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => <MessageBubble key={i} msg={m} />)
        )}

        {error && (
          <div className="flex items-start gap-2 bg-accent-red/8 border border-accent-red/20 rounded-xl px-3 py-2.5 fade-in">
            <AlertTriangle size={12} className="text-accent-red flex-shrink-0 mt-0.5" />
            <span className="text-[11px] text-accent-red leading-relaxed">{error}</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="px-3 pb-3 pt-2 border-t border-bg-border flex-shrink-0">
        <div className="flex items-end gap-2 bg-bg-card border border-bg-border rounded-2xl px-3 py-2 focus-within:border-accent-cyan/30 transition-all">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={needsKey ? `Add ${providerCfg.label} key in Settings` : streaming ? 'AI is responding…' : 'Ask about this stock…'}
            disabled={streaming || needsKey}
            rows={1}
            className="flex-1 bg-transparent text-xs text-text-primary placeholder-text-muted resize-none focus:outline-none min-h-[20px] max-h-[80px] py-0.5 disabled:opacity-50"
            style={{ lineHeight: '1.5' }}
          />
          {streaming ? (
            <button onClick={stopStream}
              className="w-7 h-7 rounded-lg bg-accent-red/15 border border-accent-red/25 flex items-center justify-center text-accent-red flex-shrink-0 hover:bg-accent-red/25 transition-colors">
              <Square size={10} fill="currentColor" />
            </button>
          ) : (
            <button onClick={() => sendMessage(input)} disabled={!input.trim() || needsKey}
              className="w-7 h-7 rounded-lg bg-accent-cyan/15 border border-accent-cyan/25 flex items-center justify-center text-accent-cyan flex-shrink-0 hover:bg-accent-cyan/25 transition-colors disabled:opacity-30">
              <Send size={10} />
            </button>
          )}
        </div>
        <div className="flex items-center justify-between mt-1.5 px-1">
          <span className="text-[10px] text-text-muted font-mono">Enter ↵ send · Shift+Enter newline</span>
          {/* BYOK security notice */}
          {apiKey && (
            <span className="flex items-center gap-1 text-[10px] text-accent-green/60 font-mono">
              <Lock size={8} /> key in header
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── History Tab ────────────────────────────────────────────────────────────
function HistoryTab() {
  const {
    conversations, activeConvId,
    setActiveConvId, deleteConversation,
    clearAllConversations, setAIPanelTab,
  } = useApp()
  const [confirm, setConfirm] = useState(false)
  const grouped = groupByDate([...conversations])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-bg-border flex items-center justify-between flex-shrink-0">
        <span className="text-xs text-text-muted font-mono">
          {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
        </span>
        {conversations.length > 0 && (
          confirm ? (
            <div className="flex gap-3">
              <button onClick={() => { clearAllConversations(); setConfirm(false) }}
                className="text-[11px] text-accent-red font-mono hover:underline">Yes, clear</button>
              <button onClick={() => setConfirm(false)}
                className="text-[11px] text-text-muted font-mono hover:underline">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setConfirm(true)}
              className="text-[11px] text-text-muted font-mono hover:text-accent-red transition-colors">
              Clear all
            </button>
          )
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <Clock size={24} className="text-text-muted mb-3" />
            <p className="text-xs text-text-muted">No conversations yet</p>
            <p className="text-[11px] text-text-dim mt-1">Start a chat to see history here</p>
          </div>
        ) : (
          grouped.map(([group, convs]) => (
            <div key={group} className="mb-3">
              <div className="px-4 py-1.5 text-[9px] font-mono text-text-muted uppercase tracking-widest">
                {group}
              </div>
              {convs.map(conv => {
                const lastMsg = conv.messages.at(-1)
                const provCfg = PROVIDERS.find(p => p.id === conv.provider)
                return (
                  <div key={conv.id}
                    className={`group mx-2 flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all border ${
                      activeConvId === conv.id
                        ? 'bg-accent-cyan/8 border-accent-cyan/15'
                        : 'border-transparent hover:bg-bg-hover'
                    }`}
                    onClick={() => { setActiveConvId(conv.id); setAIPanelTab('chat') }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono text-text-primary font-600 truncate">{conv.symbol}</span>
                        {provCfg && (
                          <span className={`text-[9px] font-mono ${provCfg.color} opacity-70 flex-shrink-0`}>
                            {provCfg.label}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-text-muted truncate mt-0.5">
                        {lastMsg?.content?.slice(0, 45) || 'No messages'}
                        {lastMsg?.content?.length > 45 ? '…' : ''}
                      </div>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-1.5">
                      <span className="text-[10px] text-text-muted font-mono whitespace-nowrap">
                        {relativeDate(conv.updatedAt)}
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); deleteConversation(conv.id) }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-text-muted hover:text-accent-red transition-all">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ── Settings Tab ───────────────────────────────────────────────────────────
function SettingsTab() {
  const { aiSettings, setAISettings } = useApp()
  const [showKeys, setShowKeys] = useState({})
  const toggle = (k) => setShowKeys(p => ({ ...p, [k]: !p[k] }))
  const set    = (k, v) => setAISettings({ [k]: v })

  const activeProvider = aiSettings.provider

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 py-4 space-y-7">

        {/* Provider selector */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Cpu size={13} className="text-accent-cyan" />
            <h3 className="text-xs font-display font-600 text-text-primary tracking-wide">AI Provider</h3>
          </div>
          <div className="space-y-2">
            {PROVIDERS.map(p => {
              const isActive  = activeProvider === p.id
              const hasKey    = !p.keyField || !!aiSettings[p.keyField]
              return (
                <label key={p.id}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-xl border cursor-pointer transition-all ${
                    isActive ? `${p.bg} ${p.ring}` : 'border-transparent hover:bg-bg-card'
                  }`}>
                  <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    isActive ? p.ring : 'border-text-muted'
                  }`}>
                    {isActive && <div className={`w-1.5 h-1.5 rounded-full ${
                      p.id==='ollama' ? 'bg-accent-green' : p.id==='openai' ? 'bg-accent-blue' : 'bg-accent-amber'
                    }`} />}
                  </div>
                  <input type="radio" name="provider" value={p.id}
                    checked={isActive} onChange={() => set('provider', p.id)} className="hidden" />
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-body font-500 ${p.color}`}>{p.label}</div>
                    <div className="text-[11px] text-text-muted">{p.desc}</div>
                  </div>
                  {/* Key status badge */}
                  {p.keyField ? (
                    hasKey
                      ? <CheckCircle2 size={13} className="text-accent-green flex-shrink-0" />
                      : <AlertTriangle size={13} className="text-accent-amber flex-shrink-0" />
                  ) : (
                    <span className="text-[10px] font-mono text-accent-green/60 flex-shrink-0">local</span>
                  )}
                </label>
              )
            })}
          </div>
        </section>

        {/* API Keys section */}
        <section>
          <div className="flex items-center gap-2 mb-1">
            <Key size={13} className="text-accent-amber" />
            <h3 className="text-xs font-display font-600 text-text-primary tracking-wide">API Keys</h3>
          </div>

          {/* BYOK security notice */}
          <div className="flex items-start gap-2 bg-bg-card border border-bg-border rounded-xl px-3 py-2.5 mb-4">
            <Lock size={11} className="text-accent-green flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-text-muted leading-relaxed">
              Keys are sent as{' '}
              <span className="font-mono text-accent-cyan/80">Authorization: Bearer</span>{' '}
              header — never stored server-side, never logged.
            </p>
          </div>

          <div className="space-y-4">
            {/* OpenAI */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-mono text-text-muted uppercase tracking-widest">
                  OpenAI Key
                </label>
                {aiSettings.openai_key && (
                  <span className="flex items-center gap-1 text-[10px] font-mono text-accent-green">
                    <CheckCircle2 size={9} /> set
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showKeys.openai ? 'text' : 'password'}
                  value={aiSettings.openai_key}
                  onChange={e => set('openai_key', e.target.value)}
                  placeholder="sk-…"
                  autoComplete="off"
                  className="w-full bg-bg-input border border-bg-border rounded-xl px-3 py-2.5 text-xs font-mono text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-cyan/40 pr-9 transition-all"
                />
                <button onClick={() => toggle('openai')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors">
                  {showKeys.openai ? <EyeOff size={12} /> : <Eye size={12} />}
                </button>
              </div>
            </div>

            {/* OpenRouter */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-mono text-text-muted uppercase tracking-widest">
                  OpenRouter Key
                </label>
                {aiSettings.openrouter_key && (
                  <span className="flex items-center gap-1 text-[10px] font-mono text-accent-green">
                    <CheckCircle2 size={9} /> set
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showKeys.openrouter ? 'text' : 'password'}
                  value={aiSettings.openrouter_key}
                  onChange={e => set('openrouter_key', e.target.value)}
                  placeholder="sk-or-…"
                  autoComplete="off"
                  className="w-full bg-bg-input border border-bg-border rounded-xl px-3 py-2.5 text-xs font-mono text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-cyan/40 pr-9 transition-all"
                />
                <button onClick={() => toggle('openrouter')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors">
                  {showKeys.openrouter ? <EyeOff size={12} /> : <Eye size={12} />}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Ollama config */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <RefreshCw size={13} className="text-accent-green" />
            <h3 className="text-xs font-display font-600 text-text-primary tracking-wide">Ollama Config</h3>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-mono text-text-muted uppercase tracking-widest mb-1.5">Host</label>
              <input value={aiSettings.ollama_host}
                onChange={e => set('ollama_host', e.target.value)}
                className="w-full bg-bg-input border border-bg-border rounded-xl px-3 py-2.5 text-xs font-mono text-text-primary focus:outline-none focus:border-accent-cyan/40 transition-all" />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-text-muted uppercase tracking-widest mb-1.5">Model</label>
              <input value={aiSettings.ollama_model}
                onChange={e => set('ollama_model', e.target.value)}
                placeholder="llama3.2"
                className="w-full bg-bg-input border border-bg-border rounded-xl px-3 py-2.5 text-xs font-mono text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-cyan/40 transition-all" />
            </div>
          </div>
        </section>

        {/* Info */}
        <div className="flex items-start gap-2.5 bg-bg-card border border-bg-border rounded-xl px-3.5 py-3">
          <Info size={12} className="text-text-muted flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-text-muted leading-relaxed">
            Settings are saved locally in your browser. Keys are only kept in memory during an active stream request — never written to disk or sent anywhere except the selected provider.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Root AIPanel ────────────────────────────────────────────────────────────
export default function AIPanel() {
  const { aiPanelOpen, aiPanelTab, setAIPanelTab, closeAIPanel, conversations } = useApp()

  const TABS = [
    { id: 'chat',     icon: MessageSquare, label: 'Chat'    },
    { id: 'history',  icon: History,       label: 'History', badge: conversations.length },
    { id: 'settings', icon: Settings2,     label: 'Settings' },
  ]

  return (
    <>
      {/* Mobile overlay */}
      {aiPanelOpen && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-30 lg:hidden fade-in"
          onClick={closeAIPanel} />
      )}

      {/* Panel */}
      <div className={`ai-panel fixed top-0 right-0 h-full z-40 flex flex-col
        w-full xs:w-[380px] shadow-panel
        ${aiPanelOpen ? 'ai-panel-open' : 'ai-panel-closed'}`}
        style={{ background: '#0c1018', borderLeft: '1px solid #1a2535' }}
      >
        {/* Panel header */}
        <div className="flex-shrink-0 border-b border-bg-border">
          {/* Title row */}
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-accent-purple/15 border border-accent-purple/25 flex items-center justify-center">
                <Sparkles size={12} className="text-accent-purple" />
              </div>
              <span className="font-display font-600 text-sm text-text-primary">AI Analyst</span>
            </div>
            <button onClick={closeAIPanel}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors">
              <X size={15} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex px-2 gap-0.5">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setAIPanelTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-xs font-body transition-all ${
                  aiPanelTab === tab.id
                    ? 'text-text-primary bg-bg-hover border-t border-l border-r border-bg-border'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                <tab.icon size={12} />
                {tab.label}
                {tab.badge > 0 && (
                  <span className="bg-bg-card border border-bg-border text-text-muted text-[9px] font-mono px-1.5 rounded-full">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {aiPanelTab === 'chat'    && <ChatTab onGoSettings={() => setAIPanelTab('settings')} />}
          {aiPanelTab === 'history' && <HistoryTab />}
          {aiPanelTab === 'settings'&& <SettingsTab />}
        </div>
      </div>
    </>
  )
}
