/**
 * AlertsPanel — price alert management UI.
 * Set "above ₹X" or "below ₹X" alerts per stock.
 * Fires Web Notifications when triggered.
 * Part of the Analysis tab, or accessible standalone.
 */
import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { fmt, sign, cls } from '../api.js'
import { IcoBell, IcoX, IcoArrowUp, IcoArrowDown } from '../icons.jsx'

export default function AlertsPanel({ symbol }) {
  const { companies, alerts, addAlert, removeAlert, hasPermission, requestPerm,
          triggered } = useApp()

  const company   = companies.find(c => c.symbol === symbol)
  const symAlerts = alerts.filter(a => a.symbol === symbol)

  const [type,    setType   ] = useState('above')
  const [target,  setTarget ] = useState('')
  const [errMsg,  setErrMsg ] = useState('')

  const add = () => {
    setErrMsg('')
    const t = parseFloat(target)
    if (!t || t <= 0) { setErrMsg('Enter a valid price'); return }
    if (!symbol)      { setErrMsg('No symbol selected'); return }
    addAlert(symbol, type, t)
    setTarget('')
  }

  return (
    <div style={{
      background:'var(--s1)', border:'1px solid var(--b1)',
      borderRadius:'var(--rr2)', overflow:'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding:'9px 14px', borderBottom:'1px solid var(--b1)',
        display:'flex', alignItems:'center', gap:8,
      }}>
        <IcoBell size={13} stroke="var(--t2)"/>
        <span style={{ fontWeight:700, fontSize:12, color:'var(--t1)' }}>
          Price Alerts
        </span>
        <span style={{ fontSize:9, color:'var(--t4)', fontFamily:'var(--mono)',
          background:'var(--s3)', padding:'2px 6px', borderRadius:3 }}>
          {symbol}
        </span>
        {!hasPermission && (
          <button onClick={requestPerm}
            style={{
              marginLeft:'auto', fontSize:10, color:'var(--amber)',
              background:'var(--amber-bg)', border:'1px solid rgba(245,158,11,.3)',
              borderRadius:'var(--rr)', padding:'3px 9px', cursor:'pointer',
              fontFamily:'var(--ui)',
            }}>
            Enable notifications
          </button>
        )}
        {hasPermission && (
          <span style={{ marginLeft:'auto', fontSize:9, color:'var(--green)',
            fontFamily:'var(--mono)' }}>
            ✓ Notifications on
          </span>
        )}
      </div>

      <div style={{ padding:'12px 14px' }}>
        {/* Current price reference */}
        {company && (
          <div style={{
            display:'flex', gap:10, alignItems:'center',
            marginBottom:12, padding:'6px 10px',
            background:'var(--s2)', borderRadius:'var(--rr)',
            fontSize:11, fontFamily:'var(--mono)',
          }}>
            <span style={{ color:'var(--t3)' }}>Current:</span>
            <span style={{ fontWeight:700, color:'var(--t1)' }}>
              ₹{fmt(company.close)}
            </span>
            <span className={cls(company.change_pct)}>
              {sign(company.change_pct)}
            </span>
          </div>
        )}

        {/* Add alert form */}
        <div style={{ display:'flex', gap:6, marginBottom:12, alignItems:'center',
          flexWrap:'wrap' }}>
          {/* Direction toggle */}
          <div style={{ display:'flex', background:'var(--s2)',
            border:'1px solid var(--b2)', borderRadius:'var(--rr)', overflow:'hidden' }}>
            {[
              { id:'above', icon:<IcoArrowUp size={12}/>,   label:'Above' },
              { id:'below', icon:<IcoArrowDown size={12}/>, label:'Below' },
            ].map(opt => (
              <button key={opt.id}
                onClick={() => setType(opt.id)}
                style={{
                  display:'flex', alignItems:'center', gap:5,
                  padding:'5px 10px', border:'none', cursor:'pointer',
                  fontFamily:'var(--ui)', fontSize:11, fontWeight:500,
                  background: type===opt.id
                    ? (opt.id==='above' ? 'var(--green-bg)' : 'var(--red-bg)')
                    : 'transparent',
                  color: type===opt.id
                    ? (opt.id==='above' ? 'var(--green)' : 'var(--red)')
                    : 'var(--t3)',
                  transition:'all .12s',
                }}>
                {opt.icon}{opt.label}
              </button>
            ))}
          </div>

          {/* Target price */}
          <div style={{ position:'relative', flex:'1 1 120px' }}>
            <span style={{ position:'absolute', left:9, top:'50%',
              transform:'translateY(-50%)', color:'var(--t3)',
              fontFamily:'var(--mono)', fontSize:11, pointerEvents:'none' }}>
              ₹
            </span>
            <input className="input" type="number" min="0.01" step="0.01"
              placeholder="Target price"
              value={target}
              onChange={e => setTarget(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && add()}
              style={{ paddingLeft:22 }}/>
          </div>

          <button className="btn btn-primary" onClick={add}
            style={{ whiteSpace:'nowrap' }}>
            Set Alert
          </button>
        </div>

        {errMsg && (
          <div style={{ marginBottom:8, fontSize:11, color:'var(--red)',
            fontFamily:'var(--mono)' }}>{errMsg}</div>
        )}

        {/* Active alerts */}
        {symAlerts.length > 0 ? (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {symAlerts.map(a => {
              const fired = triggered.includes(a.id)
              const up    = a.type === 'above'
              return (
                <div key={a.id} style={{
                  display:'flex', alignItems:'center', gap:10,
                  padding:'8px 10px',
                  background: fired ? (up ? 'var(--green-bg)' : 'var(--red-bg)') : 'var(--s2)',
                  border:`1px solid ${fired ? (up?'var(--green-bd)':'var(--red-bd)') : 'var(--b2)'}`,
                  borderRadius:'var(--rr)', transition:'all .3s',
                }}>
                  {up
                    ? <IcoArrowUp size={13} stroke="var(--green)"/>
                    : <IcoArrowDown size={13} stroke="var(--red)"/>
                  }
                  <span style={{ fontFamily:'var(--mono)', fontSize:11,
                    color:'var(--t2)', flex:1 }}>
                    {a.type === 'above' ? 'rises above' : 'drops below'}
                    <strong style={{ color: up ? 'var(--green)' : 'var(--red)',
                      marginLeft:6 }}>₹{fmt(a.target)}</strong>
                  </span>
                  {fired && (
                    <span style={{ fontSize:9, color: up ? 'var(--green)' : 'var(--red)',
                      fontFamily:'var(--mono)', fontWeight:700 }}>TRIGGERED</span>
                  )}
                  <button className="btn-icon" onClick={() => removeAlert(a.id)}>
                    <IcoX size={12}/>
                  </button>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ fontSize:11, color:'var(--t4)', fontFamily:'var(--mono)',
            textAlign:'center', padding:'10px 0' }}>
            No alerts set for {symbol}
          </div>
        )}
      </div>
    </div>
  )
}
