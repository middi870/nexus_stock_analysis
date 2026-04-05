import { useMemo, useState, useCallback } from 'react'
import { fmt, fmtK, sd } from '../api.js'
import s from './CandleChart.module.css'

const PAD = { top:12, right:72, bottom:32, left:4 }

function useTooltip() {
  const [tip, setTip] = useState(null)
  const show = useCallback((d, x, y) => setTip({ d, x, y }), [])
  const hide  = useCallback(() => setTip(null), [])
  return { tip, show, hide }
}

export default function CandleChart({ data, width=900, height=360, volumeHeight=70 }) {
  const { tip, show, hide } = useTooltip()
  const chartH = height - volumeHeight - 8

  const { priceMin, priceMax, candles, volMax } = useMemo(() => {
    if (!data.length) return { priceMin:0, priceMax:1, candles:[], volMax:1 }
    const lows   = data.map(d=>d.low).filter(Boolean)
    const highs  = data.map(d=>d.high).filter(Boolean)
    const rawMin = Math.min(...lows)
    const rawMax = Math.max(...highs)
    const pad    = (rawMax - rawMin) * 0.04
    const pMin   = rawMin - pad
    const pMax   = rawMax + pad
    const volMax = Math.max(...data.map(d=>d.volume||0))
    const W      = width - PAD.left - PAD.right
    const candleW= Math.max(2, W / data.length - 1.5)
    const candles = data.map((d, i) => {
      const x    = PAD.left + (i + 0.5) * (W / data.length)
      const yOf  = v => PAD.top + (1 - (v - pMin)/(pMax - pMin)) * chartH
      const yOpen = yOf(d.open)
      const yCls  = yOf(d.close)
      const yHi   = yOf(d.high)
      const yLo   = yOf(d.low)
      const up    = d.close >= d.open
      const bodyTop = Math.min(yOpen, yCls)
      const bodyH   = Math.max(Math.abs(yCls - yOpen), 1.2)
      const volH    = (d.volume || 0) / volMax * (volumeHeight - 10)
      return { ...d, x, yOpen, yCls, yHi, yLo, bodyTop, bodyH, candleW, up, volH, i }
    })
    return { priceMin: pMin, priceMax: pMax, candles, volMax }
  }, [data, width, height])

  // Y-axis labels
  const yTicks = useMemo(() => {
    const n = 5
    return Array.from({length:n}, (_,i) => {
      const v = priceMin + (priceMax - priceMin) * (i/(n-1))
      const y = PAD.top + (1 - (v - priceMin)/(priceMax - priceMin)) * chartH
      return { v, y }
    }).reverse()
  }, [priceMin, priceMax, chartH])

  // X-axis labels (every ~8th candle)
  const xTicks = useMemo(() => {
    if (!candles.length) return []
    const step = Math.max(1, Math.floor(candles.length / 7))
    return candles.filter((_,i) => i % step === 0)
  }, [candles])

  if (!data.length) return <div className={s.empty}>No chart data</div>

  return (
    <div className={s.wrap}>
      <svg
        width="100%" height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={s.svg}
        onMouseLeave={hide}
      >
        {/* Grid lines */}
        {yTicks.map(t => (
          <line key={t.v} x1={PAD.left} x2={width-PAD.right}
            y1={t.y} y2={t.y} stroke="var(--b1)" strokeWidth={1}/>
        ))}

        {/* Candles */}
        {candles.map(c => (
          <g key={c.i}
            onMouseMove={() => show(c, c.x, c.bodyTop)}
            style={{ cursor:'crosshair' }}>
            {/* Wick */}
            <line
              x1={c.x} y1={c.yHi} x2={c.x} y2={c.yLo}
              stroke={c.up ? 'var(--g)' : 'var(--r)'}
              strokeWidth={1} opacity={.7}
            />
            {/* Body */}
            <rect
              x={c.x - c.candleW/2}
              y={c.bodyTop}
              width={c.candleW}
              height={c.bodyH}
              fill={c.up ? 'var(--g)' : 'var(--r)'}
              fillOpacity={c.up ? .75 : .85}
              stroke={c.up ? 'var(--g)' : 'var(--r)'}
              strokeWidth={.5}
            />
          </g>
        ))}

        {/* Crosshair line */}
        {tip && (
          <line x1={tip.d.x} y1={PAD.top} x2={tip.d.x} y2={chartH+PAD.top}
            stroke="var(--b3)" strokeWidth={1} strokeDasharray="4 3"/>
        )}

        {/* Y-axis */}
        {yTicks.map(t => (
          <text key={t.v} x={width-PAD.right+6} y={t.y+3.5}
            fontSize={9} fill="var(--t3)" fontFamily="var(--mono)">
            ₹{fmt(t.v,0)}
          </text>
        ))}

        {/* X-axis */}
        {xTicks.map(c => (
          <text key={c.i} x={c.x} y={chartH+PAD.top+14}
            fontSize={9} fill="var(--t3)" fontFamily="var(--mono)"
            textAnchor="middle">
            {sd(c.date)}
          </text>
        ))}

        {/* Volume bars */}
        {candles.map(c => (
          <rect key={`v${c.i}`}
            x={c.x - c.candleW/2}
            y={height - volumeHeight + (volumeHeight - 10 - c.volH) - 2}
            width={c.candleW}
            height={Math.max(c.volH, 1)}
            fill={c.up ? 'rgba(0,214,143,.35)' : 'rgba(255,59,87,.35)'}
          />
        ))}

        {/* Volume separator line */}
        <line x1={PAD.left} x2={width-PAD.right}
          y1={height-volumeHeight-4} y2={height-volumeHeight-4}
          stroke="var(--b1)" strokeWidth={1}/>
      </svg>

      {/* Floating tooltip */}
      {tip && (
        <div className={s.tip}
          style={{
            left: Math.min(tip.d.x + 12, width - 160),
            top: Math.max(PAD.top, tip.y - 10),
          }}>
          <div className={s.tipDate}>{tip.d.date}</div>
          <div className={s.tipRow}><span>O</span><span className={tip.d.up?s.up:s.dn}>₹{fmt(tip.d.open)}</span></div>
          <div className={s.tipRow}><span>H</span><span className={s.up}>₹{fmt(tip.d.high)}</span></div>
          <div className={s.tipRow}><span>L</span><span className={s.dn}>₹{fmt(tip.d.low)}</span></div>
          <div className={s.tipRow}><span>C</span><span className={tip.d.up?s.up:s.dn}>₹{fmt(tip.d.close)}</span></div>
          <div className={s.tipRow}><span>Vol</span><span>{fmtK(tip.d.volume)}</span></div>
          {tip.d.return!=null && <div className={s.tipRow}><span>Ret</span><span className={tip.d.return>=0?s.up:s.dn}>{tip.d.return>=0?'+':''}{tip.d.return?.toFixed(2)}%</span></div>}
        </div>
      )}
    </div>
  )
}
