/**
 * CandleChart — TradingView lightweight-charts v5 wrapper.
 * Renders genuine OHLC candlestick bars with volume histogram.
 * Supports historical (daily) and intraday (5m/15m/30m) modes.
 * MA overlays drawn as line series on the same pane.
 * RSI / MACD / Stochastic / Volume in a separate lower pane.
 */
import { useEffect, useRef, useCallback } from 'react'
import { createChart, CrosshairMode, LineStyle, PriceScaleMode } from 'lightweight-charts'

// ── Colour tokens (must match CSS vars in globals.css) ──────────────────────
const C = {
  bg:     '#09090E',
  panel:  '#0F1117',
  grid:   '#1E2133',
  text:   '#7A8AAD',
  green:  '#22C55E',
  red:    '#EF4444',
  blue:   '#3B82F6',
  cyan:   '#06B6D4',
  purple: '#8B5CF6',
  amber:  '#F59E0B',
  orange: '#F97316',
}

const SHARED_CHART_OPTS = {
  layout: {
    background:  { color: C.bg },
    textColor:   C.text,
    fontFamily:  "'JetBrains Mono', monospace",
    fontSize:    10,
  },
  grid: {
    vertLines:   { color: C.grid, style: LineStyle.Dotted },
    horzLines:   { color: C.grid, style: LineStyle.Dotted },
  },
  crosshair: {
    mode: CrosshairMode.Normal,
    vertLine: { color: 'rgba(122,138,173,.4)', labelBackgroundColor: C.panel },
    horzLine: { color: 'rgba(122,138,173,.4)', labelBackgroundColor: C.panel },
  },
  rightPriceScale: {
    borderColor: C.grid,
    scaleMargins: { top: 0.08, bottom: 0.08 },
    mode: PriceScaleMode.Normal,
  },
  timeScale: {
    borderColor:      C.grid,
    timeVisible:      true,
    secondsVisible:   false,
    tickMarkFormatter: (time) => {
      const d = new Date(time * 1000)
      return d.toLocaleDateString('en-IN', { day:'2-digit', month:'short' })
    },
  },
  handleScroll:  true,
  handleScale:   true,
}

/**
 * Convert our API records to lightweight-charts format.
 * Historical: { date, open, high, low, close, volume, ma20, ma50, rsi, ... }
 * Intraday:   { time, date, open, high, low, close, volume }
 */
function toCandle(row, isIntraday) {
  const ts = isIntraday
    ? parseIntraTime(row.date, row.time)
    : parseDateStr(row.date)
  if (!ts) return null
  return {
    time:  ts,
    open:  Number(row.open)  || 0,
    high:  Number(row.high)  || 0,
    low:   Number(row.low)   || 0,
    close: Number(row.close) || 0,
  }
}

function toBar(row, key, isIntraday) {
  const ts = isIntraday
    ? parseIntraTime(row.date, row.time)
    : parseDateStr(row.date)
  if (!ts || row[key] == null) return null
  return { time: ts, value: Number(row[key]) || 0 }
}

function parseDateStr(dateStr) {
  if (!dateStr) return null
  const [y, m, d] = dateStr.split('-').map(Number)
  // lightweight-charts uses Unix timestamp in seconds (UTC noon)
  return Date.UTC(y, m - 1, d) / 1000
}

function parseIntraTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null
  const [y, m, d] = dateStr.split('-').map(Number)
  const [h, min]  = timeStr.split(':').map(Number)
  return Date.UTC(y, m - 1, d, h, min) / 1000
}

