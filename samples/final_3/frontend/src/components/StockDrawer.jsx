/**
 * StockDrawer — slide-up stock picker for mobile/tablet.
 * Has search + sector filter + scrollable stock list.
 */
import { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { fmt, sign, cls } from '../api.js'
import { IcoSearch, IcoX } from '../icons.jsx'

const SECTOR_DOT = {
  IT:'#4080FF', Banking:'#9D7EFF', Finance:'#7B63E0',
  Energy:'#FF7B3A', FMCG:'#00C98A', Auto:'#F5C542',
  Pharma:'#00C4D4', Infra:'#F472B6', Materials:'#60A5FA',
  Utilities:'#34D399', Conglomerate:'#F5A623',
}

export default function StockDrawer() {
  const { companies, activeSym, selectSymbol, drawerOpen, setDrawerOpen } = useApp()
  const [query,  setQuery ] = useState('')
  const [sector, setSector] = useState('All')
  const inputRef = useRef(null)

  useEffect(() => {
    if (drawerOpen) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 200)
    }
  }, [drawerOpen])

  if (!drawerOpen) return null

  const sectors  = ['All', ...new Set(companies.map(c => c.sector))]
  const filtered = companies.filter(c => {
    const q = query.toLowerCase()
    if (sector !== 'All' && c.sector !== sector) return false
    return !q || c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
  })

  return (
    <>
      {/* Backdrop */}
      <div className="drawer-overlay" onClick={() => setDrawerOpen(false)}/>

      {/* Drawer */}
      <div className="drawer">
        <div className="drawer-handle"/>

        {/* Header */}
        <div style={{ padding:'0 14px 10px', flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <span style={{ fontWeight:700, fontSize:14, color:'var(--t1)' }}>
              Select Stock
            </span>
            <button onClick={() => setDrawerOpen(false)}
              style={{ background:'none', border:'none', cursor:'pointer',
                color:'var(--t3)', display:'flex', padding:4 }}>
              <IcoX width={18} height={18}/>
            </button>
          </div>

          {/* Search */}
          <div style={{ position:'relative', marginBottom:10 }}>
            <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)',
              color:'var(--t3)', pointerEvents:'none', display:'flex' }}>
              <IcoSearch width={14} height={14}/>
            </span>
            <input ref={inputRef} className="input"
              style={{ paddingLeft:32, fontSize:14, height:42 }}
              placeholder="Search by name or symbol…"
              value={query} onChange={e => setQuery(e.target.value)}/>
          </div>

          {/* Sectors */}
          <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
            {sectors.map(s => (
              <button key={s} onClick={() => setSector(s)}
                style={{
                  fontSize:10, padding:'3px 9px', borderRadius:99,
                  border:'none', cursor:'pointer', fontWeight:500,
                  background: sector===s ? 'var(--gd)' : 'var(--s3)',
                  color:      sector===s ? 'var(--g)'  : 'var(--t3)',
                  transition:'all .12s',
                }}>{s}</button>
            ))}
          </div>
        </div>

        {/* Stock list */}
        <div style={{ flex:1, overflowY:'auto', paddingBottom:8 }}>
          {filtered.map(c => {
            const active = c.symbol === activeSym
            return (
              <button key={c.symbol}
                onClick={() => selectSymbol(c.symbol)}
                style={{
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                  width:'100%', padding:'11px 16px', textAlign:'left',
                  background: active ? 'var(--s3)' : 'transparent',
                  borderLeft: `3px solid ${active ? 'var(--g)' : 'transparent'}`,
                  borderRight:'none', borderTop:'none',
                  borderBottom:'1px solid var(--b1)',
                  cursor:'pointer', transition:'background .1s',
                  fontFamily:'var(--ui)',
                }}
              >
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', flexShrink:0,
                    background: SECTOR_DOT[c.sector] || 'var(--t4)' }}/>
                  <div>
                    <div style={{ fontFamily:'var(--mono)', fontSize:13, fontWeight:700,
                      color: active ? 'var(--g)' : 'var(--t1)' }}>{c.symbol}</div>
                    <div style={{ fontSize:11, color:'var(--t3)', marginTop:1 }}>{c.name}</div>
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontFamily:'var(--mono)', fontSize:13, fontWeight:600,
                    color:'var(--t1)' }}>₹{fmt(c.close)}</div>
                  <div className={cls(c.change_pct)}
                    style={{ fontFamily:'var(--mono)', fontSize:11, fontWeight:600 }}>
                    {sign(c.change_pct)}
                  </div>
                </div>
              </button>
            )
          })}
          {filtered.length === 0 && (
            <div style={{ padding:32, textAlign:'center', color:'var(--t4)',
              fontSize:12, fontFamily:'var(--mono)' }}>No stocks found</div>
          )}
        </div>
      </div>
    </>
  )
}
