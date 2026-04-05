const B = '/api'
const get = async (p) => { const r = await fetch(B + p); if (!r.ok) throw new Error(`${r.status} ${r.statusText}`); return r.json() }
const post = async (p, body) => { const r = await fetch(B + p, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) }); if (!r.ok) { const e = await r.json().catch(()=>({})); throw new Error(e.detail || `${r.status}`) } return r.json() }

export const api = {
  companies: ()              => get('/companies'),
  data:      (sym, days)     => get(`/data/${sym}?days=${days}`),
  summary:   (sym)           => get(`/summary/${sym}`),
  compare:   (s1, s2, days)  => get(`/compare?symbol1=${s1}&symbol2=${s2}&days=${days}`),
  movers:    (n=6)           => get(`/movers?n=${n}`),
  sectors:   ()              => get('/sectors'),
  providers: ()              => get('/providers'),
  refresh:   ()              => post('/refresh', {}),
  aiChat:    (body)          => post('/ai/chat', body),
}

export const fmt  = (n, d=2) => n == null ? '—' : Number(n).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d })
export const fmtK = (n) => { if (!n) return '—'; if (n >= 1e7) return (n/1e7).toFixed(1)+'Cr'; if (n >= 1e5) return (n/1e5).toFixed(1)+'L'; return String(n) }
export const fmtCap = (n) => n ? `₹${n}L Cr` : '—'
export const sign = (n) => n == null ? '—' : `${n >= 0 ? '+' : ''}${fmt(n)}%`
export const cls  = (n) => n == null ? '' : n >= 0 ? 'up' : 'dn'
export const sd   = (d) => new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })
