// Google Calendar integration — read-only "reflejo" of the signed-in
// founder's own Google Calendar, per direct user decision (see CLAUDE.md):
// full read/write uses a Google-classified "restricted" scope that's a real
// pain to get out of Testing mode (Google's own security-review process);
// read-only (`calendar.readonly`) is "sensitive," not "restricted," which
// keeps a real path open to a persistent connection later without that
// heavier review. Each founder connects their own account independently —
// there's no combined team view, since Google Calendar itself already
// merges invited events into each person's own calendar.
//
// Architecture mirrors the ADOR IA/Gemini pattern (lib/adorIA.js +
// api/ador-ia.js): the OAuth client secret can never reach the browser, so
// the two calls that need it (exchanging a code, refreshing a token) go
// through tiny Vercel serverless functions. Listing events happens directly
// from the browser against Google's REST API with the resulting access
// token — no server involved, since that call needs no secret.
//
// Access tokens are kept in memory only (component/hook state), never
// persisted — only the long-lived refresh token is stored, on
// `users/{uid}.googleCalendar` (same blanket Firestore rule as everything
// else in this app; see the "known limitation" note below).
//
// Known limitation, accepted deliberately: with the OAuth consent screen in
// "Testing" publishing status (fine for a 3-person internal tool, no
// verification needed), Google expires refresh tokens after 7 days —
// reconnecting periodically is expected, not a bug. `isReconnectError()`
// below is how the UI tells that case apart from a real failure.
//
// Known limitation, same tradeoff already accepted for ador-ia.js: the
// refresh token sits in a Firestore doc covered by this app's one blanket
// rule (`request.auth != null` + `allowedEmails`), so any of the 3
// founders could technically read another's stored token. Same trust
// posture already accepted everywhere else in this 3-person tool.

const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly'
const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

export const isGoogleCalendarConfigured = Boolean(CLIENT_ID)

// The redirect URI is the app's own bare origin — Google redirects back
// here with `?code=...` in the query string, which useGoogleCalendar.js
// picks up on load instead of needing a dedicated server route.
function redirectUri() {
  return window.location.origin + window.location.pathname
}

export function buildAuthUrl() {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent', // forces a fresh refresh_token every time, not just on first-ever consent
  })
  return `${AUTH_ENDPOINT}?${params.toString()}`
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Error inesperado.')
  return data
}

export function exchangeCode(code) {
  return postJson('/api/google-calendar/exchange', { code, redirectUri: redirectUri() })
}

export function refreshAccessToken(refreshToken) {
  return postJson('/api/google-calendar/refresh', { refreshToken })
}

// A refresh failing with `invalid_grant` means the 7-day Testing-mode token
// expired (or the user revoked access from their Google account) — the
// honest response is "reconnect," not a generic error toast.
export function isReconnectError(error) {
  return /invalid_grant/i.test(error?.message || '')
}

async function callCalendarApi(path, accessToken) {
  const res = await fetch(`https://www.googleapis.com/calendar/v3/${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || 'Error consultando Google Calendar.')
  return data
}

// The primary calendar's own `id` is the connected account's email —
// enough to show "Conectado como x@gmail.com" without requesting an extra
// scope just for that.
export function fetchPrimaryCalendarEmail(accessToken) {
  return callCalendarApi('calendars/primary', accessToken).then((data) => data.id)
}

// Google's own 11 event colors (Calendar API's stable colorId → hex map —
// these values are documented/well-known, not fetched from colors().get()
// to avoid an extra round-trip). Coloring the grid by each event's real
// Google color (falling back to ADOR's own blue for "no override set") is
// what makes this an honest reflection rather than an invented category
// system — the same colors the user already sees in Google Calendar itself.
export const GOOGLE_EVENT_COLORS = {
  1: '#7986cb', // Lavender
  2: '#33b679', // Sage
  3: '#8e24aa', // Grape
  4: '#e67c73', // Flamingo
  5: '#f6bf26', // Banana
  6: '#f4511e', // Tangerine
  7: '#039be5', // Peacock
  8: '#616161', // Graphite
  9: '#3f51b5', // Blueberry
  10: '#0b8043', // Basil
  11: '#d50000', // Tomato
}
const DEFAULT_EVENT_COLOR = '#1E5FAD'

export function eventColor(event) {
  return GOOGLE_EVENT_COLORS[event.colorId] || DEFAULT_EVENT_COLOR
}

export async function fetchEvents(accessToken, { timeMin, timeMax }) {
  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  })
  const data = await callCalendarApi(`calendars/primary/events?${params.toString()}`, accessToken)
  return (data.items || []).map((e) => ({
    id: e.id,
    title: e.summary || '(Sin título)',
    location: e.location || null,
    allDay: Boolean(e.start?.date && !e.start?.dateTime),
    start: e.start?.dateTime || e.start?.date,
    end: e.end?.dateTime || e.end?.date,
    colorId: e.colorId || null,
    htmlLink: e.htmlLink,
    description: e.description || null,
    attendees: (e.attendees || []).map((a) => ({ name: a.displayName || a.email, email: a.email, self: Boolean(a.self), organizer: Boolean(a.organizer) })),
    // "Meeting" = has other guests invited, per Google's own attendees list
    // (excluding yourself as organizer) — used by the greeting card's
    // "eventos" vs. "reuniones" split, a real distinction, not a guess.
    isMeeting: (e.attendees || []).some((a) => !a.self),
  }))
}
