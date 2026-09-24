// Vercel adapter for the shared handlers in ./handlers.js — kept only while
// the move to Cloudflare Pages is being tested; delete api/ and this file
// once Vercel is switched off.
export function vercel(handler) {
  return async (req, res) => {
    const { status, json } = await handler({ method: req.method, headers: { authorization: req.headers.authorization || '' }, body: req.body }, process.env)
    res.status(status).json(json)
  }
}
