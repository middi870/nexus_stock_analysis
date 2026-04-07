/**
 * BottomNav v0.2.1
 * UX order: Stocks → Chart → Analysis → Market → Sectors → Compare → Portfolio
 * New: Portfolio + Sectors tabs
 */
import { useApp } from '../context/AppContext.jsx'
import {
  IcoList, IcoChart, IcoActivity, IcoGrid,
  IcoBarChart, IcoScale, IcoStar,
} from '../icons.jsx'

const TABS = [
  { id:'stocks',    label:'Stocks',   Icon: IcoList     },
  { id:'chart',     label:'Chart',    Icon: IcoChart    },
  { id:'analysis',  label:'Analysis', Icon: IcoActivity },
  { id:'heatmap',   label:'Market',   Icon: IcoGrid     },
  { id:'sectors',   label:'Sectors',  Icon: IcoBarChart },
  { id:'compare',   label:'Compare',  Icon: IcoScale    },
  { id:'portfolio', label:'Portfolio',Icon: IcoStar     },
]

export default function BottomNav() {
  const { mobileTab, setMobileTab, activeSym } = useApp()

  return (
    <nav className="bnav">
      {TABS.map(({ id, label, Icon }) => (
        <button key={id}
          className={`bnav-tab ${mobileTab === id ? 'on' : ''}`}
          onClick={() => setMobileTab(id)}>
          <Icon size={19}/>
          <span className="bnav-label">{label}</span>

          {/* Active symbol badge on Chart tab */}
          {id === 'chart' && activeSym && mobileTab !== 'chart' && (
            <span style={{
              position:'absolute', top:5,
              right:'calc(50% - 20px)',
              fontSize:6, fontFamily:'var(--mono)', fontWeight:700,
              color:'var(--green)', letterSpacing:'.04em',
              background:'rgba(34,197,94,.15)',
              padding:'1px 4px', borderRadius:3,
              lineHeight:1.4,
            }}>{activeSym}</span>
          )}
        </button>
      ))}
    </nav>
  )
}
