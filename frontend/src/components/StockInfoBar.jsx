import { useApp } from '../context/AppContext.jsx'
import { fmt, sign, cls, fmtVol } from '../api.js'

function Row({ label, value, valCls, mono = true }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '4px 0', borderBottom: '1px solid var(--b1)',
    }}>
      <span style={{ fontSize: 10, color: 'var(--t3)', textTransform:'uppercase', letterSpacing:'.06em' }}>
        {label}
      </span>
      <span style={{
        fontSize: 11, fontFamily: mono ? 'var(--mono)' : 'var(--ui)',
        color: valCls ? `var(--${valCls})` : 'var(--t1)',
        fontWeight: 500,
      }}>
        {value}
      </span>
    </div>
  )
}

function Gauge({ value, min = 0, max = 100, label, lowColor='var(--r)', highColor='var(--g)' }) {
  const pct   = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))
  const color = pct > 60 ? highColor : pct < 40 ? lowColor : 'var(--amber)'
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
        <span style={{ fontSize:10, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'.06em' }}>{label}</span>
        <span style={{ fontSize:11, fontFamily:'var(--mono)', color }}>{value?.toFixed(1) ?? '—'}</span>
      </div>
      <div style={{ height:4, background:'var(--b2)', borderRadius:99, overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:99, transition:'width .5s' }}/>
      </div>
    </div>
  )
}

function BBWidget({ s }) {
  if (!s?.bb_up || !s?.bb_dn) return null
  const pct = s.bb_pct_b ?? 50
  const pos  = Math.max(0, Math.min(100, pct))
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
        <span style={{ fontSize:10, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'.06em' }}>BB %B</span>
        <span style={{ fontSize:11, fontFamily:'var(--mono)', color:'var(--blue)' }}>{pct?.toFixed(1)}%</span>
      </div>
      <div style={{ position:'relative', height:6, background:`linear-gradient(90deg, var(--r), var(--s3), var(--g))`, borderRadius:99 }}>
        <div style={{
          position:'absolute', top:'50%', left:`${pos}%`,
          transform:'translate(-50%,-50%)',
          width:10, height:10, borderRadius:'50%',
          background:'white', border:'2px solid var(--blue)',
          boxShadow:'0 0 6px rgba(77,159,255,.6)',
          transition:'left .4s',
        }}/>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:3 }}>
        <span style={{ fontSize:9, color:'var(--r)', fontFamily:'var(--mono)' }}>₹{fmt(s.bb_dn)}</span>
        <span style={{ fontSize:9, color:'var(--blue)', fontFamily:'var(--mono)' }}>₹{fmt(s.vwap)}</span>
        <span style={{ fontSize:9, color:'var(--g)',  fontFamily:'var(--mono)' }}>₹{fmt(s.bb_up)}</span>
      </div>
    </div>
  )
}

