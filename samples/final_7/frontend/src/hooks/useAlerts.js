/**
 * useAlerts — in-browser price alert engine.
 * Stores alerts in localStorage. Checks prices every 60s via the
 * existing useQuotePoller companies data (no extra API calls).
 * Fires Web Notification API alerts when thresholds are crossed.
 */
import { useState, useEffect, useCallback, useRef } from 'react'

const STORE_KEY = 'nexus_alerts_v1'

function load() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || [] }
  catch { return [] }
}
function save(arr) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(arr)) } catch {}
}

let notifPermission = 'default'

async function requestPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') { notifPermission = 'granted'; return true }
  if (Notification.permission === 'denied')  return false
  const result = await Notification.requestPermission()
  notifPermission = result
  return result === 'granted'
}

function fireNotif(alert, price) {
  if (notifPermission !== 'granted') return
  const dir   = alert.type === 'above' ? 'crossed above' : 'dropped below'
  const title = `NEXUS Alert — ${alert.symbol}`
  const body  = `${alert.symbol} has ${dir} ₹${alert.target.toFixed(2)}\nCurrent price: ₹${price.toFixed(2)}`
  try {
    new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag:  alert.id,   // prevents duplicate notifications
    })
  } catch {}
}

/**
 * @param {Array} companies — live companies array from context
 * @returns { alerts, addAlert, removeAlert, hasPermission, requestPerm, triggered }
 */
export function useAlerts(companies) {
  const [alerts,      setAlerts    ] = useState(load)
  const [hasPermission,setHasPerm  ] = useState(Notification?.permission === 'granted')
  const [triggered,   setTriggered ] = useState([])  // recently fired alert ids
  const prevPrices = useRef({})    // { symbol: lastCheckedPrice }
  const firedRef   = useRef(new Set())  // prevent re-firing until price recovers

  // Request permission
  const requestPerm = useCallback(async () => {
    const ok = await requestPermission()
    setHasPerm(ok)
    return ok
  }, [])

  // Add a new alert
  const addAlert = useCallback((symbol, type, target) => {
    const next = [...alerts, {
      id:      `${Date.now()}-${symbol}`,
      symbol,
      type,    // 'above' | 'below'
      target:  Number(target),
      active:  true,
      created: Date.now(),
    }]
    setAlerts(next)
    save(next)
  }, [alerts])

  // Remove
  const removeAlert = useCallback(id => {
    const next = alerts.filter(a => a.id !== id)
    setAlerts(next)
    save(next)
    firedRef.current.delete(id)
  }, [alerts])

  // Check prices whenever companies updates
  useEffect(() => {
    if (!companies.length || !alerts.length) return

    const priceMap = Object.fromEntries(companies.map(c => [c.symbol, c.close]))
    const nowFired = []

    alerts.forEach(alert => {
      if (!alert.active) return
      const price = priceMap[alert.symbol]
      if (price == null) return

      const prev  = prevPrices.current[alert.symbol]
      const key   = alert.id

      const crossed =
        alert.type === 'above' ? price >= alert.target :
        alert.type === 'below' ? price <= alert.target : false

      if (crossed && !firedRef.current.has(key)) {
        firedRef.current.add(key)
        fireNotif(alert, price)
        nowFired.push(key)
      }

      // Reset fired flag when price recovers past threshold
      if (!crossed && firedRef.current.has(key)) {
        firedRef.current.delete(key)
      }

      prevPrices.current[alert.symbol] = price
    })

    if (nowFired.length) {
      setTriggered(prev => [...prev, ...nowFired])
      // Clear triggered display after 5s
      setTimeout(() => setTriggered(prev => prev.filter(id => !nowFired.includes(id))), 5000)
    }
  }, [companies, alerts])

  return {
    alerts,
    addAlert,
    removeAlert,
    hasPermission,
    requestPerm,
    triggered,
  }
}
