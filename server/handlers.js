// ADOR OS's server-side code — the few steps that can't run in the browser
// because they need a secret (Google's OAuth client secret, the Gemini key)
// or a server hop (Meet's API). Written once here, host-independent: each
// handler takes a plain request { method, headers, body } plus the env vars
// and returns { status, json }. Thin adapters expose them on each host:
//   server/worker.js → Cloudflare Workers (where ADOR OS runs)
//   api/…            → Vercel (kept while the move to Cloudflare is tested)
// None of them touch Firestore or store anything.

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const json = (status, body) => ({ status, json: body })

function googleEnv(env) {
  const clientId = env.VITE_GOOGLE_CLIENT_ID
  const clientSecret = env.GOOGLE_CLIENT_SECRET
  return clientId && clientSecret ? { clientId, clientSecret } : null
}

// Trades a Google OAuth authorization code for tokens (connect Google).
// The client then saves its own refresh token to its own users/{uid} doc.
export async function googleExchange({ method, body }, env) {
  if (method !== 'POST') return json(405, { error: 'Method not allowed' })
  const g = googleEnv(env)
  if (!g) return json(500, { error: 'Google OAuth no está configurado en el servidor todavía.' })
  const { code, redirectUri } = body || {}
  if (!code || !redirectUri) return json(400, { error: 'Falta code o redirectUri.' })
  try {
    const res = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: g.clientId, client_secret: g.clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
    })
    const data = await res.json()
    if (!res.ok) return json(res.status, { error: data.error_description || data.error || 'Error al conectar con Google.' })
    if (!data.refresh_token) {
      return json(400, { error: 'Google no devolvió un token de actualización. Revoca el acceso en myaccount.google.com/permissions e inténtalo de nuevo.' })
    }
    return json(200, { accessToken: data.access_token, refreshToken: data.refresh_token, expiresIn: data.expires_in, scope: data.scope || '' })
  } catch (error) {
    return json(500, { error: error.message || 'Error inesperado conectando con Google.' })
  }
}

// Trades a stored refresh token for a fresh short-lived access token. The
// raw Google error code (e.g. "invalid_grant") stays in the message so the
// client's isReconnectError() can tell "reconnect" from a real failure.
export async function googleRefresh({ method, body }, env) {
  if (method !== 'POST') return json(405, { error: 'Method not allowed' })
  const g = googleEnv(env)
  if (!g) return json(500, { error: 'Google OAuth no está configurado en el servidor todavía.' })
  const { refreshToken } = body || {}
  if (!refreshToken) return json(400, { error: 'Falta refreshToken.' })
  try {
    const res = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ refresh_token: refreshToken, client_id: g.clientId, client_secret: g.clientSecret, grant_type: 'refresh_token' }),
    })
    const data = await res.json()
    if (!res.ok) {
      const message = data.error ? `${data.error}: ${data.error_description || ''}`.trim() : 'Error al renovar el acceso a Google.'
      return json(res.status, { error: message })
    }
    return json(200, { accessToken: data.access_token, expiresIn: data.expires_in })
  } catch (error) {
    return json(500, { error: error.message || 'Error inesperado renovando el acceso a Google.' })
  }
}

// Creates a Google Meet room for a one-click call, with the caller's own
// short-lived access token (never the refresh token). accessType OPEN:
// anyone with the link joins without "asking to join" — the link is only
// ever posted inside ADOR OS's private chat.
export async function meetSpace({ method, headers }) {
  if (method !== 'POST') return json(405, { error: 'Method not allowed' })
  const auth = headers.authorization || ''
  if (!auth.startsWith('Bearer ')) return json(401, { error: 'Falta el acceso a Google.' })
  try {
    const res = await fetch('https://meet.googleapis.com/v2/spaces', {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: { accessType: 'OPEN' } }),
    })
    const data = await res.json()
    if (!res.ok) return json(res.status, { error: data.error?.message || 'Google Meet rechazó la solicitud.', status: data.error?.status || null })
    return json(200, { meetingUri: data.meetingUri, meetingCode: data.meetingCode })
  } catch (error) {
    return json(500, { error: error.message || 'Error inesperado creando la reunión.' })
  }
}

// Dormant Gemini path for ADOR IA (CLAUDE.md §16/§17): the live ADOR IA runs
// on a local rule-based engine by the user's choice. Kept so switching back
// is only a matter of setting GEMINI_API_KEY.
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'
export async function adorIA({ method, body }, env) {
  if (method !== 'POST') return json(405, { error: 'Method not allowed' })
  if (!env.GEMINI_API_KEY) return json(500, { error: 'GEMINI_API_KEY no está configurada en el servidor.' })
  const { systemInstruction, messages } = body || {}
  if (!systemInstruction || !Array.isArray(messages) || messages.length === 0) return json(400, { error: 'Falta systemInstruction o messages.' })
  try {
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: messages.map((m) => ({ role: m.role, parts: [{ text: m.content }] })),
      }),
    })
    const data = await res.json()
    if (!res.ok) return json(res.status, { error: data.error?.message || 'Error al llamar a Gemini.' })
    const reply = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || ''
    if (!reply) return json(502, { error: 'Gemini no devolvió una respuesta utilizable.' })
    return json(200, { reply })
  } catch (error) {
    return json(500, { error: error.message || 'Error inesperado contactando a Gemini.' })
  }
}
