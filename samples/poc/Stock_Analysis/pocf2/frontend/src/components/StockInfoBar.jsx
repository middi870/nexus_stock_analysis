import { useApp } from '../context/AppContext.jsx'
import { fmt, sign, cls, fmtCr } from '../api.js'
import s from './StockInfoBar.module.css'

function KpiItem({ label, value, colorClass, mono=true }) {
  return (
    <div className={s.kpi}>
      <div className={s.kpiLabel}>{label}</div>
      <div className={`${s.kpiVal} ${mono?s.mono:''} ${colorClass||''}`}>{value}</div>
    </div>
  )
}

function RangeBar({ low, high, current }) {
  const span = high - low || 1
  const pct  = Math.min(100, Math.max(0, (current - low) / span * 100)).toFixed(1)
  return (
    <div className={s.range}>
      <div className={s.rangeBar}>
        <div className={s.rangeFill} style={{ width:`${pct}%` }}/>
        <div className={s.rangeThumb} style={{ left:`${pct}%` }}/>
      </div>
      <div className={s.rangeLabels}>
        <span className="dn">₹{fmt(low,0)}</span>
        <span className={s.rangeCenter}>52-week range · {pct}th pct</span>
        <span className="up">₹{fmt(high,0)}</span>
      </div>
    </div>
  )
}

export default function StockInfoBar() {
  const { summary: d } = useApp()
  if (!d) return <div className={s.bar}/>

  const rsiColor = d.rsi > 70 ? s.dn : d.rsi < 30 ? s.up : ''
  const macdUp   = (d.macd || 0) > 0

  return (
    <div className={s.bar}>
      {/* Primary price block */}
      <div className={s.priceBlock}>
        <div className={s.symLine}>
          <span className={s.sym}>{d.symbol}</span>
          <span className={s.secBadge}>{d.sector}</span>
        </div>
        <div className={s.nameLine}>{d.name}</div>
        <div className={s.priceRow}>
          <span className={`${s.price} ${d.change_pct >= 0 ? s.up : s.dn}`}>
            ₹{fmt(d.close)}
          </span>
          <span className={`badge ${d.change_pct >= 0 ? 'badge-up' : 'badge-dn'}`}>
            {sign(d.change_pct)}
          </span>
          <span className={s.prevClose}>prev ₹{fmt(d.prev_close)}</span>
        </div>
      </div>

      <div className={s.divider}/>

      {/* OHLV today */}
      <div className={s.section}>
        <div className={s.sectionTitle}>Today</div>
        <div className={s.kpiGrid}>
          <KpiItem label="Open"   value={`₹${fmt(d.open)}`}/>
          <KpiItem label="High"   value={`₹${fmt(d.high)}`}   colorClass={s.up}/>
          <KpiItem label="Low"    value={`₹${fmt(d.low)}`}    colorClass={s.dn}/>
          <KpiItem label="Volume" value={`${(d.avg_volume/1e5).toFixed(1)}L avg`}/>
        </div>
      </div>

      <div className={s.divider}/>

      {/* Indicators */}
      <div className={s.section}>
        <div className={s.sectionTitle}>Indicators</div>
        <div className={s.kpiGrid}>
          <KpiItem label="RSI 14"   value={d.rsi?.toFixed(1) || '—'}  colorClass={rsiColor}/>
          <KpiItem label="MACD"     value={d.macd?.toFixed(2) || '—'} colorClass={macdUp ? s.up : s.dn}/>
          <KpiItem label="Stoch %K" value={d.stoch_k?.toFixed(1)||'—'}/>
          <KpiItem label="ATR"      value={d.atr?.toFixed(1)||'—'}/>
          <KpiItem label="Momentum" value={d.momentum?.toFixed(0)||'—'}/>
          <KpiItem label="Volatility" value={`${d.volatility_pct}%`}
            colorClass={d.volatility_pct > 30 ? s.dn : d.volatility_pct < 15 ? s.up : ''}/>
        </div>
      </div>

      <div className={s.divider}/>

      {/* Fundamentals */}
      <div className={s.section}>
        <div className={s.sectionTitle}>Fundamentals</div>
        <div className={s.kpiGrid}>
          <KpiItem label="P/E"      value={d.pe ? `${d.pe}×` : '—'}
            colorClass={d.pe > 50 ? s.dn : d.pe < 15 ? s.up : ''}/>
          <KpiItem label="P/B"      value={d.pb ? `${d.pb}×` : '—'}/>
          <KpiItem label="Div Yield" value={d.div_yield ? `${d.div_yield}%` : '—'}
            colorClass={d.div_yield > 3 ? s.up : ''}/>
          <KpiItem label="Mkt Cap"  value={fmtCr(d.mktcap)}/>
          <KpiItem label="1Y Return" value={sign(d.total_return_pct)}
            colorClass={cls(d.total_return_pct)}/>
          <KpiItem label="Avg Vol"  value={`${(d.avg_volume/1e5).toFixed(1)}L`}/>
        </div>
      </div>

      <div className={s.divider}/>

      {/* 52W range */}
      <div className={s.rangeSection}>
        <RangeBar low={d.week52_low} high={d.week52_high} current={d.close}/>
      </div>
    </div>
  )
}
