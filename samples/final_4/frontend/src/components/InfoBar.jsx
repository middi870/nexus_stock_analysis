/** InfoBar — right panel, loads instantly from activeCompany */
import { useApp } from '../context/AppContext.jsx'
import { fmt, sign, cls, fmtVol } from '../api.js'

function Row({ label, value, color }) {
  return (
    <div style={{
      display:'flex',justifyContent:'space-between',alignItems:'center',
      padding:'5px 0',borderBottom:'1px solid rgba(255,255,255,.035)',
    }}>
      <span style={{fontSize:9,color:'var(--t3)',textTransform:'uppercase',
        letterSpacing:'.07em'}}>{label}</span>
      <span style={{fontFamily:'var(--mono)',fontSize:11,fontWeight:500,
        color:color||'var(--t1)',marginLeft:4}}>{value??'—'}</span>
    </div>
  )
}

function GaugeBar({ label, value, min=0, max=100 }) {
  if (value==null) return null
  const pct   = Math.max(0,Math.min(100,((value-min)/(max-min+1e-9))*100))
  const color = pct>65?'var(--green)':pct<35?'var(--red)':'var(--amber)'
  return (
    <div style={{marginBottom:11}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
        <span style={{fontSize:9,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'.07em'}}>
          {label}
        </span>
        <span style={{fontFamily:'var(--mono)',fontSize:10,fontWeight:600,color}}>
          {value.toFixed(1)}
        </span>
      </div>
      <div style={{height:3,background:'var(--b2)',borderRadius:99,overflow:'hidden'}}>
        <div style={{width:`${pct}%`,height:'100%',background:color,
          borderRadius:99,transition:'width .5s ease'}}/>
      </div>
    </div>
  )
}

export default function InfoBar() {
  const { activeCompany:ac, summary:s, summaryLoading, tab } = useApp()
  if (tab!=='chart'&&tab!=='analysis') return null

  const style = {
    width:'var(--infobar-w)',flexShrink:0,
    borderLeft:'1px solid var(--b1)',background:'var(--s1)',
    display:'flex',flexDirection:'column',overflow:'hidden',
  }

  if (!ac) return (
    <aside className="infobar-shell" style={style}>
      <div style={{padding:14}}>
        {[80,60,70,50].map((w,i)=>(
          <div key={i} className="skel" style={{height:11,width:`${w}%`,marginBottom:10}}/>
        ))}
      </div>
    </aside>
  )

  const lo52=s?.week52_low, hi52=s?.week52_high
  const pct52=(lo52&&hi52)?Math.max(0,Math.min(100,((ac.close-lo52)/(hi52-lo52+1e-9))*100)):null

  return (
    <aside className="infobar-shell" style={style}>
      <div style={{flex:1,overflowY:'auto'}}>
        <div style={{padding:'12px'}}>

          {/* Header */}
          <div style={{marginBottom:14}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
              <span style={{fontFamily:'var(--mono)',fontSize:11,fontWeight:700,color:'var(--green)'}}>
                {ac.symbol}
              </span>
              <span style={{fontSize:8,color:'var(--t4)',background:'var(--s3)',
                padding:'2px 6px',borderRadius:3,fontFamily:'var(--mono)'}}>
                {ac.sector?.slice(0,8)}
              </span>
            </div>
            <div style={{fontFamily:'var(--mono)',fontSize:22,fontWeight:700,
              color:'var(--t1)',lineHeight:1,marginBottom:5}}>
              ₹{fmt(ac.close)}
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span className={cls(ac.change_pct)}
                style={{fontFamily:'var(--mono)',fontSize:12,fontWeight:700}}>
                {sign(ac.change_pct)}
              </span>
              <span style={{fontSize:10,color:'var(--t3)'}}>today</span>
            </div>
          </div>

          {/* OHLC */}
          <div style={{background:'var(--s2)',borderRadius:'var(--rr2)',
            padding:'8px 10px',marginBottom:12,border:'1px solid var(--b2)'}}>
            <div style={{fontSize:8,color:'var(--t4)',textTransform:'uppercase',
              letterSpacing:'.1em',marginBottom:6,fontFamily:'var(--mono)'}}>Today</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4px 6px',
              fontFamily:'var(--mono)',fontSize:10}}>
              <span><span style={{color:'var(--t4)'}}>O </span>₹{fmt(ac.open)}</span>
              <span style={{color:'var(--green)'}}>H ₹{fmt(ac.high)}</span>
              <span style={{color:'var(--red)'}}>L ₹{fmt(ac.low)}</span>
              <span style={{fontWeight:600}}>C ₹{fmt(ac.close)}</span>
            </div>
          </div>

          {/* 52W range */}
          {pct52!==null ? (
            <div style={{marginBottom:14}}>
              <div style={{fontSize:9,color:'var(--t3)',textTransform:'uppercase',
                letterSpacing:'.08em',marginBottom:5}}>52-Week</div>
              <div style={{position:'relative',height:5,borderRadius:99,
                background:'linear-gradient(90deg,var(--red) 0%,var(--s4) 45%,var(--green) 100%)',
                marginBottom:4}}>
                <div style={{
                  position:'absolute',top:'50%',left:`${pct52}%`,
                  transform:'translate(-50%,-50%)',
                  width:10,height:10,borderRadius:'50%',
                  background:'white',border:`2px solid ${pct52>50?'var(--green)':'var(--red)'}`,
                  boxShadow:'0 1px 4px rgba(0,0,0,.6)',transition:'left .4s',
                }}/>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',
                fontFamily:'var(--mono)',fontSize:8,color:'var(--t3)'}}>
                <span style={{color:'var(--red)'}}>₹{fmt(lo52)}</span>
                <span style={{color:'var(--green)'}}>₹{fmt(hi52)}</span>
              </div>
            </div>
          ):summaryLoading?(
            <div className="skel" style={{height:32,marginBottom:14}}/>
          ):null}

          {/* Gauges */}
          {s?(<>
            <GaugeBar label="RSI (14)" value={s.rsi}/>
            <GaugeBar label="Stoch %K" value={s.stoch_k}/>
            <GaugeBar label="Momentum" value={s.momentum}/>
          </>):summaryLoading?[1,2,3].map(i=>(
            <div key={i} className="skel" style={{height:24,marginBottom:12}}/>
          )):null}

          {/* Stats */}
          <div style={{marginTop:6}}>
            <Row label="Volume"   value={fmtVol(ac.volume)}/>
            <Row label="Mkt Cap"  value={ac.mktcap?'₹'+ac.mktcap+'L Cr':null}/>
            <Row label="P/E"      value={ac.pe?ac.pe+'×':null}/>
            <Row label="P/B"      value={ac.pb?ac.pb+'×':null}/>
            <Row label="Div"      value={ac.div_yield?ac.div_yield+'%':null}/>
            {s&&<>
              <Row label="1Y Return" value={sign(s.total_return_pct)}
                color={s.total_return_pct>=0?'var(--green)':'var(--red)'}/>
              <Row label="Ann. Vol"  value={s.volatility_pct?s.volatility_pct+'%':null}/>
              <Row label="ATR"       value={s.atr?'₹'+fmt(s.atr):null}/>
              <Row label="MACD"      value={s.macd!=null?fmt(s.macd,4):null}/>
            </>}
          </div>

          {s&&(
            <div style={{marginTop:10,fontSize:8,color:'var(--t4)',
              fontFamily:'var(--mono)',textAlign:'center',lineHeight:1.6}}>
              {s.data_from} → {s.data_to}
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
