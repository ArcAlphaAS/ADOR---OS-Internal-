// Vercel serverless function — exchanges a Google OAuth authorization code
// for tokens. This is the one step in the whole Google Calendar flow that
// needs the client secret, so it's the one step that can't happen in the
// browser (see src/lib/googleCalendar.js for the rest of the flow, which
// talks to Google directly). Deliberately does NOT touch Firestore — it
// just returns the tokens, and the client (already signed in, so it
// already satisfies Firestore's rules) writes its own refresh token to its
// own users/{uid} doc. That sidesteps needing Firebase Admin/a service
// account just for this one write, matching this project's existing
// "no server-side Firestore access" posture (api/ador-ia.js is the only
// other server-side code here, and it doesn't touch Firestore either).

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  // VITE_ only controls what Vite bundles into the client — a Vercel
  // serverless function reads any env var via process.env regardless of
  // that prefix, so this one Node.js process can see both the public
  // client ID and the private secret.
  const clientId = process.env.VITE_GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    res.status(500).json({ error: 'Google OAuth no está configurado en Vercel todavía.' })
    return
  }

  const { code, redirectUri } = req.body || {}
  if (!code || !redirectUri) {
    res.status(400).json({ error: 'Falta code o redirectUri.' })
    return
  }

  try {
    const tokenRes = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })
    const data = await tokenRes.json()

    if (!tokenRes.ok) {
      res.status(tokenRes.status).json({ error: data.error_description || data.error || 'Error al conectar con Google.' })
      return
    }
    if (!data.refresh_token) {
      res.status(400).json({
        error: 'Google no devolvió un token de actualización. Revoca el acceso en myaccount.google.com/permissions e inténtalo de nuevo.',
      })
      return
    }

    res.status(200).json({ accessToken: data.access_token, refreshToken: data.refresh_token, expiresIn: data.expires_in })
  } catch (error) {
    res.status(500).json({ error: error.message || 'Error inesperado conectando con Google.' })
  }
}
