import { useEffect, useState } from 'react'

const CHECK_MS = 5 * 60 * 1000

// Is a newer ADOR OS published? Compares this app's build id with
// /version.json (see vite.config.js) — on open, every 5 minutes, and
// whenever the app comes back to the front (the usual moment on a phone).
// Production only; a dev server has no version.json.
export function useAppUpdate() {
  const [available, setAvailable] = useState(false)
  useEffect(() => {
    if (import.meta.env.DEV) return
    let stopped = false
    const check = async () => {
      if (stopped || document.visibilityState !== 'visible') return
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' })
        const { build } = await res.json()
        if (build && build !== __BUILD_ID__) setAvailable(true)
      } catch {
        // offline — try again later
      }
    }
    check()
    const t = setInterval(check, CHECK_MS)
    document.addEventListener('visibilitychange', check)
    return () => {
      stopped = true
      clearInterval(t)
      document.removeEventListener('visibilitychange', check)
    }
  }, [])
  return available
}
