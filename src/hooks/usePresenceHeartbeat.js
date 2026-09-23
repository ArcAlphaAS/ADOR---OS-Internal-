import { useEffect } from 'react'
import { writePresence } from '../lib/firestore'

// Keeps presence/{uid} current for as long as ADOR OS is open (mounted once
// in AppShell.jsx). "online" while the tab is visible, refreshed every
// minute; "away" when the tab/window goes to the background; "offline" on
// close. The close write is best-effort — a crashed browser or a sleeping
// laptop can't send it — which is why readers also treat any heartbeat
// older than ~2 minutes as no longer online (lib/chat.js presenceOf).
export function usePresenceHeartbeat(uid) {
  useEffect(() => {
    if (!uid || uid === 'preview') return
    const state = () => (document.visibilityState === 'visible' ? 'online' : 'away')
    const beat = () => writePresence(uid, state()).catch(() => {})
    beat()
    const timer = setInterval(() => document.visibilityState === 'visible' && beat(), 60_000)
    const onVisibility = () => beat()
    const onClose = () => writePresence(uid, 'offline').catch(() => {})
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onClose)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onClose)
    }
  }, [uid])
}
