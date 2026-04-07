/**
 * Analysis v0.2.0 — Deep dive screen.
 * #6 — News feed added below technical stats.
 * Active stock strip at top (fixes orphaned-tab UX gap).
 */
import { useApp } from '../context/AppContext.jsx'
import { fmt, sign, cls, fmtVol } from '../api.js'
import NewsPanel from './NewsPanel.jsx'

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background:'var(--s2)', border:'1px solid var(--b2)',
      borderRadius:'var(--rr2)', padding:'12px 14px' }}>
      <div style={{ fontSize:9, color:'var(--t3)', textTransform:'uppercase',
        letterSpacing:'.08em', marginBottom:4 }}>{label}</div>
      <div style={{ fontFamily:'var(--mono)', fontSize:15, fontWeight:700,
        color: color || 'var(--t1)', lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:9, color:'var(--t4)', marginTop:4, lineHeight:1.4 }}>{sub}</div>}
    </div>
  )
}

function GaugeFull({ label, value, min=0, max=100, desc }) {
  if (value == null) return null
  const pct   = Math.max(0, Math.min(100, ((value-min)/(max-min+1e-9))*100))
  const color = pct > 65 ? 'var(--green)' : pct < 35 ? 'var(--red)' : 'var(--amber)'
  const zone  = pct > 70 ? 'Overbought' : pct < 30 ? 'Oversold' : pct > 55 ? 'Bullish' : pct < 45 ? 'Bearish' : 'Neutral'
  return (
    <div style={{ background:'var(--s2)', border:'1px solid var(--b2)',
      borderRadius:'var(--rr2)', padding:'12px 14px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
        <span style={{ fontSize:10, color:'var(--t2)', fontWeight:600 }}>{label}</span>
        <span style={{ fontFamily:'var(--mono)', fontSize:14, fontWeight:700, color }}>
          {value.toFixed(1)}
        </span>
      </div>
      <div style={{ height:5, background:'var(--b1)', borderRadius:99, overflow:'hidden', marginBottom:6 }}>
        <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:99,
          transition:'width .6s ease' }}/>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize:9, color:'var(--t4)', fontFamily:'var(--mono)' }}>{min}</span>
        <span style={{ fontSize:9, color, fontWeight:600,
          background:`${color}18`, padding:'2px 8px', borderRadius:4 }}>{zone}</span>
        <span style={{ fontSize:9, color:'var(--t4)', fontFamily:'var(--mono)' }}>{max}</span>
      </div>
      {desc && <div style={{ fontSize:9, color:'var(--t4)', marginTop:6, lineHeight:1.5 }}>{desc}</div>}
    </div>
  )
}

function SectionLabel({ label }) {
  return (
    <div style={{ fontSize:9, color:'var(--t3)', textTransform:'uppercase',
      letterSpacing:'.1em', fontFamily:'var(--mono)', marginBottom:8, marginTop:4 }}>
      {label}
    </div>
  )
}

const GRID = { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:8, marginBottom:20 }
const GRID2 = { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:8, marginBottom:20 }

