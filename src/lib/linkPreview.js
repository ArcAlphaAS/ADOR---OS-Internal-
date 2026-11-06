import { auth } from '../firebase'

// Vista previa de enlaces del chat: la pide al servidor (/api/link-preview) y
// la recuerda en esta sesión para no repetir la consulta.
const cache = new Map()
const SKIP = /(meet\.google\.com|docs\.google\.com|drive\.google\.com|calendar\.google\.com|localhost)/i

export const firstPreviewableUrl = (text) => {
  const m = (text || '').match(/https?:\/\/[^\s<>"')]+/)
  return m && !SKIP.test(m[0]) ? m[0].replace(/[.,;:!?]+$/, '') : null
}

export function fetchLinkPreview(url) {
  if (cache.has(url)) return cache.get(url)
  const user = auth?.currentUser
  const p =
    !user || import.meta.env.DEV
      ? Promise.resolve(null)
      : user
          .getIdToken()
          .then((token) => fetch('/api/link-preview', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ url }) }))
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
  cache.set(url, p)
  return p
}