export default function StockInfoBar() {
  const { summary: s, tab } = useApp()
  if (tab !== 'chart') return null

  return (
    <aside style={{
      width: 200, flexShrink: 0,
      borderLeft: '1px solid var(--b1)',
      background: 'var(--s1)',
      display: 'flex', flexDirection: 'column',
      overflowY: 'auto', overflowX: 'hidden',
    }}>
      {!s ? (
        <div style={{ padding:16 }}>
          {[80,60,70,50,65].map((w,i) => (
            <div key={i} className="skeleton" style={{ height:12, width:`${w}%`, marginBottom:8 }}/>
          ))}
        </div>
      ) : (
        <div style={{ padding:'10px 12px' }}>
          {/* Header */}
          <div style={{ marginBottom:12 }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:13, color:'var(--g)', fontWeight:600 }}>{s.symbol}</div>
            <div style={{ fontSize:10, color:'var(--t3)', marginBottom:6, lineHeight:1.4 }}>{s.name}</div>
            <div style={{ fontFamily:'var(--mono)', fontSize:18, fontWeight:700, color:'var(--t1)' }}>₹{fmt(s.close)}</div>
            <div style={{ display:'flex', gap:8, marginTop:4, alignItems:'center' }}>
              <span className={cls(s.change_pct)} style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:600 }}>
                {sign(s.change_pct)}
              </span>
              <span style={{ fontSize:10, color:'var(--t3)' }}>vs prev close</span>
            </div>
          </div>

          {/* OHLC */}
          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:10, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:4 }}>Day Range</div>
            <div style={{ display:'flex', gap:8, fontFamily:'var(--mono)', fontSize:11 }}>
              <span style={{color:'var(--r)'}}>L ₹{fmt(s.low)}</span>
              <span style={{color:'var(--t3)'}}>·</span>
              <span style={{color:'var(--g)'}}>H ₹{fmt(s.high)}</span>
            </div>
          </div>

          {/* 52W range bar */}
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:10, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:4 }}>52W Range</div>
            {(() => {
              const lo = s.week52_low, hi = s.week52_high, cl = s.close
              const pct = ((cl - lo) / (hi - lo + 1e-9)) * 100
              return (
                <>
                  <div style={{ height:4, background:'var(--b2)', borderRadius:99, position:'relative', marginBottom:4 }}>
                    <div style={{ position:'absolute', left:`${pct}%`, top:-2, width:8, height:8,
                      background:'var(--g)', borderRadius:'50%', transform:'translateX(-50%)',
                      boxShadow:'0 0 6px var(--gh)', transition:'left .4s' }}/>
                    <div style={{ width:`${pct}%`, height:'100%', background:'linear-gradient(90deg,var(--r),var(--g))', borderRadius:99 }}/>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, fontFamily:'var(--mono)', color:'var(--t3)' }}>
                    <span>₹{fmt(lo)}</span><span>₹{fmt(hi)}</span>
                  </div>
                </>
              )
            })()}
          </div>

          {/* Indicators */}
          <Gauge value={s.rsi} min={0} max={100} label="RSI (14)"
            lowColor="var(--r)" highColor="var(--g)"/>
          <Gauge value={s.stoch_k} min={0} max={100} label="Stoch %K"/>
          <Gauge value={s.momentum} min={0} max={100} label="Momentum" highColor="var(--blue)" lowColor="var(--r)"/>
          <BBWidget s={s}/>

          {/* Stats */}
          <div style={{ marginTop:4 }}>
            <Row label="1Y Return"   value={sign(s.total_return_pct)}  valCls={s.total_return_pct >= 0 ? 'g' : 'r'}/>
            <Row label="Ann. Vol"    value={s.volatility_pct != null ? s.volatility_pct+'%' : '—'}/>
            <Row label="ATR (14)"    value={s.atr ? '₹'+fmt(s.atr) : '—'}/>
            <Row label="MACD"        value={s.macd != null ? fmt(s.macd, 4) : '—'}/>
            <Row label="Avg Vol"     value={fmtVol(s.avg_volume)}/>
            <Row label="Mkt Cap"     value={s.mktcap ? '₹'+s.mktcap+'L Cr' : '—'} mono={false}/>
            <Row label="P/E"         value={s.pe ? s.pe+'×' : '—'}/>
            <Row label="P/B"         value={s.pb ? s.pb+'×' : '—'}/>
            <Row label="Div Yield"   value={s.div_yield ? s.div_yield+'%' : '—'}/>
            <Row label="52W High"    value={'₹'+fmt(s.week52_high)}  valCls="g"/>
            <Row label="52W Low"     value={'₹'+fmt(s.week52_low)}   valCls="r"/>
            <Row label="Sector"      value={s.sector} mono={false}/>
          </div>

          {/* Data range */}
          <div style={{ marginTop:10, fontSize:9, color:'var(--t4)', fontFamily:'var(--mono)', textAlign:'center' }}>
            Data: {s.data_from} → {s.data_to}
          </div>
        </div>
      )}
    </aside>
  )
}
