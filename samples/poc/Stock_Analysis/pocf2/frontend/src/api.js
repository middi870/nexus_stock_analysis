/**
 * PULSE v2 API Layer
 * Features: request deduplication, stale-while-revalidate cache,
 * exponential-backoff retry, abort-controller cancellation, SSE streaming.
 */

const BASE = '/api'

// ── Cache ─────────────────────────────────────────────────────────────────────
const CACHE = new Map()           // key → { data, ts }
const IN_FLIGHT = new Map()        // key → Promise (dedup)
const TTL = { companies:30000, data:60000, summary:30000, movers:20000, sectors:30000 }

function cacheKey(path) { return path }

async function fetchWithRetry(path, options={}, retries=2) {
  let lastErr
  for (let i=0; i<=retries; i++) {
    try {
      const r = await fetch(BASE + path, { signal: options.signal, ...options })
      if (!r.ok) {
        const err = await r.json().catch(()=>({}))
        throw new Error(err.detail || `HTTP ${r.status}`)
      }
      return await r.json()
    } catch(e) {
      if (e.name === 'AbortError') throw e
      lastErr = e
      if (i < retries) await new Promise(r => setTimeout(r, 500 * 2**i))
    }
  }
  throw lastErr
}

async function get(path, ttl=0, signal=null) {
  const key = cacheKey(path)

  // Stale-while-revalidate: return cache immediately if fresh
  const cached = CACHE.get(key)
  if (cached && ttl && Date.now() - cached.ts < ttl) return cached.data

  // Deduplicate in-flight requests
  if (IN_FLIGHT.has(key)) return IN_FLIGHT.get(key)

  const promise = fetchWithRetry(path, { signal })
    .then(data => {
      CACHE.set(key, { data, ts: Date.now() })
      IN_FLIGHT.delete(key)
      return data
    })
    .catch(e => {
      IN_FLIGHT.delete(key)
      // Return stale cache on error
      if (CACHE.has(key)) return CACHE.get(key).data
      throw e
    })

  IN_FLIGHT.set(key, promise)
  return promise
}

async function post(path, body, signal=null) {
  const r = await fetch(BASE + path, {
    method:'POST', signal,
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(body)
  })
  if (!r.ok) { const e=await r.json().catch(()=>({})); throw new Error(e.detail||`HTTP ${r.status}`) }
  return r.json()
}

export function invalidate(pattern) {
  for (const key of CACHE.keys()) {
    if (key.includes(pattern)) CACHE.delete(key)
  }
}

export const api = {
  companies: (sig)         => get('/companies',           TTL.companies, sig),
  data:      (sym,days,sig)=> get(`/data/${sym}?days=${days}`, TTL.data, sig),
  summary:   (sym,sig)     => get(`/summary/${sym}`,      TTL.summary, sig),
  compare:   (s1,s2,d,sig) => get(`/compare?symbol1=${s1}&symbol2=${s2}&days=${d}`, TTL.data, sig),
  movers:    (n=7,sig)     => get(`/movers?n=${n}`,       TTL.movers, sig),
  sectors:   (sig)         => get('/sectors',             TTL.sectors, sig),
  screener:  (params,sig)  => get('/screener?'+new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v])=>v!=null&&v!==''))), 0, sig),
  heatmap:   (sig)         => get('/heatmap',             TTL.movers, sig),
  providers: ()            => get('/providers',           3600000),
  refresh:   ()            => post('/refresh', {}),
  aiChat:    (body,sig)    => post('/ai/chat', body, sig),
}

// ── SSE Streaming ─────────────────────────────────────────────────────────────
export function streamAI({ provider, model, messages, system, api_key='' }, onChunk, onDone, onError) {
  const ctrl = new AbortController()

  fetch(BASE + '/ai/stream', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ provider, model, messages, system, api_key }),
    signal: ctrl.signal,
  }).then(async res => {
    if (!res.ok) {
      const e = await res.json().catch(()=>({}))
      onError(new Error(e.detail || `HTTP ${res.status}`))
      return
    }
    const reader = res.body.getReader()
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
          if (d.error) { onError(new Error(d.error)); return }
          if (d.delta) onChunk(d.delta)
        } catch {}
      }
    }
    onDone()
  }).catch(e => {
    if (e.name !== 'AbortError') onError(e)
  })

  return () => ctrl.abort()
}

// ── Formatters ────────────────────────────────────────────────────────────────
export const fmt   = (n,d=2) => n==null?'—':Number(n).toLocaleString('en-IN',{minimumFractionDigits:d,maximumFractionDigits:d})
export const fmtK  = (n) => { if(!n)return'—'; if(n>=1e7)return(n/1e7).toFixed(1)+'Cr'; if(n>=1e5)return(n/1e5).toFixed(1)+'L'; return n.toLocaleString('en-IN') }
export const fmtCr = (n) => n?`₹${n}L Cr`:'—'
export const sign  = (n,sfx='%') => n==null?'—':`${n>=0?'+':''}${fmt(n)}${sfx}`
export const cls   = (n) => n==null?'':n>0?'up':n<0?'dn':'neu'
export const sd    = (d) => new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})
export const sdFull= (d) => new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'})
