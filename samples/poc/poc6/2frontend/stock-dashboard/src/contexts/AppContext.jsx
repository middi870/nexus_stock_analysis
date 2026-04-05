import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

const AppContext = createContext(null)

const BASE_URL = 'http://localhost:8000'
const HEALTH_INTERVAL = 15_000
const CONV_KEY     = 'pulse_conversations'
const SETTINGS_KEY = 'pulse_ai_settings'

function loadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback }
  catch { return fallback }
}

export function AppProvider({ children }) {
  // ── Backend status ────────────────────────────────────────────────────────
  const [backendStatus, setBackendStatus] = useState('checking') // 'online' | 'offline' | 'checking'
  const statusRef = useRef(backendStatus)
  statusRef.current = backendStatus

  const checkBackend = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/market/movers`, { signal: AbortSignal.timeout(4000) })
      setBackendStatus(res.ok ? 'online' : 'offline')
    } catch {
      setBackendStatus('offline')
    }
  }, [])

  useEffect(() => {
    checkBackend()
    const t = setInterval(checkBackend, HEALTH_INTERVAL)
    return () => clearInterval(t)
  }, [checkBackend])

  // ── Active symbol ─────────────────────────────────────────────────────────
  const [activeSymbol, setActiveSymbol] = useState('TCS.NS')

  // ── AI Panel ──────────────────────────────────────────────────────────────
  const [aiPanelOpen, setAIPanelOpen] = useState(false)
  const [aiPanelTab,  setAIPanelTab]  = useState('chat') // 'chat' | 'history' | 'settings'

  const openAIPanel  = (tab = 'chat') => { setAIPanelOpen(true);  setAIPanelTab(tab) }
  const closeAIPanel = ()             => { setAIPanelOpen(false) }
  const toggleAIPanel = (tab)         => {
    if (aiPanelOpen && (!tab || tab === aiPanelTab)) closeAIPanel()
    else openAIPanel(tab || aiPanelTab)
  }

  // ── Mobile sidebar ────────────────────────────────────────────────────────
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  // ── AI Conversations (persisted) ──────────────────────────────────────────
  const [conversations,  setConversations]  = useState(() => loadJSON(CONV_KEY, []))
  const [activeConvId,   setActiveConvId]   = useState(null)

  useEffect(() => {
    localStorage.setItem(CONV_KEY, JSON.stringify(conversations))
  }, [conversations])

  const createConversation = useCallback((symbol, provider) => {
    const id = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const conv = {
      id, symbol, provider,
      title: `${symbol} Analysis`,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    setConversations(prev => [conv, ...prev])
    setActiveConvId(id)
    return id
  }, [])

  const addMessage = useCallback((convId, message) => {
    setConversations(prev => prev.map(c =>
      c.id === convId
        ? { ...c, messages: [...c.messages, message], updatedAt: Date.now() }
        : c
    ))
  }, [])

  const updateLastMessage = useCallback((convId, content) => {
    setConversations(prev => prev.map(c => {
      if (c.id !== convId) return c
      const msgs = [...c.messages]
      if (msgs.length > 0 && msgs[msgs.length - 1].role === 'assistant') {
        msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content, streaming: false }
      }
      return { ...c, messages: msgs, updatedAt: Date.now() }
    }))
  }, [])

  const deleteConversation = useCallback((convId) => {
    setConversations(prev => prev.filter(c => c.id !== convId))
    setActiveConvId(prev => prev === convId ? null : prev)
  }, [])

  const clearAllConversations = useCallback(() => {
    setConversations([])
    setActiveConvId(null)
  }, [])

  const activeConversation = conversations.find(c => c.id === activeConvId) ?? null

  // ── AI Settings (persisted) ────────────────────────────────────────────────
  const [aiSettings, setAISettingsState] = useState(() => loadJSON(SETTINGS_KEY, {
    provider:         'ollama',
    openai_key:       '',
    openrouter_key:   '',
    ollama_host:      'http://localhost:11434',
    ollama_model:     'llama3.2',
    openai_model:     'gpt-4o-mini',
    openrouter_model: 'openai/gpt-4o-mini',
  }))

  const setAISettings = useCallback((patch) => {
    setAISettingsState(prev => {
      const next = { ...prev, ...patch }
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  return (
    <AppContext.Provider value={{
      // backend
      backendStatus, checkBackend,
      // symbol
      activeSymbol, setActiveSymbol,
      // AI panel
      aiPanelOpen, aiPanelTab, setAIPanelTab,
      openAIPanel, closeAIPanel, toggleAIPanel,
      // mobile
      mobileSidebarOpen, setMobileSidebarOpen,
      // conversations
      conversations, activeConvId, activeConversation,
      setActiveConvId, createConversation,
      addMessage, updateLastMessage,
      deleteConversation, clearAllConversations,
      // settings
      aiSettings, setAISettings,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
