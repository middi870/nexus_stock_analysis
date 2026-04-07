/**
 * useUrlSync — keeps URL in sync with active symbol + tab.
 * Format: /#/chart/TCS  (hash-based, no server config needed)
 * Reads URL on mount so links are bookmarkable and shareable.
 */
import { useEffect, useRef } from 'react'

const VALID_TABS = ['stocks','chart','analysis','screener','heatmap','sectors','compare','portfolio']

function parse() {
  const hash   = window.location.hash.replace(/^#\/?/, '')
  const [path] = hash.split('?')
  const parts  = path.split('/').filter(Boolean)
  return { tab: parts[0] || null, sym: (parts[1] || '').toUpperCase() || null }
}

function write(tab, sym) {
  const h = `#/${tab}/${sym}`
  if (window.location.hash !== h) window.history.replaceState(null, '', h)
}

export function useUrlSync({ tab, activeSym, setTab, selectSymbol, companies }) {
  const booted = useRef(false)

  // Read URL once companies are available (needed to validate sym)
  useEffect(() => {
    if (booted.current || companies.length === 0) return
    booted.current = true
    const { tab: urlTab, sym: urlSym } = parse()
    if (urlTab && VALID_TABS.includes(urlTab)) setTab(urlTab)
    if (urlSym  && companies.some(c => c.symbol === urlSym)) selectSymbol(urlSym)
  }, [companies.length])

  // Write URL whenever tab or symbol changes
  useEffect(() => {
    if (activeSym && tab) write(tab, activeSym)
  }, [tab, activeSym])
}
