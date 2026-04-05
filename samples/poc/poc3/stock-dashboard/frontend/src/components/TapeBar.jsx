import { useApp } from '../context/AppContext.jsx'
import { fmt, pctSign } from '../api.js'
import s from './TapeBar.module.css'

export default function TapeBar() {
  const { companies } = useApp()
  if (!companies.length) return <div className={s.tape} />

  const items = [...companies, ...companies].map((c, i) => {
    const up = (c.change_pct || 0) >= 0
    return (
      <span key={i} className={s.item}>
        <span className={s.sym}>{c.symbol}</span>
        <span className={s.price}>₹{fmt(c.latest_close)}</span>
        <span className={up ? s.up : s.dn}>
          {up ? '▲' : '▼'} {Math.abs(c.change_pct || 0)}%
        </span>
      </span>
    )
  })

  return (
    <div className={s.tape}>
      <div className={s.inner}>{items}</div>
    </div>
  )
}
