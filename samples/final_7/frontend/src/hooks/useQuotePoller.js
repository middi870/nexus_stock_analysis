/**
 * useQuotePoller — polls /companies every 60 seconds to refresh prices.
 * Updates the companies list in context without a full page reload.
 * Shows a "last updated Ns ago" timestamp for feedback.
 */
import { useEffect, useRef, useState } from 'react'
import { api, invalidate } from '../api.js'

const INTERVAL_MS = 60_000   // 60 seconds

export function useQuotePoller(setCompanies) {
  const [lastUpdate, setLastUpdate] = useState(null)   // Date object
  const [age,        setAge       ] = useState(null)   // seconds
  const timerRef   = useRef(null)
  const ageRef     = useRef(null)

  const poll = async () => {
    try {
      invalidate('/companies')  // bust cache so we get fresh data
      const data = await api.companies()
      setCompanies(data)
      setLastUpdate(new Date())
    } catch { /* silent — network may be down */ }
  }

  useEffect(() => {
    // Start polling after first INTERVAL_MS
    timerRef.current = setInterval(poll, INTERVAL_MS)
    return () => clearInterval(timerRef.current)
  }, [])

  // Tick "N seconds ago" every 5s
  useEffect(() => {
    ageRef.current = setInterval(() => {
      if (lastUpdate) {
        setAge(Math.round((Date.now() - lastUpdate.getTime()) / 1000))
      }
    }, 5_000)
    return () => clearInterval(ageRef.current)
  }, [lastUpdate])

  const ageLabel = age === null ? null
    : age < 60  ? `${age}s ago`
    : age < 3600 ? `${Math.floor(age/60)}m ago`
    : null

  return { lastUpdate, ageLabel, refreshNow: poll }
}
