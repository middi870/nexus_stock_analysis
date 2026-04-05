const BASE_URL = 'http://localhost:8000'

// ── Core fetch wrapper ─────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const url = `${BASE_URL}${path}`
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `Request failed: ${res.status}`)
  }
  return res.json()
}

// ── Endpoints ──────────────────────────────────────────────────────────────

/** Fetch OHLCV + indicators for a symbol */
export const fetchStock = (symbol, days = 90) =>
  apiFetch(`/stocks/${encodeURIComponent(symbol)}?days=${days}`)

/** Fetch screener with optional filter params */
export const fetchScreener = (params = {}) => {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== '' && v != null)
  ).toString()
  return apiFetch(`/screener${qs ? `?${qs}` : ''}`)
}

/** Fetch market movers */
export const fetchMarketMovers = () => apiFetch('/market/movers')

/** Fetch AI insight — returns SSE or plain JSON depending on provider */
export const fetchAIInsight = (symbol, provider = 'auto') =>
  apiFetch(`/ai/insight/${encodeURIComponent(symbol)}?provider=${provider}`)

/** Streaming AI insight via SSE (EventSource) — returns cleanup fn */
export const streamAIInsight = (symbol, provider, onChunk, onDone, onError) => {
  const url = `${BASE_URL}/ai/insight/${encodeURIComponent(symbol)}?provider=${provider}&stream=true`
  const es = new EventSource(url)
  es.onmessage = (e) => {
    if (e.data === '[DONE]') { onDone(); es.close() }
    else onChunk(e.data)
  }
  es.onerror = (e) => { onError(e); es.close() }
  return () => es.close()
}

export default { fetchStock, fetchScreener, fetchMarketMovers, fetchAIInsight, streamAIInsight }
