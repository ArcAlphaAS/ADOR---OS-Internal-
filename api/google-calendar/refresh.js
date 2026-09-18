// Vercel serverless function — trades a stored refresh token for a fresh
// access token. Same reason this can't happen in the browser as
// exchange.js: refreshing also requires the client secret. See
// src/lib/googleCalendar.js's isReconnectError() for how the client tells
// a normal failure apart from "the 7-day Testing-mode token expired,
// reconnect" (Google returns `invalid_grant` for that case).

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const clientId = process.env.VITE_GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    res.status(500).json({ error: 'Google OAuth no está configurado en Vercel todavía.' })
    return
  }

  const { refreshToken } = req.body || {}
  if (!refreshToken) {
    res.status(400).json({ error: 'Falta refreshToken.' })
    return
  }

  try {
    const tokenRes = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
      }),
    })
    const data = await tokenRes.json()

    if (!tokenRes.ok) {
      // Keep the raw error code (e.g. "invalid_grant") in the message so
      // the client's isReconnectError() can reliably detect an expired/
      // revoked token instead of a generic failure.
      const message = data.error ? `${data.error}: ${data.error_description || ''}`.trim() : 'Error al renovar el acceso a Google.'
      res.status(tokenRes.status).json({ error: message })
      return
    }

    res.status(200).json({ accessToken: data.access_token, expiresIn: data.expires_in })
  } catch (error) {
    res.status(500).json({ error: error.message || 'Error inesperado renovando el acceso a Google.' })
  }
}
