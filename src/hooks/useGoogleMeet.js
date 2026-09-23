import { useCallback, useEffect, useRef, useState } from 'react'
import { getUserProfile, saveUserProfile } from '../lib/firestore'
import { isGoogleCalendarConfigured, buildAuthUrl, exchangeCode, refreshAccessToken, isReconnectError, fetchPrimaryCalendarEmail, hasMeetScope, createMeetSpace, assertCompanyGoogleAccount } from '../lib/googleCalendar'

// One-click calls from Comunicación. Reuses the same Google connection as
// Calendario (users/{uid}.googleCalendar — one refresh token, two scopes);
// see lib/googleCalendar.js. States:
//   'unavailable'  Google OAuth isn't configured in this build
//   'needsConnect' no connection, or an old one without the Meet scope
//   'ready'        can create Meet rooms in one click
// If the connection was started from the chat (OAuth state=chat), this
// hook is the one that finishes it on the way back.
export function useGoogleMeet(userId) {
  const [status, setStatus] = useState(isGoogleCalendarConfigured ? 'checking' : 'unavailable')
  const [justConnected, setJustConnected] = useState(false)
  const [connectError, setConnectError] = useState(null)
  const loginEmailRef = useRef(null)
  const refreshTokenRef = useRef(null)
  const accessRef = useRef(null)
  const handledRef = useRef(false)

  useEffect(() => {
    if (!userId || userId === 'preview' || !isGoogleCalendarConfigured) {
      if (isGoogleCalendarConfigured) setStatus('needsConnect')
      return
    }
    const url = new URL(window.location.href)
    const code = url.searchParams.get('code')
    if (code && url.searchParams.get('state') === 'chat' && !handledRef.current) {
      handledRef.current = true
      for (const k of ['code', 'scope', 'state', 'authuser', 'prompt']) url.searchParams.delete(k)
      window.history.replaceState({}, '', url.toString())
      exchangeCode(code)
        .then(async ({ accessToken, refreshToken, expiresIn, scope }) => {
          const email = await fetchPrimaryCalendarEmail(accessToken).catch(() => null)
          await assertCompanyGoogleAccount(userId, email, refreshToken)
          accessRef.current = { token: accessToken, expiresAt: Date.now() + expiresIn * 1000 }
          refreshTokenRef.current = refreshToken
          await saveUserProfile(userId, { googleCalendar: { refreshToken, connectedEmail: email, scopes: scope || '', connectedAt: new Date().toISOString() } })
          setStatus(hasMeetScope({ scopes: scope }) ? 'ready' : 'needsConnect')
          setJustConnected(true)
        })
        .catch((error) => {
          setStatus('needsConnect')
          setConnectError(error.message)
        })
      return
    }
    getUserProfile(userId).then(async (profile) => {
      loginEmailRef.current = profile?.email || null
      const saved = profile?.googleCalendar
      if (saved?.refreshToken && saved.connectedEmail) {
        try {
          await assertCompanyGoogleAccount(userId, saved.connectedEmail, saved.refreshToken)
        } catch {
          await saveUserProfile(userId, { googleCalendar: null })
          setStatus('needsConnect')
          return
        }
      }
      refreshTokenRef.current = saved?.refreshToken || null
      setStatus(saved?.refreshToken && hasMeetScope(saved) ? 'ready' : 'needsConnect')
    })
  }, [userId])

  const connect = () => {
    window.location.href = buildAuthUrl('chat', loginEmailRef.current)
  }

  const createRoom = useCallback(async () => {
    let cached = accessRef.current
    if (!cached || cached.expiresAt < Date.now() + 30000) {
      try {
        const { accessToken, expiresIn } = await refreshAccessToken(refreshTokenRef.current)
        cached = { token: accessToken, expiresAt: Date.now() + expiresIn * 1000 }
        accessRef.current = cached
      } catch (error) {
        if (isReconnectError(error)) setStatus('needsConnect')
        throw error
      }
    }
    try {
      return await createMeetSpace(cached.token)
    } catch (error) {
      // Missing scope on an old token → reconnect once.
      if (/insufficient|scope|PERMISSION_DENIED/i.test(error.message)) setStatus('needsConnect')
      throw error
    }
  }, [])

  return { status, connect, createRoom, justConnected, clearJustConnected: () => setJustConnected(false), connectError, clearConnectError: () => setConnectError(null) }
}