export default function Analysis() {
  const { activeCompany:ac, summary:s, summaryLoading, activeSym } = useApp()
  if (!ac) return null

  return (
    <div style={{ flex:1, overflowY:'auto', background:'var(--bg)', paddingBottom:24 }}>

      {/* Active stock strip — always visible so user knows what they're reading */}
      <div style={{
        padding:'10px 16px', borderBottom:'1px solid var(--b1)',
        background:'var(--s1)', flexShrink:0,
        display:'flex', alignItems:'center', gap:14, flexWrap:'wrap',
      }}>
        <div style={{ display:'flex', alignItems:'baseline', gap:10 }}>
          <span style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:700, color:'var(--green)' }}>
            {ac.symbol}
          </span>
          <span style={{ fontFamily:'var(--mono)', fontSize:20, fontWeight:700, color:'var(--t1)' }}>
            ₹{fmt(ac.close)}
          </span>
          <span className={cls(ac.change_pct)}
            style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:700 }}>
            {sign(ac.change_pct)} today
          </span>
        </div>
        <span style={{ fontSize:11, color:'var(--t3)' }}>{ac.name} · {ac.sector}</span>
      </div>

      <div style={{ padding:'14px 16px 0' }}>

        {/* ── Key metrics ── */}
        <SectionLabel label="Key Metrics"/>
        <div style={GRID}>
          <StatCard label="Close"     value={`₹${fmt(ac.close)}`}/>
          <StatCard label="Day High"  value={`₹${fmt(ac.high)}`}  color="var(--green)"/>
          <StatCard label="Day Low"   value={`₹${fmt(ac.low)}`}   color="var(--red)"/>
          <StatCard label="Open"      value={`₹${fmt(ac.open)}`}/>
          <StatCard label="Volume"    value={fmtVol(ac.volume)}/>
          <StatCard label="Mkt Cap"   value={ac.mktcap ? `₹${ac.mktcap}L Cr` : '—'}/>
          <StatCard label="P/E"       value={ac.pe ? ac.pe+'×' : '—'}/>
          <StatCard label="P/B"       value={ac.pb ? ac.pb+'×' : '—'}/>
          {ac.div_yield && <StatCard label="Div Yield" value={ac.div_yield+'%'} color="var(--amber)"/>}
        </div>

        {summaryLoading && (
          <div style={{ display:'grid', gap:8, gridTemplateColumns:'1fr 1fr', marginBottom:20 }}>
            {[1,2,3,4].map(i => <div key={i} className="skel" style={{ height:80 }}/>)}
          </div>
        )}

        {s && (<>
          {/* ── 52-Week ── */}
          <SectionLabel label="52-Week Summary"/>
          <div style={GRID}>
            <StatCard label="52W High"   value={`₹${fmt(s.week52_high)}`} color="var(--green)"/>
            <StatCard label="52W Low"    value={`₹${fmt(s.week52_low)}`}  color="var(--red)"/>
            <StatCard label="Avg Close"  value={`₹${fmt(s.avg_close)}`}/>
            <StatCard label="1Y Return"  value={sign(s.total_return_pct)}
              color={s.total_return_pct >= 0 ? 'var(--green)' : 'var(--red)'}/>
            <StatCard label="Ann. Vol"   value={s.volatility_pct ? s.volatility_pct+'%' : '—'}
              sub="Annualised std dev"/>
            <StatCard label="Avg Volume" value={fmtVol(s.avg_volume)}/>
          </div>

          {/* ── Oscillators ── */}
          <SectionLabel label="Oscillators"/>
          <div style={GRID2}>
            <GaugeFull label="RSI (14)" value={s.rsi} min={0} max={100}
              desc="14-period Relative Strength — 70+ overbought, 30− oversold"/>
            <GaugeFull label="Stochastic %K" value={s.stoch_k} min={0} max={100}
              desc="Fast stochastic oscillator (14,3)"/>
            <GaugeFull label="Momentum Score" value={s.momentum} min={0} max={100}
              desc="Composite: daily return + volume Z-score"/>
          </div>

          {/* ── Trend indicators ── */}
          <SectionLabel label="Trend Indicators"/>
          <div style={GRID}>
            <StatCard label="MACD"      value={s.macd != null ? fmt(s.macd,4) : '—'}
              color={s.macd > 0 ? 'var(--green)' : 'var(--red)'}/>
            <StatCard label="Signal"    value={s.macd_signal != null ? fmt(s.macd_signal,4) : '—'}/>
            <StatCard label="Histogram" value={s.macd_hist != null ? fmt(s.macd_hist,4) : '—'}
              color={s.macd_hist > 0 ? 'var(--green)' : 'var(--red)'}/>
            <StatCard label="ATR (14)"  value={s.atr ? `₹${fmt(s.atr)}` : '—'}
              sub="Average true range"/>
            <StatCard label="BB Upper"  value={s.bb_up ? `₹${fmt(s.bb_up)}` : '—'}
              color="var(--blue)"/>
            <StatCard label="BB Lower"  value={s.bb_dn ? `₹${fmt(s.bb_dn)}` : '—'}
              color="var(--blue)"/>
            <StatCard label="BB Width"  value={s.bb_width ? s.bb_width+'%' : '—'}/>
            <StatCard label="VWAP"      value={s.vwap ? `₹${fmt(s.vwap)}` : '—'}/>
          </div>

          {/* ── Position ── */}
          <SectionLabel label="Position vs Extremes"/>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:24 }}>
            <StatCard label="From 52W High"
              value={s.dist_52h != null ? `${s.dist_52h.toFixed(1)}%` : '—'}
              color={Math.abs(s.dist_52h||0) < 5 ? 'var(--green)' : 'var(--amber)'}
              sub="0% = at annual peak"/>
            <StatCard label="From 52W Low"
              value={s.dist_52l != null ? `+${s.dist_52l.toFixed(1)}%` : '—'}
              color="var(--blue)"
              sub="Higher = further above annual low"/>
          </div>
        </>)}

        {/* ── #6 News Feed ── */}
        <SectionLabel label="News &amp; Headlines"/>
        <NewsPanel symbol={activeSym}/>
      </div>
    </div>
  )
}