export default function CandleChart({
  data        = [],
  isIntraday  = false,
  overlays    = ['MA20'],   // 'MA20' | 'MA50' | 'BB' | 'VWAP'
  panel2      = 'Volume',   // 'Volume' | 'RSI' | 'MACD' | 'Stochastic'
  height      = null,       // null = fill parent
}) {
  const mainRef   = useRef(null)   // upper chart container div
  const lowerRef  = useRef(null)   // lower indicator panel div
  const chartRef  = useRef(null)   // Chart instance
  const lowerChRef= useRef(null)   // Lower Chart instance
  const seriesRef = useRef({})     // named series instances

  const destroy = useCallback(() => {
    try { chartRef.current?.remove()  } catch {}
    try { lowerChRef.current?.remove()} catch {}
    chartRef.current   = null
    lowerChRef.current = null
    seriesRef.current  = {}
  }, [])

  useEffect(() => {
    if (!mainRef.current || !lowerRef.current || data.length === 0) return
    destroy()

    // ── Upper chart — candlesticks ──────────────────────────────────────────
    const chart = createChart(mainRef.current, {
      ...SHARED_CHART_OPTS,
      width:  mainRef.current.clientWidth,
      height: mainRef.current.clientHeight,
      timeScale: {
        ...SHARED_CHART_OPTS.timeScale,
        tickMarkFormatter: isIntraday
          ? (ts) => {
              const d = new Date(ts * 1000)
              return d.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })
            }
          : SHARED_CHART_OPTS.timeScale.tickMarkFormatter,
      },
    })
    chartRef.current = chart

    // Candlestick series
    const candles = chart.addCandlestickSeries({
      upColor:          C.green,
      downColor:        C.red,
      borderUpColor:    C.green,
      borderDownColor:  C.red,
      wickUpColor:      C.green,
      wickDownColor:    C.red,
    })
    seriesRef.current.candles = candles

    const candleData = data.map(r => toCandle(r, isIntraday)).filter(Boolean)
    candles.setData(candleData)

    // ── MA overlays ───────────────────────────────────────────────────────────
    if (!isIntraday && overlays.includes('MA20')) {
      const ma20 = chart.addLineSeries({
        color: C.cyan, lineWidth: 1.5,
        crosshairMarkerVisible: false, lastValueVisible: false, priceLineVisible: false,
      })
      ma20.setData(data.map(r => toBar(r, 'ma20', false)).filter(Boolean))
      seriesRef.current.ma20 = ma20
    }

    if (!isIntraday && overlays.includes('MA50')) {
      const ma50 = chart.addLineSeries({
        color: C.purple, lineWidth: 1.5,
        crosshairMarkerVisible: false, lastValueVisible: false, priceLineVisible: false,
      })
      ma50.setData(data.map(r => toBar(r, 'ma50', false)).filter(Boolean))
      seriesRef.current.ma50 = ma50
    }

    if (!isIntraday && overlays.includes('VWAP')) {
      const vwap = chart.addLineSeries({
        color: C.orange, lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        crosshairMarkerVisible: false, lastValueVisible: false, priceLineVisible: false,
      })
      vwap.setData(data.map(r => toBar(r, 'vwap', false)).filter(Boolean))
      seriesRef.current.vwap = vwap
    }

    if (!isIntraday && overlays.includes('BB')) {
      const bbUp = chart.addLineSeries({
        color: 'rgba(59,130,246,.5)', lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        crosshairMarkerVisible: false, lastValueVisible: false, priceLineVisible: false,
      })
      const bbDn = chart.addLineSeries({
        color: 'rgba(59,130,246,.5)', lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        crosshairMarkerVisible: false, lastValueVisible: false, priceLineVisible: false,
      })
      bbUp.setData(data.map(r => toBar(r, 'bb_up', false)).filter(Boolean))
      bbDn.setData(data.map(r => toBar(r, 'bb_dn', false)).filter(Boolean))
    }

    // Intraday: show volume as histogram on lower panel using histogram series
    // Historical: show chosen indicator on lower chart

    // ── Lower chart — indicator panel ─────────────────────────────────────────
    const lChart = createChart(lowerRef.current, {
      ...SHARED_CHART_OPTS,
      width:  lowerRef.current.clientWidth,
      height: lowerRef.current.clientHeight,
      timeScale: {
        ...SHARED_CHART_OPTS.timeScale,
        visible: false,   // share time axis visually — labels on upper chart only
        tickMarkFormatter: isIntraday
          ? (ts) => {
              const d = new Date(ts * 1000)
              return d.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })
            }
          : SHARED_CHART_OPTS.timeScale.tickMarkFormatter,
      },
      rightPriceScale: {
        ...SHARED_CHART_OPTS.rightPriceScale,
        scaleMargins: { top: 0.05, bottom: 0.05 },
      },
    })
    lowerChRef.current = lChart

    const p2Key = isIntraday ? 'volume'
      : panel2 === 'RSI'        ? 'rsi'
      : panel2 === 'MACD'       ? 'macd'
      : panel2 === 'Stochastic' ? 'stoch_k'
      : 'volume'

    if (p2Key === 'volume') {
      // Volume histogram — colour each bar by candle direction
      const volSeries = lChart.addHistogramSeries({
        color:            'rgba(59,130,246,.5)',
        priceFormat:      { type:'volume' },
        priceScaleId:     'vol',
      })
      lChart.priceScale('vol').applyOptions({ scaleMargins:{ top:0.6, bottom:0 } })
      const volData = data.map(r => {
        const ts = isIntraday
          ? parseIntraTime(r.date, r.time)
          : parseDateStr(r.date)
        if (!ts || r.volume == null) return null
        const up = (r.close ?? 0) >= (r.open ?? 0)
        return { time:ts, value:Number(r.volume)||0,
          color: up ? 'rgba(34,197,94,.45)' : 'rgba(239,68,68,.45)' }
      }).filter(Boolean)
      volSeries.setData(volData)

    } else if (panel2 === 'MACD') {
      // MACD: histogram bars + two lines
      const hist = lChart.addHistogramSeries({
        color: 'rgba(6,182,212,.55)',
        priceScaleId: 'left',
      })
      const macdLine = lChart.addLineSeries({
        color: C.green, lineWidth:1.3,
        crosshairMarkerVisible:false, lastValueVisible:false, priceLineVisible:false,
        priceScaleId: 'left',
      })
      const sigLine = lChart.addLineSeries({
        color: C.orange, lineWidth:1.3,
        crosshairMarkerVisible:false, lastValueVisible:false, priceLineVisible:false,
        priceScaleId: 'left',
      })
      const histData = data.map(r => { const t=parseDateStr(r.date); return t&&r.macd_hist!=null?{time:t,value:Number(r.macd_hist)||0,color:(r.macd_hist>=0?'rgba(34,197,94,.55)':'rgba(239,68,68,.55)')}:null}).filter(Boolean)
      const macdData = data.map(r => toBar(r,'macd',false)).filter(Boolean)
      const sigData  = data.map(r => toBar(r,'macd_sig',false)).filter(Boolean)
      hist.setData(histData)
      macdLine.setData(macdData)
      sigLine.setData(sigData)

    } else if (panel2 === 'Stochastic') {
      // Stoch %K + %D
      const kLine = lChart.addLineSeries({ color:C.purple, lineWidth:1.3, crosshairMarkerVisible:false, lastValueVisible:false, priceLineVisible:false })
      const dLine = lChart.addLineSeries({ color:C.amber,  lineWidth:1.3, crosshairMarkerVisible:false, lastValueVisible:false, priceLineVisible:false })
      kLine.setData(data.map(r=>toBar(r,'stoch_k',false)).filter(Boolean))
      dLine.setData(data.map(r=>toBar(r,'stoch_d',false)).filter(Boolean))
      // Overbought/oversold lines
      const ob = lChart.addLineSeries({ color:'rgba(239,68,68,.35)', lineWidth:1, lineStyle:LineStyle.Dashed, crosshairMarkerVisible:false, lastValueVisible:false, priceLineVisible:false })
      const os = lChart.addLineSeries({ color:'rgba(34,197,94,.35)',  lineWidth:1, lineStyle:LineStyle.Dashed, crosshairMarkerVisible:false, lastValueVisible:false, priceLineVisible:false })
      const range = data.map(r => parseDateStr(r.date)).filter(Boolean)
      if (range.length) {
        ob.setData([{time:range[0],value:80},{time:range[range.length-1],value:80}])
        os.setData([{time:range[0],value:20},{time:range[range.length-1],value:20}])
      }

    } else {
      // RSI
      const rsiLine = lChart.addLineSeries({ color:C.cyan, lineWidth:1.4, crosshairMarkerVisible:false, lastValueVisible:false, priceLineVisible:false })
      rsiLine.setData(data.map(r=>toBar(r,'rsi',false)).filter(Boolean))
      lChart.priceScale('right').applyOptions({ autoScale:false, minimum:0, maximum:100 })
      const range = data.map(r => parseDateStr(r.date)).filter(Boolean)
      if (range.length) {
        const ob70 = lChart.addLineSeries({ color:'rgba(239,68,68,.35)', lineWidth:1, lineStyle:LineStyle.Dashed, crosshairMarkerVisible:false, lastValueVisible:false, priceLineVisible:false })
        const os30 = lChart.addLineSeries({ color:'rgba(34,197,94,.35)',  lineWidth:1, lineStyle:LineStyle.Dashed, crosshairMarkerVisible:false, lastValueVisible:false, priceLineVisible:false })
        ob70.setData([{time:range[0],value:70},{time:range[range.length-1],value:70}])
        os30.setData([{time:range[0],value:30},{time:range[range.length-1],value:30}])
      }
    }

    // Sync time scales
    chart.timeScale().subscribeVisibleLogicalRangeChange(range => {
      if (range) lChart.timeScale().setVisibleLogicalRange(range)
    })
    lChart.timeScale().subscribeVisibleLogicalRangeChange(range => {
      if (range) chart.timeScale().setVisibleLogicalRange(range)
    })

    // Fit content
    chart.timeScale().fitContent()
    lChart.timeScale().fitContent()

    // ── Resize observer ────────────────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      if (mainRef.current)  chart.applyOptions({ width:mainRef.current.clientWidth,   height:mainRef.current.clientHeight })
      if (lowerRef.current) lChart.applyOptions({ width:lowerRef.current.clientWidth, height:lowerRef.current.clientHeight })
    })
    if (mainRef.current)  ro.observe(mainRef.current)
    if (lowerRef.current) ro.observe(lowerRef.current)

    return () => { ro.disconnect(); destroy() }
  }, [data, overlays.join(','), panel2, isIntraday])

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      {/* Upper — candlestick chart, 68% */}
      <div ref={mainRef} style={{ flex:'0 0 68%', minHeight:0, background:C.bg }}/>
      {/* Lower — indicator panel, 32% */}
      <div style={{ flex:'0 0 32%', minHeight:0, borderTop:'1px solid #1E2133' }}>
        <div ref={lowerRef} style={{ width:'100%', height:'100%', background:C.bg }}/>
      </div>
    </div>
  )
}
