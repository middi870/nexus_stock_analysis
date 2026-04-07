/**
 * MainChart v0.3.0
 * Now uses TradingView lightweight-charts (real OHLC candlesticks).
 * Falls back to a recharts line view toggle for users who prefer it.
 * Intraday 1D with 5m/15m/30m intervals.
 * All overlays and indicator panels forwarded to CandleChart.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { api, fmt, sign, cls } from '../api.js'
import CandleChart from './CandleChart.jsx'
import { IcoBarChart, IcoChart } from '../icons.jsx'

const HIST_DAYS    = [30, 60, 90, 180, 365]
const OVERLAY_OPTS = ['MA20', 'MA50', 'BB', 'VWAP']
const PANEL2_OPTS  = ['Volume', 'RSI', 'MACD', 'Stochastic']
const IV_OPTS      = ['5m', '15m', '30m']

export default function MainChart() {
  const { activeSym, activeCompany: ac, onChartReady } = useApp()

  const [period,    setPeriod  ] = useState(90)
  const [interval,  setIv      ] = useState('5m')
  const [overlays,  setOvr     ] = useState(['MA20'])
  const [panel2,    setPanel2  ] = useState('Volume')
  const [data,      setData    ] = useState([])
  const [loading,   setLoading ] = useState(false)
  const [switching, setSwitching]= useState(false)
  const prevSym    = useRef(null)
  const ctrl       = useRef(null)
  const isIntraday = period === '1D'

  const load = useCallback(async (sym, per, iv) => {
    ctrl.current?.abort()
    ctrl.current = new AbortController()
    try {
      if (per === '1D') {
        const res = await api.quote(sym, iv, ctrl.current.signal)
        return Array.isArray(res?.bars) ? res.bars : []
      }
      return await api.data(sym, per, ctrl.current.signal)
    } catch (e) {
      if (e.name !== 'AbortError') throw e
      return null
    }
  }, [])

  useEffect(() => {
    const symChanged = prevSym.current !== null && prevSym.current !== activeSym
    if (symChanged) { setSwitching(true); setData([]) }
    prevSym.current = activeSym
    setLoading(true)

    load(activeSym, period, interval).then(rows => {
      if (rows === null) return
      setData(rows)
      setLoading(false)
      setSwitching(false)
      onChartReady(activeSym)
    }).catch(() => { setLoading(false); setSwitching(false) })

    return () => ctrl.current?.abort()
  }, [activeSym, period, interval])

  const toggle = o => setOvr(p => p.includes(o) ? p.filter(x => x !== o) : [...p, o])

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column',
      overflow:'hidden', background:'#09090E', position:'relative' }}>

      {/* Symbol-switch overlay */}
      {switching && (
        <div style={{
          position:'absolute', inset:0, zIndex:20,
          background:'rgba(9,9,14,.8)', backdropFilter:'blur(3px)',
          display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'center', gap:12,
        }}>
          <div className="spinner" style={{ width:26, height:26 }}/>
          <div style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--t2)' }}>
            Loading <strong style={{ color:'var(--green)' }}>{activeSym}</strong>…
          </div>
        </div>
      )}

      {/* Stock strip */}
      {ac && (
        <div style={{
          padding:'7px 14px', background:'var(--s1)',
          borderBottom:'1px solid var(--b1)',
          display:'flex', alignItems:'center',
          gap:14, flexWrap:'wrap', flexShrink:0,
        }}>
          <div style={{ display:'flex', alignItems:'baseline', gap:10 }}>
            <span style={{ fontFamily:'var(--mono)', fontSize:12,
              fontWeight:700, color:'var(--green)' }}>{ac.symbol}</span>
            <span style={{ fontFamily:'var(--mono)', fontSize:20,
              fontWeight:700, color:'var(--t1)' }}>₹{fmt(ac.close)}</span>
            <span className={cls(ac.change_pct)}
              style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:700 }}>
              {sign(ac.change_pct)}
            </span>
          </div>
          <div style={{ display:'flex', gap:16, fontSize:10,
            color:'var(--t2)', fontFamily:'var(--mono)' }}>
            <span>H <span style={{ color:'var(--green)' }}>₹{fmt(ac.high)}</span></span>
            <span>L <span style={{ color:'var(--red)'   }}>₹{fmt(ac.low)}</span></span>
            <span>O ₹{fmt(ac.open)}</span>
            <span style={{ color:'var(--t3)' }}>
              {(ac.volume||0) >= 1e7 ? (ac.volume/1e7).toFixed(1)+'Cr vol' :
               (ac.volume||0) >= 1e5 ? (ac.volume/1e5).toFixed(1)+'L vol'  :
               (ac.volume||0).toLocaleString()+' vol'}
            </span>
            {isIntraday && data.length > 0 && (
              <span style={{ color:'var(--amber)' }}>
                INTRADAY · {interval} · {data.length} bars
              </span>
            )}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div style={{
        display:'flex', alignItems:'center', gap:4, flexWrap:'wrap',
        padding:'5px 12px', borderBottom:'1px solid var(--b1)',
        background:'var(--s1)', flexShrink:0,
      }}>
        {/* 1D period */}
        <button className={`tab-btn ${isIntraday ? 'on' : ''}`}
          style={{ padding:'3px 9px', fontSize:10 }}
          onClick={() => setPeriod('1D')}>1D</button>

        <div className="divider-v"/>

        {/* Historical periods */}
        {HIST_DAYS.map(d => (
          <button key={d} className={`tab-btn ${period===d ? 'on' : ''}`}
            style={{ padding:'3px 9px', fontSize:10 }}
            onClick={() => setPeriod(d)}>{d}D</button>
        ))}

        {/* Intraday interval */}
        {isIntraday && <>
          <div className="divider-v"/>
          {IV_OPTS.map(iv => (
            <button key={iv} className={`tab-btn ${interval===iv ? 'on' : ''}`}
              style={{ padding:'3px 9px', fontSize:10 }}
              onClick={() => setIv(iv)}>{iv}</button>
          ))}
        </>}

        {/* Historical overlays + panel2 */}
        {!isIntraday && <>
          <div className="divider-v"/>
          {OVERLAY_OPTS.map(o => (
            <button key={o} className={`tab-btn ${overlays.includes(o) ? 'on' : ''}`}
              style={{ padding:'3px 9px', fontSize:10 }}
              onClick={() => toggle(o)}>{o}</button>
          ))}
          <div className="divider-v"/>
          {PANEL2_OPTS.map(p => (
            <button key={p} className={`tab-btn ${panel2===p ? 'on' : ''}`}
              style={{ padding:'3px 9px', fontSize:10 }}
              onClick={() => setPanel2(p)}>{p}</button>
          ))}
        </>}

        {loading && !switching && (
          <div className="spinner" style={{ width:13, height:13, marginLeft:'auto' }}/>
        )}
      </div>

      {/* Empty / loading */}
      {data.length === 0 && !switching && (
        <div className="spin-center">
          {loading
            ? <><div className="spinner"/><span style={{ color:'var(--t4)', fontSize:11, fontFamily:'var(--mono)' }}>Loading chart…</span></>
            : <span style={{ color:'var(--t4)', fontSize:11, fontFamily:'var(--mono)' }}>No data available</span>
          }
        </div>
      )}

      {/* TradingView candlestick chart */}
      {data.length > 0 && (
        <CandleChart
          data={data}
          isIntraday={isIntraday}
          overlays={overlays}
          panel2={isIntraday ? 'Volume' : panel2}
        />
      )}
    </div>
  )
}
