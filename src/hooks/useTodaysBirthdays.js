import { useEffect, useState } from 'react'
import { subscribeUsers } from '../lib/firestore'

// Team-wide "who's celebrating today" — reads the same users/{uid}.birthday
// field ProfileModal already writes (YYYY-MM-DD, chosen via <input
// type="date">). Compares month/day only (not year, obviously) against
// today's real date. Lives outside useHomeData for the same reason
// useClientNotifications/useTaskNotifications do — the bell needs it
// everywhere, not just while Home is open.
export function useTodaysBirthdays() {
  const [users, setUsers] = useState([])

  useEffect(() => subscribeUsers(setUsers), [])

  const now = new Date()
  const todayKey = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  return users
    .filter((u) => u.birthday && u.birthday.slice(5) === todayKey)
    .map((u) => ({ uid: u.id, displayName: u.displayName || 'Alguien del equipo', photoDataUrl: u.photoDataUrl || null }))
}
