import { useApp } from '../context/AppContext.jsx'
import { fmt, fmtCap, sign, cls } from '../api.js'
import s from './StockStats.module.css'

function StatRow({ label, value, subvalue, highlight }) {
  return (
    <div className={`${s.row} ${highlight ? s.highlight : ''}`}>
      <span className={s.label}>{label}</span>
      <div className={s.vals}>
        <span className={`${s.val} ${highlight || ''}`}>{value}</span>
        {subvalue && <span className={s.sub}>{subvalue}</span>}
      </div>
    </div>
  )
}

function GaugeBar({ val, min=0, max=100, warn=70, safe=30, label }) {
  const pct = Math.min(100, Math.max(0, (val - min) / (max - min) * 100))
  const color = val > warn ? 'var(--red)' : val < safe ? 'var(--green)' : 'var(--amber)'
  return (
    <div className={s.gauge}>
      <div className={s.gaugeHead}>
        <span className={s.gaugeLabel}>{label}</span>
        <span className={s.gaugeVal} style={{color}}>{val?.toFixed(1)}</span>
      </div>
      <div className={s.gaugeTrack}>
        <div className={s.gaugeFill} style={{width:`${pct}%`, background: color}}/>
        <div className={s.gaugeSafe} style={{left:`${safe}%`, right:`${100-warn}%`}}/>
      </div>
      <div className={s.gaugeScale}>
        <span>{min}</span><span>Oversold</span><span>Neutral</span><span>Overbought</span><span>{max}</span>
      </div>
    </div>
  )
}

export default function StockStats() {
  const { summary: d } = useApp()
  if (!d) return <div className="spin-wrap"><div className="spinner"/></div>

  const pct52 = d.week52_high && d.week52_low
    ? ((d.latest_close - d.week52_low) / (d.week52_high - d.week52_low) * 100).toFixed(1)
    : null

  return (
    <div className={s.wrap}>
      <div className={s.grid}>
        {/* Price section */}
        <div className={s.section}>
          <div className={s.sectionTitle}>Price Metrics</div>
          <StatRow label="Latest Close"   value={`₹${fmt(d.latest_close)}`} highlight={cls(d.change_pct)} />
          <StatRow label="Prev Close"     value={`₹${fmt(d.prev_close)}`} />
          <StatRow label="Change Today"   value={sign(d.change_pct)} highlight={cls(d.change_pct)} />
          <StatRow label="52W High"       value={`₹${fmt(d.week52_high)}`} highlight="up"
            subvalue={`${pct52}th pct`}/>
          <StatRow label="52W Low"        value={`₹${fmt(d.week52_low)}`}  highlight="dn"/>
          <StatRow label="Avg Close (1Y)" value={`₹${fmt(d.avg_close)}`}/>
          <StatRow label="1Y Total Return" value={sign(d.total_return_pct)} highlight={cls(d.total_return_pct)}/>
        </div>

        {/* Fundamentals */}
        <div className={s.section}>
          <div className={s.sectionTitle}>Fundamentals</div>
          <StatRow label="P/E Ratio"    value={d.pe ? `${d.pe}×` : '—'}
            subvalue={d.pe > 40 ? 'Premium' : d.pe < 15 ? 'Value' : 'Moderate'}/>
          <StatRow label="P/B Ratio"    value={d.pb ? `${d.pb}×` : '—'}/>
          <StatRow label="Dividend Yield" value={d.div_yield ? `${d.div_yield}%` : '—'} highlight={d.div_yield > 3 ? 'up' : ''}/>
          <StatRow label="Market Cap"   value={fmtCap(d.market_cap_lakh_cr)}/>
          <StatRow label="Avg Volume"   value={d.avg_volume ? d.avg_volume.toLocaleString('en-IN') : '—'}/>
          <StatRow label="Sector"       value={d.sector}/>
        </div>

        {/* Risk metrics */}
        <div className={s.section}>
          <div className={s.sectionTitle}>Risk & Momentum</div>
          <StatRow label="Ann. Volatility" value={`${d.volatility_pct}%`}
            highlight={d.volatility_pct > 30 ? 'dn' : d.volatility_pct < 15 ? 'up' : ''}
            subvalue={d.volatility_pct > 30 ? 'High risk' : d.volatility_pct < 15 ? 'Low risk' : 'Moderate'}/>
          <StatRow label="Current RSI"
            value={d.current_rsi ? d.current_rsi.toFixed(1) : '—'}
            highlight={d.current_rsi > 70 ? 'dn' : d.current_rsi < 30 ? 'up' : ''}
            subvalue={d.current_rsi > 70 ? 'Overbought' : d.current_rsi < 30 ? 'Oversold' : 'Neutral'}/>
          <StatRow label="Data Period"
            value={`${d.data_from} → ${d.data_to}`}/>
        </div>
      </div>

      {/* RSI gauge */}
      {d.current_rsi && (
        <div className={s.gaugeSection}>
          <GaugeBar val={d.current_rsi} min={0} max={100} safe={30} warn={70} label="RSI (14-period)"/>
        </div>
      )}

      {/* 52W range */}
      <div className={s.rangeSection}>
        <div className={s.rangeTitle}>52-Week Price Range</div>
        <div className={s.rangeTrack}>
          <div className={s.rangeFill} style={{width:`${pct52||50}%`}}/>
          <div className={s.rangeThumb} style={{left:`${pct52||50}%`}}/>
        </div>
        <div className={s.rangeLabels}>
          <span className="dn">₹{fmt(d.week52_low)}</span>
          <span>Current ₹{fmt(d.latest_close)} ({pct52}th pct)</span>
          <span className="up">₹{fmt(d.week52_high)}</span>
        </div>
      </div>
    </div>
  )
}
