// Vercel serverless function — the only server-side code in this project.
// Exists purely to keep the Gemini API key out of the client bundle: a
// Vite env var (VITE_*) is compiled straight into the shipped JS and
// anyone can read it from devtools, so the key lives here instead, as a
// plain (non-VITE_) Vercel environment variable only this function can see.
// The client (AdorIAModule.jsx) never talks to Gemini directly — it posts
// to this endpoint, which forwards the request and relays the reply.
//
// Known limitation: this endpoint has no auth check of its own (no Firebase
// ID token verification) — it trusts that the URL isn't public knowledge,
// same class of tradeoff as the rest of this internal, invite-only tool.
// Revisit if ADOR OS ever needs to withstand a determined outside attacker;
// today the real risk is just "someone burns the free daily quota," not a
// data leak, since this route doesn't touch Firestore at all.

const MODEL = 'gemini-2.5-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'GEMINI_API_KEY no está configurada en Vercel todavía.' })
    return
  }

  const { systemInstruction, messages } = req.body || {}
  if (!systemInstruction || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'Falta systemInstruction o messages.' })
    return
  }

  try {
    const geminiRes = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: messages.map((m) => ({ role: m.role, parts: [{ text: m.content }] })),
      }),
    })

    const data = await geminiRes.json()

    if (!geminiRes.ok) {
      res.status(geminiRes.status).json({ error: data.error?.message || 'Error al llamar a Gemini.' })
      return
    }

    const reply = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || ''
    if (!reply) {
      res.status(502).json({ error: 'Gemini no devolvió una respuesta utilizable.' })
      return
    }

    res.status(200).json({ reply })
  } catch (error) {
    res.status(500).json({ error: error.message || 'Error inesperado contactando a Gemini.' })
  }
}
