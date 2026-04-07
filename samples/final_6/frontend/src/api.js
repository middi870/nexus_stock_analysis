/**
 * NEXUS API Layer
 * - Request deduplication (in-flight map)
 * - Stale-while-revalidate TTL cache
 * - Exponential-backoff retry (2 attempts)
 * - AbortController cancellation
 * - SSE streaming for AI chat
 */

const BASE = typeof __API_URL__ !== 'undefined' ? __API_URL__ : '/api'

// ── Cache & dedup ─────────────────────────────────────────────────────────────
const CACHE    = new Map()    // path → { data, ts }
const IN_FLIGHT= new Map()    // path → Promise
const TTL = {
  companies: 30_000,
  data:      60_000,
  summary:   30_000,
  movers:    20_000,
  sectors:   30_000,
}

async function _fetchWithRetry(path, opts = {}, retries = 2) {
  let lastErr
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(BASE + path, { signal: opts.signal, ...opts })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `HTTP ${res.status}`)
      }
      return await res.json()
    } catch (e) {
      if (e.name === 'AbortError') throw e
      lastErr = e
      if (i < retries) await new Promise(r => setTimeout(r, 400 * 2 ** i))
    }
  }
  throw lastErr
}

async function get(path, ttl = 0, signal = null) {
  const cached = CACHE.get(path)
  if (cached && ttl && Date.now() - cached.ts < ttl) return cached.data
  if (IN_FLIGHT.has(path)) return IN_FLIGHT.get(path)

  const p = _fetchWithRetry(path, { signal })
    .then(data => { CACHE.set(path, { data, ts: Date.now() }); return data })
    .catch(e   => { if (CACHE.has(path)) return CACHE.get(path).data; throw e })
    .finally(() => IN_FLIGHT.delete(path))

  IN_FLIGHT.set(path, p)
  return p
}

async function post(path, body, signal = null) {
  const res = await fetch(BASE + path, {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || `HTTP ${res.status}`) }
  return res.json()
}

export function invalidate(pattern) {
  for (const k of CACHE.keys()) if (k.includes(pattern)) CACHE.delete(k)
}

// ── Public API ────────────────────────────────────────────────────────────────
export const api = {
  companies: sig          => get('/companies',                             TTL.companies, sig),
  data:      (sym,d,sig)  => get(`/data/${sym}?days=${d}`,                TTL.data,      sig),
  summary:   (sym,sig)    => get(`/summary/${sym}`,                       TTL.summary,   sig),
  compare:   (s1,s2,d,sig)=> get(`/compare?symbol1=${s1}&symbol2=${s2}&days=${d}`, TTL.data, sig),
  movers:    (n=7,sig)    => get(`/movers?n=${n}`,                        TTL.movers,    sig),
  sectors:   sig          => get('/sectors',                              TTL.sectors,   sig),
  screener:  (p,sig)      => get('/screener?' + new URLSearchParams(
    Object.fromEntries(Object.entries(p).filter(([,v]) => v != null && v !== ''))
  ), 0, sig),
  heatmap:   sig          => get('/heatmap',                              TTL.movers,    sig),
  providers: ()           => get('/providers',                            3_600_000),
  refresh:   ()           => post('/refresh', {}),
  aiChat:    (body,sig)   => post('/ai/chat', body, sig),
  aiHistory: id           => get(`/ai/history/${id}`, 0),
  quote:     (sym,iv,sig)  => get(`/quote/${sym}?interval=${iv||'5m'}`, 0, sig),
  news:      (sym,sig)     => get(`/news/${sym}`,                       900_000, sig),
}

// ── SSE Streaming ─────────────────────────────────────────────────────────────
/**
 * @param {object}   opts         - { provider, model, messages, system, api_key, symbol, conversation_id }
 * @param {Function} onChunk      - called with each text delta
 * @param {Function} onConvId     - called once with the conversation_id
 * @param {Function} onDone       - called when stream ends
 * @param {Function} onError      - called on error
 * @returns {Function}            - abort function
 */
export function streamAI(opts, onChunk, onConvId, onDone, onError) {
  const ctrl = new AbortController()

  fetch(BASE + '/ai/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(opts),
    signal: ctrl.signal,
  }).then(async res => {
    if (!res.ok) {
      const e = await res.json().catch(() => ({}))
      onError(new Error(e.detail || `HTTP ${res.status}`))
      return
    }
    const reader  = res.body.getReader()
    const decoder = new TextDecoder()
    let buf = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop()
      for (const line of lines) {
        if (!line.startsWith('data:')) continue
        const raw = line.slice(5).trim()
        if (raw === '[DONE]') { onDone(); return }
        try {
          const d = JSON.parse(raw)
          if (d.error)           { onError(new Error(d.error)); return }
          if (d.conversation_id) { onConvId(d.conversation_id) }
          if (d.delta)           { onChunk(d.delta) }
        } catch { /* ignore parse errors */ }
      }
    }
    onDone()
  }).catch(e => {
    if (e.name !== 'AbortError') onError(e)
  })

  return () => ctrl.abort()
}

// ── Formatters ────────────────────────────────────────────────────────────────
export const fmt    = (n, d = 2) => n == null ? '—' : Number(n).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d })
export const fmtVol = n => { if (!n) return '—'; if (n >= 1e7) return (n/1e7).toFixed(2)+'Cr'; if (n >= 1e5) return (n/1e5).toFixed(1)+'L'; return n.toLocaleString('en-IN') }
export const fmtCr  = n => n ? `₹${n}L Cr` : '—'
export const sign   = (n, sfx='%') => n == null ? '—' : `${n >= 0 ? '+' : ''}${fmt(n)}${sfx}`
export const cls    = n => n == null ? '' : n > 0 ? 'up' : n < 0 ? 'dn' : 'neu'
export const sd     = d => new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })
export const sdFull = d => new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'2-digit' })
