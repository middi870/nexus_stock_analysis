export const BASE_URL = 'http://localhost:8000'

// ── Core fetch wrapper ─────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `API error ${res.status}`)
  }
  return res.json()
}

// ── Stock data ─────────────────────────────────────────────────────────────
export const fetchStock = (symbol, days = 90) =>
  apiFetch(`/stocks/${encodeURIComponent(symbol)}?days=${days}`)

// ── Screener ───────────────────────────────────────────────────────────────
export const fetchScreener = (params = {}) => {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== '' && v != null)
  ).toString()
  return apiFetch(`/screener${qs ? '?' + qs : ''}`)
}

// ── Market movers ──────────────────────────────────────────────────────────
export const fetchMarketMovers = () => apiFetch('/market/movers')

// ── AI Streaming ─────────────────────────────────────────────────────────
// Uses native fetch + ReadableStream — no axios.
// API key is passed as  Authorization: Bearer <key>  per request only.
// It is NEVER stored server-side; this is a pure BYOK pattern.
//
// SSE format expected from server:
//   data: <chunk text>\n\n
//   data: [DONE]\n\n
//
// @param {string}  symbol
// @param {string}  conversationId   — existing thread id (or null to start new)
// @param {string}  provider         — 'ollama' | 'openai' | 'openrouter'
// @param {string}  apiKey           — bearer token; empty string for Ollama (no key needed)
// @param {AbortSignal} signal
//
export async function* streamAIResponse({ symbol, conversationId, provider, apiKey, signal }) {
  const params = new URLSearchParams({ provider: provider || 'ollama' })
  if (conversationId) params.set('conversation_id', conversationId)

  const url = `${BASE_URL}/ai/stream/${encodeURIComponent(symbol)}?${params}`

  // Build headers — only attach Authorization when a key is supplied
  const headers = { Accept: 'text/event-stream' }
  if (apiKey && apiKey.trim()) {
    headers['Authorization'] = `Bearer ${apiKey.trim()}`
  }

  const res = await fetch(url, { method: 'GET', headers, signal })

  if (!res.ok) {
    // Surface the backend error message when available
    const body = await res.text().catch(() => res.statusText)
    let detail = body
    try { detail = JSON.parse(body)?.detail || body } catch {}
    throw new Error(`Stream error ${res.status}: ${detail}`)
  }

  const reader  = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer    = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // Process all complete SSE lines
      const lines = buffer.split('\n')
      buffer = lines.pop() // keep the (possibly incomplete) last fragment

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue

        const data = trimmed.slice(5).trim()
        if (!data)           continue
        if (data === '[DONE]') return   // clean stream end

        yield data
      }
    }

    // Flush any remaining buffer fragment
    if (buffer.trim().startsWith('data:')) {
      const data = buffer.trim().slice(5).trim()
      if (data && data !== '[DONE]') yield data
    }
  } finally {
    reader.releaseLock()
  }
}

export default { fetchStock, fetchScreener, fetchMarketMovers, streamAIResponse }
