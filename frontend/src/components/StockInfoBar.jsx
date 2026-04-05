import { useApp } from '../context/AppContext.jsx'
import { fmt, sign, cls, fmtVol } from '../api.js'

function Stat({ label, value, color }) {
  return (
    <div style={{
      display:'flex', justifyContent:'space-between', alignItems:'center',
      padding:'4px 0', borderBottom:'1px solid var(--b1)',
    }}>
      <span style={{ fontSize:10, color:'var(--t3)', letterSpacing:'.04em', textTransform:'uppercase' }}>
        {label}
      </span>
      <span style={{
        fontFamily:'var(--mono)', fontSize:11, fontWeight:500,
        color: color || 'var(--t1)',
      }}>
        {value ?? '—'}
      </span>
    </div>
  )
}

function GaugeBar({ value, min=0, max=100, label }) {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))
  const color = pct > 65 ? 'var(--g)' : pct < 35 ? 'var(--r)' : 'var(--amber)'
  return (
    <div style={{ marginBottom:9 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
        <span style={{ fontSize:9, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'.06em' }}>{label}</span>
        <span style={{ fontFamily:'var(--mono)', fontSize:10, color }}>{value?.toFixed(1) ?? '—'}</span>
      </div>
      <div style={{ height:3, background:'var(--b2)', borderRadius:99, overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:99, transition:'width .4s ease' }}/>
      </div>
    </div>
  )
}

export default function StockInfoBar() {
  const { summary:s, tab } = useApp()
  if (tab !== 'chart') return null

  return (
    <aside style={{
      width:192, flexShrink:0,
      borderLeft:'1px solid var(--b1)',
      background:'var(--s1)',
      display:'flex', flexDirection:'column',
      overflowY:'auto',
    }}>
      {!s ? (
        <div style={{ padding:14 }}>
          {[80,60,70,50,65,55].map((w,i) => (
            <div key={i} className="skeleton" style={{ height:11, width:`${w}%`, marginBottom:9 }}/>
          ))}
        </div>
      ) : (
        <div style={{ padding:'12px 12px' }}>

          {/* Stock header */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--g)', fontWeight:600, marginBottom:2 }}>
              {s.symbol}
            </div>
            <div style={{ fontSize:10, color:'var(--t3)', marginBottom:8, lineHeight:1.4 }}>
              {s.name}
            </div>
            <div style={{ fontFamily:'var(--mono)', fontSize:20, fontWeight:700, color:'var(--t1)', lineHeight:1 }}>
              ₹{fmt(s.close)}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:5 }}>
              <span className={cls(s.change_pct)}
                style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:700 }}>
                {sign(s.change_pct)}
              </span>
              <span style={{ fontSize:10, color:'var(--t3)' }}>today</span>
            </div>
          </div>

          {/* Day OHLC */}
          <div style={{
            background:'var(--s2)', border:'1px solid var(--b2)',
            borderRadius:'var(--rr)', padding:'7px 8px', marginBottom:12,
          }}>
            <div style={{ fontSize:9, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:5 }}>
              Today's Range
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 8px', fontFamily:'var(--mono)', fontSize:10 }}>
              <div><span style={{ color:'var(--t3)' }}>O</span> <span style={{ color:'var(--t1)' }}>₹{fmt(s.open)}</span></div>
              <div><span style={{ color:'var(--t3)' }}>H</span> <span style={{ color:'var(--g)' }}>₹{fmt(s.high)}</span></div>
              <div><span style={{ color:'var(--t3)' }}>L</span> <span style={{ color:'var(--r)' }}>₹{fmt(s.low)}</span></div>
              <div><span style={{ color:'var(--t3)' }}>C</span> <span style={{ color:'var(--t1)', fontWeight:600 }}>₹{fmt(s.close)}</span></div>
            </div>
          </div>

          {/* 52-week range bar */}
          {s.week52_low != null && s.week52_high != null && (() => {
            const pct = Math.max(0, Math.min(100,
              ((s.close - s.week52_low) / (s.week52_high - s.week52_low + 1e-9)) * 100
            ))
            return (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:9, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:5 }}>
                  52-Week Range
                </div>
                <div style={{ position:'relative', height:5, background:'linear-gradient(90deg,var(--r),var(--s3),var(--g))', borderRadius:99, marginBottom:4 }}>
                  <div style={{
                    position:'absolute', top:'50%', left:`${pct}%`,
                    transform:'translate(-50%,-50%)',
                    width:9, height:9, borderRadius:'50%',
                    background:'white', border:`2px solid ${pct > 50 ? 'var(--g)' : 'var(--r)'}`,
                    boxShadow:'0 0 5px rgba(0,0,0,.5)',
                    transition:'left .4s',
                  }}/>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontFamily:'var(--mono)', fontSize:9, color:'var(--t3)' }}>
                  <span style={{ color:'var(--r)' }}>₹{fmt(s.week52_low)}</span>
                  <span style={{ color:'var(--g)' }}>₹{fmt(s.week52_high)}</span>
                </div>
              </div>
            )
          })()}

          {/* Indicator gauges */}
          {s.rsi        != null && <GaugeBar value={s.rsi}       min={0} max={100} label="RSI (14)"/>}
          {s.stoch_k    != null && <GaugeBar value={s.stoch_k}   min={0} max={100} label="Stoch %K"/>}
          {s.momentum   != null && <GaugeBar value={s.momentum}  min={0} max={100} label="Momentum"/>}

          {/* Stats table */}
          <div style={{ marginTop:4 }}>
            <Stat label="1Y Return"  value={sign(s.total_return_pct)}
              color={s.total_return_pct >= 0 ? 'var(--g)' : 'var(--r)'}/>
            <Stat label="Ann. Vol"   value={s.volatility_pct != null ? s.volatility_pct+'%' : null}/>
            <Stat label="ATR"        value={s.atr ? '₹'+fmt(s.atr) : null}/>
            <Stat label="MACD"       value={s.macd != null ? fmt(s.macd,4) : null}/>
            <Stat label="Avg Volume" value={fmtVol(s.avg_volume)}/>
            <Stat label="Mkt Cap"    value={s.mktcap ? '₹'+s.mktcap+'L Cr' : null}/>
            <Stat label="P/E"        value={s.pe ? s.pe+'×' : null}/>
            <Stat label="P/B"        value={s.pb ? s.pb+'×' : null}/>
            <Stat label="Div Yield"  value={s.div_yield ? s.div_yield+'%' : null}/>
            <Stat label="Sector"     value={s.sector}/>
          </div>

          <div style={{ marginTop:10, fontSize:9, color:'var(--t4)', fontFamily:'var(--mono)', textAlign:'center', lineHeight:1.5 }}>
            {s.data_from} → {s.data_to}
          </div>
        </div>
      )}
    </aside>
  )
}
