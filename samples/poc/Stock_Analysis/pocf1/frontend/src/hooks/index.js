import { useState, useEffect, useCallback } from 'react'

export function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export function useToast() {
  const [toasts, setToasts] = useState([])
  const push = useCallback((msg, type = 'info') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, msg, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])
  const remove = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), [])
  return { toasts, toast: push, removeToast: remove }
}

export function useLocalStorage(key, fallback) {
  const [val, setVal] = useState(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback }
    catch { return fallback }
  })
  const set = useCallback((v) => {
    const next = typeof v === 'function' ? v(val) : v
    setVal(next)
    localStorage.setItem(key, JSON.stringify(next))
  }, [key, val])
  return [val, set]
}
