// NEXUS — SVG icon library. Zero emojis.

const defaults = { width:16, height:16, fill:'none', stroke:'currentColor', strokeWidth:1.75, strokeLinecap:'round', strokeLinejoin:'round' }

const I = (props, paths) => (
  <svg {...defaults} {...props}>{paths}</svg>
)

export const IcoChart    = p => I(p, <><polyline points="3,17 8,11 12,14 17,7"/></>)
export const IcoList     = p => I(p, <><line x1="4" y1="6"  x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></>)
export const IcoGrid     = p => I(p, <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>)
export const IcoFilter   = p => I(p, <><polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"/></>)
export const IcoScale    = p => I(p, <><line x1="12" y1="3" x2="12" y2="21"/><path d="M3 6h9l-4.5 6z"/><path d="M21 18h-9l4.5-6z"/></>)
export const IcoSearch   = p => I(p, <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>)
export const IcoX        = p => I(p, <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>)
export const IcoChevUp   = p => I(p, <><polyline points="18,15 12,9 6,15"/></>)
export const IcoChevDown = p => I(p, <><polyline points="6,9 12,15 18,9"/></>)
export const IcoRefresh  = p => I(p, <><polyline points="23,4 23,10 17,10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></>)
export const IcoBell     = p => I(p, <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>)
export const IcoTrend    = p => I(p, <><polyline points="23,6 13.5,15.5 8.5,10.5 1,18"/><polyline points="17,6 23,6 23,12"/></>)
export const IcoBarChart = p => I(p, <><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6"  y1="20" x2="6"  y2="16"/></>)
export const IcoInfo     = p => I(p, <><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></>)
export const IcoArrowUp  = p => I(p, <><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5,12 12,5 19,12"/></>)
export const IcoArrowDn  = p => I(p, <><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19,12 12,19 5,12"/></>)
export const IcoStar     = p => I(p, <><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></>)
export const IcoSliders  = p => I(p, <><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8"  x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8"  x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></>)
export const IcoMenu     = p => I(p, <><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6"  x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>)
