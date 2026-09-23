import { useEffect } from 'react'
import { writePresence, getUserProfile, setCalendarBusy } from '../lib/firestore'
import { refreshAccessToken, fetchCurrentBusy } from '../lib/googleCalendar'

const CALENDAR_CHECK_MS = 5 * 60 * 1000

// Keeps presence/{uid} current for as long as ADOR OS is open (mounted once
// in AppShell.jsx). "online" while the tab is visible, refreshed every
// minute; "away" when the tab/window goes to the background; "offline" on
// close. The close write is best-effort — a crashed browser or a sleeping
// laptop can't send it — which is why readers also treat any heartbeat
// older than ~2 minutes as no longer online (lib/chat.js presenceOf).
//
// If the person connected their Google account, it also checks their own
// calendar every 5 minutes and publishes only "busy until HH:MM" (+ whether
// it's a meeting) — that's what shows "En reunión" to the team and quiets
// calls and message sounds meanwhile. Titles and guests never leave here.
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

    let lastBusyKey = null
    const checkCalendar = async () => {
      try {
        const profile = await getUserProfile(uid)
        const refreshToken = profile?.googleCalendar?.refreshToken
        if (!refreshToken) return
        const { accessToken } = await refreshAccessToken(refreshToken)
        const busy = await fetchCurrentBusy(accessToken)
        const key = busy ? `${busy.until.getTime()}:${busy.meeting}` : 'free'
        if (key === lastBusyKey) return
        lastBusyKey = key
        await setCalendarBusy(uid, busy)
      } catch {
        // no connection / expired / offline — presence just won't say "En reunión"
      }
    }
    checkCalendar()
    const calTimer = setInterval(checkCalendar, CALENDAR_CHECK_MS)

    return () => {
      clearInterval(timer)
      clearInterval(calTimer)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onClose)
    }
  }, [uid])
}
