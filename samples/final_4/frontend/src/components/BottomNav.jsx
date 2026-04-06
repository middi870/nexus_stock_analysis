/**
 * BottomNav — mobile only. UX order reflects ascending user journey:
 * 1. Stocks   — discover + pick a stock
 * 2. Chart    — view price action
 * 3. Analysis — deep technical stats
 * 4. Market   — heatmap overview
 * 5. Compare  — side-by-side
 */
import { useApp } from '../context/AppContext.jsx'
import { IcoList, IcoChart, IcoActivity, IcoGrid, IcoScale } from '../icons.jsx'

const TABS = [
  { id:'stocks',   label:'Stocks',   Icon:IcoList     },
  { id:'chart',    label:'Chart',    Icon:IcoChart    },
  { id:'analysis', label:'Analysis', Icon:IcoActivity },
  { id:'heatmap',  label:'Market',   Icon:IcoGrid     },
  { id:'compare',  label:'Compare',  Icon:IcoScale    },
]

export default function BottomNav() {
  const { mobileTab, setMobileTab, activeSym } = useApp()

  return (
    <nav className="bnav">
      {TABS.map(({ id, label, Icon }) => (
        <button key={id}
          className={`bnav-tab ${mobileTab===id?'on':''}`}
          onClick={() => setMobileTab(id)}
        >
          <Icon size={20}/>
          <span className="bnav-label">{label}</span>
          {id==='chart' && activeSym && (
            <span style={{
              position:'absolute',top:6,right:'calc(50% - 18px)',
              fontSize:7,fontFamily:'var(--mono)',fontWeight:700,
              color:'var(--green)',letterSpacing:'.04em',
              background:'rgba(34,197,94,.12)',padding:'1px 4px',borderRadius:3,
            }}>{activeSym}</span>
          )}
        </button>
      ))}
    </nav>
  )
}
