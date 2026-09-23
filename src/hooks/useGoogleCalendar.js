import { useCallback, useEffect, useRef, useState } from 'react'
import { getUserProfile, saveUserProfile } from '../lib/firestore'
import {
  isGoogleCalendarConfigured,
  buildAuthUrl,
  exchangeCode,
  refreshAccessToken,
  isReconnectError,
  fetchPrimaryCalendarEmail,
  assertCompanyGoogleAccount,
  fetchEvents,
} from '../lib/googleCalendar'

function startOfWeek(date) {
  const d = new Date(date)
  const diff = (d.getDay() + 6) % 7 // Monday-first
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}
function defaultRange() {
  const start = startOfWeek(new Date())
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return { start, end }
}

// Owns the whole Google Calendar connection lifecycle for the signed-in
// user — reading/writing the stored refresh token, handling the OAuth
// redirect back from Google, keeping a short-lived access token in memory,
// and loading events for whatever date range CalendarioModule is currently
// showing (Día/Semana/Mes all just ask for a different range via
// `loadRange`). See lib/googleCalendar.js for the why behind each piece
// (read-only scope, no server-side Firestore access, the 7-day Testing-mode
// reconnect case).
//
// `status`: 'checking' | 'disconnected' | 'connecting' | 'loading' | 'ready' | 'error' | 'needsReconnect'
// `initialRange` (optional, a function returning {start, end}): what to
// load on first connect instead of the current week — Inicio asks for the
// next two weeks so it can show the next meeting.
export function useGoogleCalendar(userId, { initialRange } = {}) {
  const firstRange = initialRange || defaultRange
  const [status, setStatus] = useState('checking')
  const [connectedEmail, setConnectedEmail] = useState(null)
  const [events, setEvents] = useState([])
  const [error, setError] = useState(null)
  const accessTokenRef = useRef(null) // { token, expiresAt } — never persisted
  const refreshTokenRef = useRef(null)
  const oauthHandledRef = useRef(false)

  const ensureAccessToken = useCallback(async () => {
    let cached = accessTokenRef.current
    if (!cached || cached.expiresAt < Date.now() + 30000) {
      const { accessToken, expiresIn } = await refreshAccessToken(refreshTokenRef.current)
      cached = { token: accessToken, expiresAt: Date.now() + expiresIn * 1000 }
      accessTokenRef.current = cached
    }
    return cached.token
  }, [])

  // Called whenever the visible view's date range changes (switching
  // Día/Semana/Mes, or paging forward/back) — not just once on connect.
  const loadRange = useCallback(
    async (range) => {
      if (!refreshTokenRef.current) return
      setStatus('loading')
      setError(null)
      try {
        const token = await ensureAccessToken()
        const items = await fetchEvents(token, { timeMin: range.start, timeMax: range.end })
        setEvents(items)
        setStatus('ready')
      } catch (err) {
        if (isReconnectError(err)) {
          setStatus('needsReconnect')
          setConnectedEmail(null)
          refreshTokenRef.current = null
          if (userId && userId !== 'preview') saveUserProfile(userId, { googleCalendar: null })
        } else {
          setStatus('error')
          setError(err.message)
        }
      }
    },
    [ensureAccessToken, userId]
  )

  // On mount: either finish an in-progress OAuth redirect (a `?code=...` in
  // the URL means Google just sent the user back here), or load whatever
  // connection is already stored.
  useEffect(() => {
    if (!userId) return

    const url = new URL(window.location.href)
    const code = url.searchParams.get('code')
    // A connection started from the chat (state=chat) is finished by
    // useGoogleMeet instead — only one hook may spend the one-time code.
    const startedHere = url.searchParams.get('state') !== 'chat'

    if (code && startedHere && !oauthHandledRef.current) {
      oauthHandledRef.current = true
      setStatus('connecting')
      url.searchParams.delete('code')
      url.searchParams.delete('scope')
      url.searchParams.delete('state')
      window.history.replaceState({}, '', url.toString())

      exchangeCode(code)
        .then(async ({ accessToken, refreshToken, expiresIn, scope }) => {
          const email = await fetchPrimaryCalendarEmail(accessToken)
          if (userId !== 'preview') await assertCompanyGoogleAccount(userId, email, refreshToken)
          accessTokenRef.current = { token: accessToken, expiresAt: Date.now() + expiresIn * 1000 }
          refreshTokenRef.current = refreshToken
          setConnectedEmail(email)
          if (userId !== 'preview') {
            await saveUserProfile(userId, { googleCalendar: { refreshToken, connectedEmail: email, scopes: scope || '', connectedAt: new Date().toISOString() } })
          }
          const range = firstRange()
          const items = await fetchEvents(accessToken, { timeMin: range.start, timeMax: range.end })
          setEvents(items)
          setStatus('ready')
        })
        .catch((err) => {
          setStatus('error')
          setError(err.message)
        })
      return
    }

    if (userId === 'preview') {
      setStatus('disconnected')
      return
    }

    getUserProfile(userId).then(async (profile) => {
      const saved = profile?.googleCalendar
      // A connection made before the company-account rule existed is
      // checked too; a non-company account is disconnected, not used.
      if (saved?.refreshToken && saved.connectedEmail) {
        try {
          await assertCompanyGoogleAccount(userId, saved.connectedEmail, saved.refreshToken)
        } catch (err) {
          await saveUserProfile(userId, { googleCalendar: null })
          setStatus('error')
          setError(err.message)
          return
        }
      }
      if (saved?.refreshToken) {
        refreshTokenRef.current = saved.refreshToken
        setConnectedEmail(saved.connectedEmail || null)
        loadRange(firstRange())
      } else {
        setStatus('disconnected')
      }
    })
  }, [userId, loadRange])

  const connect = async () => {
    const profile = userId && userId !== 'preview' ? await getUserProfile(userId) : null
    window.location.href = buildAuthUrl('calendario', profile?.email)
  }

  const disconnect = async () => {
    accessTokenRef.current = null
    refreshTokenRef.current = null
    setConnectedEmail(null)
    setEvents([])
    setStatus('disconnected')
    if (userId && userId !== 'preview') await saveUserProfile(userId, { googleCalendar: null })
  }

  const refresh = async (range) => {
    const profile = await getUserProfile(userId)
    const refreshToken = profile?.googleCalendar?.refreshToken
    if (refreshToken) {
      refreshTokenRef.current = refreshToken
      loadRange(range || defaultRange())
    }
  }

  return { configured: isGoogleCalendarConfigured, status, connectedEmail, events, error, connect, disconnect, refresh, loadRange }
}
