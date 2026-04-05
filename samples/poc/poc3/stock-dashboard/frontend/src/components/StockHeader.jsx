import { useApp } from '../context/AppContext.jsx'
import { fmt, pctSign } from '../api.js'
import s from './StockHeader.module.css'

export default function StockHeader() {
  const { activeSummary: d } = useApp()
  if (!d) return <div className={s.hdr} />

  const up = d.change_pct >= 0

  return (
    <div className={s.hdr}>
      <div className={s.nameBlock}>
        <div className={s.sym}>{d.symbol}</div>
        <div className={s.name}>{d.name}</div>
      </div>

      <div className={s.priceBlock}>
        <div className={s.price}>₹{fmt(d.latest_close)}</div>
        <div className={`${s.chg} ${up ? s.up : s.dn}`}>
          {pctSign(d.change_pct)}
        </div>
      </div>

      <div className={s.pill}>{d.sector}</div>

      <div className={s.spacer} />

      <div className={s.kpis}>
        {[
          { l: '52W High',   v: '₹' + fmt(d.week52_high),  cls: '' },
          { l: '52W Low',    v: '₹' + fmt(d.week52_low),   cls: '' },
          { l: 'Avg Close',  v: '₹' + fmt(d.avg_close),    cls: '' },
          { l: 'Volatility', v: d.volatility_pct + '%',     cls: s.amber },
          { l: '1Y Return',  v: pctSign(d.total_return_pct), cls: d.total_return_pct >= 0 ? s.up : s.dn },
        ].map(k => (
          <div key={k.l} className={s.kpi}>
            <div className={s.kpiLabel}>{k.l}</div>
            <div className={`${s.kpiVal} ${k.cls}`}>{k.v}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
