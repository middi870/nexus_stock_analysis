const BASE = '/api'

async function get(path) {
  const res = await fetch(BASE + path)
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`)
  return res.json()
}

export const api = {
  companies:  ()              => get('/companies'),
  data:       (sym, days)     => get(`/data/${sym}?days=${days}`),
  summary:    (sym)           => get(`/summary/${sym}`),
  compare:    (s1, s2, days)  => get(`/compare?symbol1=${s1}&symbol2=${s2}&days=${days}`),
  topMovers:  (n = 5)         => get(`/top-movers?n=${n}`),
  refresh:    ()              => fetch(BASE + '/refresh', { method: 'POST' }).then(r => r.json()),

  aiChat: async ({ model, messages, system, apiKey }) => {
    const res = await fetch(BASE + '/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, system, api_key: apiKey || '' }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || `AI error ${res.status}`)
    }
    return res.json()
  },
}

export function fmt(n, decimals = 2) {
  if (n == null) return '—'
  return Number(n).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function fmtVol(n) {
  if (n >= 1e7) return (n / 1e7).toFixed(1) + ' Cr'
  if (n >= 1e5) return (n / 1e5).toFixed(1) + ' L'
  return String(n)
}

export function shortDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

export function pctClass(n) {
  return n >= 0 ? 'pos' : 'neg'
}

export function pctSign(n) {
  return n >= 0 ? `+${n}%` : `${n}%`
}
