// NEXUS icon library — clean SVG, no emojis
const Ico = ({ size=16, stroke='currentColor', sw=1.75, children, style, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
    style={{flexShrink:0,...style}} {...p}>
    {children}
  </svg>
)
export const IcoBars     = p=><Ico {...p}><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></Ico>
export const IcoSearch   = p=><Ico {...p}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></Ico>
export const IcoX        = p=><Ico {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Ico>
export const IcoChevDown = p=><Ico {...p}><polyline points="6,9 12,15 18,9"/></Ico>
export const IcoChevUp   = p=><Ico {...p}><polyline points="18,15 12,9 6,15"/></Ico>
export const IcoChevRight= p=><Ico {...p}><polyline points="9,18 15,12 9,6"/></Ico>
export const IcoChart    = p=><Ico {...p}><polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/></Ico>
export const IcoList     = p=><Ico {...p}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></Ico>
export const IcoGrid     = p=><Ico {...p}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></Ico>
export const IcoFilter   = p=><Ico {...p}><polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"/></Ico>
export const IcoScale    = p=><Ico {...p}><line x1="12" y1="3" x2="12" y2="21"/><path d="M3 6h9l-4.5 6z"/><path d="M21 18h-9l4.5-6z"/></Ico>
export const IcoTrendUp  = p=><Ico {...p}><polyline points="23,6 13.5,15.5 8.5,10.5 1,18"/><polyline points="17,6 23,6 23,12"/></Ico>
export const IcoActivity = p=><Ico {...p}><polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/></Ico>
export const IcoRefresh  = p=><Ico {...p}><polyline points="23,4 23,10 17,10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></Ico>
export const IcoArrowUp  = p=><Ico {...p}><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5,12 12,5 19,12"/></Ico>
export const IcoArrowDown= p=><Ico {...p}><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19,12 12,19 5,12"/></Ico>
export const IcoStar     = p=><Ico {...p}><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></Ico>
export const IcoSliders  = p=><Ico {...p}><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></Ico>
export const IcoInfo     = p=><Ico {...p}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></Ico>
export const IcoBarChart = p=><Ico {...p}><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></Ico>
export const IcoGlobe    = p=><Ico {...p}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></Ico>
