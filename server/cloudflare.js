// Cloudflare adapter: turns a Workers request into the plain
// { method, headers, body } the shared handlers in ./handlers.js expect.
// Env vars come from the Worker's Variables and Secrets (env).
export function cloudflare(handler) {
  return async ({ request, env }) => {
    let body = null
    if (request.method === 'POST') body = await request.json().catch(() => null)
    const headers = { authorization: request.headers.get('authorization') || '' }
    const { status, json } = await handler({ method: request.method, headers, body }, env)
    return new Response(JSON.stringify(json), { status, headers: { 'Content-Type': 'application/json' } })
  }
}
