import { useCallback, useEffect, useRef, useState } from 'react'
import { getUserProfile, saveUserProfile } from '../lib/firestore'
import {
  isGoogleCalendarConfigured,
  buildAuthUrl,
  exchangeCode,
  refreshAccessToken,
  isReconnectError,
  fetchPrimaryCalendarEmail,
  fetchUpcomingEvents,
} from '../lib/googleCalendar'

// Owns the whole Google Calendar connection lifecycle for the signed-in
// user — reading/writing the stored refresh token, handling the OAuth
// redirect back from Google, keeping a short-lived access token in memory,
// and loading events. See lib/googleCalendar.js for the why behind each
// piece (read-only scope, no server-side Firestore access, the 7-day
// Testing-mode reconnect case).
//
// `status`: 'checking' | 'disconnected' | 'connecting' | 'loading' | 'ready' | 'error' | 'needsReconnect'
export function useGoogleCalendar(userId) {
  const [status, setStatus] = useState('checking')
  const [connectedEmail, setConnectedEmail] = useState(null)
  const [events, setEvents] = useState([])
  const [error, setError] = useState(null)
  const accessTokenRef = useRef(null) // { token, expiresAt } — never persisted
  const oauthHandledRef = useRef(false)

  const loadEvents = useCallback(async (refreshToken) => {
    setStatus('loading')
    setError(null)
    try {
      let cached = accessTokenRef.current
      if (!cached || cached.expiresAt < Date.now() + 30000) {
        const { accessToken, expiresIn } = await refreshAccessToken(refreshToken)
        cached = { token: accessToken, expiresAt: Date.now() + expiresIn * 1000 }
        accessTokenRef.current = cached
      }
      const items = await fetchUpcomingEvents(cached.token)
      setEvents(items)
      setStatus('ready')
    } catch (err) {
      if (isReconnectError(err)) {
        setStatus('needsReconnect')
        setConnectedEmail(null)
        if (userId && userId !== 'preview') saveUserProfile(userId, { googleCalendar: null })
      } else {
        setStatus('error')
        setError(err.message)
      }
    }
  }, [userId])

  // On mount: either finish an in-progress OAuth redirect (a `?code=...` in
  // the URL means Google just sent the user back here), or load whatever
  // connection is already stored.
  useEffect(() => {
    if (!userId) return

    const url = new URL(window.location.href)
    const code = url.searchParams.get('code')

    if (code && !oauthHandledRef.current) {
      oauthHandledRef.current = true
      setStatus('connecting')
      url.searchParams.delete('code')
      url.searchParams.delete('scope')
      window.history.replaceState({}, '', url.toString())

      exchangeCode(code)
        .then(async ({ accessToken, refreshToken, expiresIn }) => {
          accessTokenRef.current = { token: accessToken, expiresAt: Date.now() + expiresIn * 1000 }
          const email = await fetchPrimaryCalendarEmail(accessToken)
          setConnectedEmail(email)
          if (userId !== 'preview') {
            await saveUserProfile(userId, { googleCalendar: { refreshToken, connectedEmail: email, connectedAt: new Date().toISOString() } })
          }
          const items = await fetchUpcomingEvents(accessToken)
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

    getUserProfile(userId).then((profile) => {
      const saved = profile?.googleCalendar
      if (saved?.refreshToken) {
        setConnectedEmail(saved.connectedEmail || null)
        loadEvents(saved.refreshToken)
      } else {
        setStatus('disconnected')
      }
    })
  }, [userId, loadEvents])

  const connect = () => {
    window.location.href = buildAuthUrl()
  }

  const disconnect = async () => {
    accessTokenRef.current = null
    setConnectedEmail(null)
    setEvents([])
    setStatus('disconnected')
    if (userId && userId !== 'preview') await saveUserProfile(userId, { googleCalendar: null })
  }

  const refresh = async () => {
    const profile = await getUserProfile(userId)
    const refreshToken = profile?.googleCalendar?.refreshToken
    if (refreshToken) loadEvents(refreshToken)
  }

  return { configured: isGoogleCalendarConfigured, status, connectedEmail, events, error, connect, disconnect, refresh }
}
