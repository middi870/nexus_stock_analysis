/** Desktop left sidebar — wraps StockList */
import StockList from './StockList.jsx'
export default function Sidebar() {
  return (
    <aside className="sidebar-shell" style={{
      width:'var(--sidebar-w)',flexShrink:0,
      display:'flex',flexDirection:'column',
      borderRight:'1px solid var(--b1)',overflow:'hidden',
    }}>
      <StockList embedded/>
    </aside>
  )
}
