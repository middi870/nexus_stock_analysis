/**
 * InfoBar — right panel (desktop only).
 * LOADS INSTANTLY from activeCompany (companies array).
 * Enriches with deeper metrics once summary arrives in background.
 */
import { useApp } from '../context/AppContext.jsx'
import { fmt, sign, cls, fmtVol } from '../api.js'

function Row({ label, value, color }) {
  return (
    <div style={{
      display:'flex', justifyContent:'space-between', alignItems:'center',
      padding:'4px 0', borderBottom:'1px solid rgba(255,255,255,.04)',
    }}>
      <span style={{ fontSize:9, color:'var(--t3)', textTransform:'uppercase',
        letterSpacing:'.07em', flexShrink:0 }}>{label}</span>
      <span style={{ fontFamily:'var(--mono)', fontSize:11, fontWeight:500,
        color: color || 'var(--t1)', marginLeft:6, textAlign:'right' }}>
        {value ?? '—'}
      </span>
    </div>
  )
}

function GaugeBar({ label, value, min=0, max=100 }) {
  if (value == null) return null
  const pct   = Math.max(0, Math.min(100, ((value-min)/(max-min+1e-9))*100))
  const color = pct > 65 ? 'var(--g)' : pct < 35 ? 'var(--r)' : 'var(--amber)'
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
        <span style={{ fontSize:9, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'.07em' }}>
          {label}
        </span>
        <span style={{ fontFamily:'var(--mono)', fontSize:10, color }}>{value.toFixed(1)}</span>
      </div>
      <div style={{ height:3, background:'var(--b2)', borderRadius:99, overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:99,
          transition:'width .5s ease' }}/>
      </div>
    </div>
  )
}

