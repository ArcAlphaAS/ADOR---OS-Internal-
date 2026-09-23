// Vercel serverless function — creates a Google Meet room for a one-click
// call from Comunicación. The browser sends the signed-in founder's own
// short-lived Google access token (never the refresh token or client
// secret); this just forwards it to Meet's REST API and returns the join
// link. It exists only so the call doesn't depend on Meet's API accepting
// cross-origin requests from the browser. No Firestore, no stored state.
//
// accessType OPEN: anyone with the link joins without "asking to join".
// The link is only ever posted inside ADOR OS's private chat, and it saves
// the host from admitting teammates who use a different Google account.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  const auth = req.headers.authorization || ''
  if (!auth.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Falta el acceso a Google.' })
    return
  }
  try {
    const meetRes = await fetch('https://meet.googleapis.com/v2/spaces', {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: { accessType: 'OPEN' } }),
    })
    const data = await meetRes.json()
    if (!meetRes.ok) {
      const message = data.error?.message || 'Google Meet rechazó la solicitud.'
      // 403 with this wording = the Meet API isn't enabled in the Cloud
      // project, or the token lacks the meetings scope — both fixable, both
      // worth saying plainly.
      res.status(meetRes.status).json({ error: message, status: data.error?.status || null })
      return
    }
    res.status(200).json({ meetingUri: data.meetingUri, meetingCode: data.meetingCode })
  } catch (error) {
    res.status(500).json({ error: error.message || 'Error inesperado creando la reunión.' })
  }
}
