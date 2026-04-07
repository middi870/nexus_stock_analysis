/**
 * Sparkline — micro line chart rendered inline in stock list rows.
 * Uses a plain SVG path (no recharts) for maximum performance.
 * Colour matches the overall trend (first → last price).
 */
export default function Sparkline({ prices, width = 56, height = 28 }) {
  if (!prices || prices.length < 2) {
    return <div style={{ width, height, flexShrink: 0 }}/>
  }

  const min  = Math.min(...prices)
  const max  = Math.max(...prices)
  const rng  = max - min || 1
  const pad  = 2

  // Map prices → SVG coordinates
  const pts = prices.map((p, i) => {
    const x = pad + (i / (prices.length - 1)) * (width  - pad * 2)
    const y = pad + (1 - (p - min) / rng)     * (height - pad * 2)
    return [x, y]
  })

  const path = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')

  // Fill: polygon from line down to bottom
  const fillPts = [
    ...pts,
    [pts[pts.length - 1][0], height - pad],
    [pts[0][0], height - pad],
  ]
  const fillPath = fillPts.map(([x, y], i) =>
    `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  ).join(' ') + ' Z'

  const up    = prices[prices.length - 1] >= prices[0]
  const color = up ? '#22C55E' : '#EF4444'
  const fillC = up ? 'rgba(34,197,94,' : 'rgba(239,68,68,'

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}
      style={{ flexShrink: 0, display: 'block' }}>
      {/* Area fill */}
      <path d={fillPath} fill={`${fillC}0.08)`} stroke="none"/>
      {/* Line */}
      <path d={path} fill="none" stroke={color} strokeWidth={1.4}
        strokeLinecap="round" strokeLinejoin="round" opacity={0.85}/>
      {/* Last price dot */}
      <circle
        cx={pts[pts.length - 1][0].toFixed(1)}
        cy={pts[pts.length - 1][1].toFixed(1)}
        r={2} fill={color}/>
    </svg>
  )
}