export default function InfoBar() {
  const { activeCompany: ac, summary: s, summaryLoading, tab } = useApp()

  // Only show on chart tab
  if (tab !== 'chart') return null

  // If no company loaded yet, show nothing
  if (!ac) return (
    <aside className="infobar-shell" style={panelStyle}>
      <div style={{ padding:14 }}>
        {[80,60,70,50].map((w,i)=>(
          <div key={i} className="skel" style={{ height:11, width:`${w}%`, marginBottom:10 }}/>
        ))}
      </div>
    </aside>
  )

  // Show instantly from companies data; supplement with summary when ready
  const close     = ac.close
  const prevClose = ac.prev_close
  const changeP   = ac.change_pct
  const lo52      = s?.week52_low
  const hi52      = s?.week52_high
  const pct52     = (lo52 && hi52) ? Math.max(0,Math.min(100,((close-lo52)/(hi52-lo52+1e-9))*100)) : null

  return (
    <aside className="infobar-shell" style={panelStyle}>
      <div style={{ overflowY:'auto', flex:1 }}>
        <div style={{ padding:'12px 12px 8px' }}>

          {/* Symbol + Price — instant */}
          <div style={{ marginBottom:14 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
              <span style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:700, color:'var(--g)' }}>
                {ac.symbol}
              </span>
              <span style={{ fontSize:9, color:'var(--t4)', background:'var(--s3)',
                padding:'2px 6px', borderRadius:3, fontFamily:'var(--mono)' }}>
                {ac.sector}
              </span>
            </div>
            <div style={{ fontFamily:'var(--mono)', fontSize:22, fontWeight:700,
              color:'var(--t1)', lineHeight:1, marginBottom:5 }}>
              ₹{fmt(close)}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span className={cls(changeP)}
                style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:700 }}>
                {sign(changeP)}
              </span>
              {prevClose && (
                <span style={{ fontSize:10, color:'var(--t3)', fontFamily:'var(--mono)' }}>
                  vs ₹{fmt(prevClose)}
                </span>
              )}
            </div>
          </div>

          {/* OHLC — instant */}
          <div style={{ background:'var(--s2)', borderRadius:'var(--rr)', padding:'8px 10px', marginBottom:12 }}>
            <div style={{ fontSize:9, color:'var(--t3)', textTransform:'uppercase',
              letterSpacing:'.08em', marginBottom:6 }}>Today</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 8px',
              fontFamily:'var(--mono)', fontSize:10 }}>
              <div><span style={{color:'var(--t3)'}}>O</span>&nbsp;<span>₹{fmt(ac.open)}</span></div>
              <div><span style={{color:'var(--g)' }}>H</span>&nbsp;<span style={{color:'var(--g)'}}>₹{fmt(ac.high)}</span></div>
              <div><span style={{color:'var(--r)' }}>L</span>&nbsp;<span style={{color:'var(--r)'}}>₹{fmt(ac.low)}</span></div>
              <div><span style={{color:'var(--t3)'}}>C</span>&nbsp;<span style={{fontWeight:600}}>₹{fmt(close)}</span></div>
            </div>
          </div>

          {/* 52W range — from summary (shows when ready) */}
          {pct52 !== null ? (
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:9, color:'var(--t3)', textTransform:'uppercase',
                letterSpacing:'.08em', marginBottom:5 }}>52-Week Range</div>
              <div style={{ position:'relative', height:5, borderRadius:99,
                background:'linear-gradient(90deg,var(--r) 0%,var(--s4) 50%,var(--g) 100%)',
                marginBottom:4 }}>
                <div style={{
                  position:'absolute', top:'50%', left:`${pct52}%`,
                  transform:'translate(-50%,-50%)',
                  width:9, height:9, borderRadius:'50%',
                  background:'white', border:`2px solid ${pct52>50?'var(--g)':'var(--r)'}`,
                  boxShadow:'0 1px 6px rgba(0,0,0,.5)', transition:'left .4s',
                }}/>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between',
                fontFamily:'var(--mono)', fontSize:9, color:'var(--t3)' }}>
                <span style={{color:'var(--r)'}}>₹{fmt(lo52)}</span>
                <span style={{color:'var(--g)'}}>₹{fmt(hi52)}</span>
              </div>
            </div>
          ) : summaryLoading ? (
            <div className="skel" style={{ height:30, marginBottom:14 }}/>
          ) : null}

          {/* Indicator gauges — from summary */}
          {s ? (
            <>
              <GaugeBar label="RSI (14)"  value={s.rsi}      min={0} max={100}/>
              <GaugeBar label="Stoch %K"  value={s.stoch_k}  min={0} max={100}/>
              <GaugeBar label="Momentum"  value={s.momentum} min={0} max={100}/>
            </>
          ) : summaryLoading ? (
            [1,2,3].map(i=>(
              <div key={i} className="skel" style={{ height:22, marginBottom:12 }}/>
            ))
          ) : null}

          {/* Stats — mix of instant + lazy */}
          <div style={{ marginTop:4 }}>
            <Row label="Volume"    value={fmtVol(ac.volume)}/>
            <Row label="Mkt Cap"   value={ac.mktcap ? '₹'+ac.mktcap+'L Cr' : null}/>
            <Row label="P/E"       value={ac.pe ? ac.pe+'×' : null}/>
            <Row label="P/B"       value={ac.pb ? ac.pb+'×' : null}/>
            <Row label="Div Yield" value={ac.div_yield ? ac.div_yield+'%' : null}/>
            {s && <>
              <Row label="1Y Return" value={sign(s.total_return_pct)}
                color={s.total_return_pct>=0?'var(--g)':'var(--r)'}/>
              <Row label="Ann. Vol"  value={s.volatility_pct ? s.volatility_pct+'%' : null}/>
              <Row label="ATR"       value={s.atr ? '₹'+fmt(s.atr) : null}/>
              <Row label="MACD"      value={s.macd != null ? fmt(s.macd,4) : null}/>
            </>}
          </div>

          {s && (
            <div style={{ marginTop:10, fontSize:8, color:'var(--t4)',
              fontFamily:'var(--mono)', textAlign:'center', lineHeight:1.6 }}>
              {s.data_from} → {s.data_to}
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

const panelStyle = {
  width:'var(--infobar-w)', flexShrink:0,
  borderLeft:'1px solid var(--b1)',
  background:'var(--s1)',
  display:'flex', flexDirection:'column',
  overflow:'hidden',
}
