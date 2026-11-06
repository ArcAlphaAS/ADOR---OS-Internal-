// Vista previa de un enlace (título, descripción, imagen) para el chat. El
// navegador no puede leer otras páginas (CORS), así que lo hace el servidor.
// Solo para quien tiene sesión en ADOR OS (se comprueba con su token). Lee como
// máximo 200 KB, con 4 s de espera, y solo http/https a nombres públicos.
import { firestore } from './push.js'

const json = (status, body) => ({ status, json: body })
const BLOCKED = /^(localhost|.*\.local|.*\.internal|0\.0\.0\.0)$/i
const isPrivateIp = (h) => /^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h) || h.includes(':')

function meta(html, ...names) {
  for (const n of names) {
    const re = new RegExp(`<meta[^>]+(?:property|name)=["']${n}["'][^>]*>`, 'i')
    const tag = html.match(re)?.[0]
    const content = tag?.match(/content=["']([^"']*)["']/i)?.[1]
    if (content) return content.replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').trim()
  }
  return null
}

export async function linkPreview({ method, headers, body }, env) {
  if (method !== 'POST') return json(405, { error: 'Method not allowed' })
  const auth = headers.authorization || ''
  if (!auth.startsWith('Bearer ') || !env.FIREBASE_PROJECT_ID) return json(401, { error: 'Falta la sesión.' })
  try {
    // Una lectura cualquiera prueba que el token es de alguien con acceso a ADOR OS.
    await firestore(env, auth.slice(7)).getMany(['settings/seasons'])
  } catch {
    return json(401, { error: 'Sesión no válida.' })
  }
  let url
  try {
    url = new URL(String(body?.url || ''))
  } catch {
    return json(400, { error: 'Enlace no válido.' })
  }
  if (!/^https?:$/.test(url.protocol) || BLOCKED.test(url.hostname) || isPrivateIp(url.hostname) || !url.hostname.includes('.')) return json(400, { error: 'Enlace no permitido.' })

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 4000)
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ADOR-OS-LinkPreview/1.0)', Accept: 'text/html' } })
    if (!res.ok || !(res.headers.get('content-type') || '').includes('html')) return json(200, { url: url.href, host: url.hostname })
    // Solo el principio de la página: ahí están las etiquetas.
    const reader = res.body.getReader()
    let html = ''
    const dec = new TextDecoder()
    while (html.length < 200000) {
      const { done, value } = await reader.read()
      if (done) break
      html += dec.decode(value, { stream: true })
      if (/<\/head>/i.test(html)) break
    }
    reader.cancel().catch(() => {})
    const title = meta(html, 'og:title', 'twitter:title') || html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || null
    let image = meta(html, 'og:image', 'twitter:image')
    if (image) {
      try {
        image = new URL(image, res.url).href
      } catch {
        image = null
      }
    }
    return json(200, { url: url.href, host: url.hostname.replace(/^www\./, ''), site: meta(html, 'og:site_name'), title, description: meta(html, 'og:description', 'description', 'twitter:description')?.slice(0, 200) || null, image })
  } catch {
    return json(200, { url: url.href, host: url.hostname })
  } finally {
    clearTimeout(timer)
  }
}
