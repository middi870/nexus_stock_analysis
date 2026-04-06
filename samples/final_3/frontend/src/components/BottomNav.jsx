import { useApp } from '../context/AppContext.jsx'
import { IcoChart, IcoList, IcoGrid, IcoFilter, IcoScale } from '../icons.jsx'

const TABS = [
  { id:'chart',    label:'Chart',    Icon:IcoChart  },
  { id:'stocks',   label:'Stocks',   Icon:IcoList   },
  { id:'heatmap',  label:'Heat',     Icon:IcoGrid   },
  { id:'screener', label:'Screen',   Icon:IcoFilter },
  { id:'compare',  label:'Compare',  Icon:IcoScale  },
]

export default function BottomNav() {
  const { tab, setTab, drawerOpen, setDrawerOpen } = useApp()

  const handle = id => {
    if (id === 'stocks') {
      setDrawerOpen(p => !p)
    } else {
      setDrawerOpen(false)
      setTab(id)
    }
  }

  return (
    <nav className="bottom-nav">
      {TABS.map(({ id, label, Icon }) => {
        const isStocks = id === 'stocks'
        const active   = isStocks ? drawerOpen : tab === id
        return (
          <button key={id} className={`bnav-item ${active ? 'active' : ''}`}
            onClick={() => handle(id)}>
            <Icon width={20} height={20}/>
            <span>{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
