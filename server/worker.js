// ADOR OS on Cloudflare Workers (static assets + a small API).
// Requests to /api/* run the shared handlers in ./handlers.js; everything
// else is the built app in dist/ (served by Cloudflare's asset layer, with
// index.html as the fallback for the single-page app — see wrangler.jsonc).
import { cloudflare } from './cloudflare.js'
import { googleExchange, googleRefresh, meetSpace, adorIA } from './handlers.js'

const ROUTES = {
  '/api/google-calendar/exchange': cloudflare(googleExchange),
  '/api/google-calendar/refresh': cloudflare(googleRefresh),
  '/api/google-meet/space': cloudflare(meetSpace),
  '/api/ador-ia': cloudflare(adorIA),
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url)
    const route = ROUTES[pathname]
    if (route) return route({ request, env })
    if (pathname.startsWith('/api/')) return new Response(JSON.stringify({ error: 'No encontrado' }), { status: 404, headers: { 'Content-Type': 'application/json' } })
    return env.ASSETS.fetch(request)
  },
}
