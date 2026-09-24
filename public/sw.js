// ADOR OS service worker — the small piece the phone/computer keeps running
// in the background so notifications arrive with the app closed.
//
// It does two things only: shows a push notification sent by the server
// (server/push.js) and, when it's tapped, opens ADOR OS on that
// conversation. No offline caching — the app always loads fresh from the
// network, exactly as before.

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

// Safari (iPhone, iPad, Mac) withdraws push permission from sites that
// receive a push without showing a notification, so there it's always shown.
const ua = self.navigator.userAgent
const strictBrowser = /Safari/.test(ua) && !/Chrome|CriOS|Chromium|Edg|Android/.test(ua)

// The number on the app icon. The open app sends the exact unread count
// ('ador-badge'); with the app closed, each message push adds one. Kept in
// the Cache API so it survives the worker being stopped between pushes.
const BADGE_KEY = '/__ador_badge'
async function readBadge() {
  const res = await (await caches.open('ador-meta')).match(BADGE_KEY)
  return res ? Number(await res.text()) || 0 : 0
}
async function writeBadge(n) {
  await (await caches.open('ador-meta')).put(BADGE_KEY, new Response(String(n)))
  if (self.navigator.setAppBadge) await (n > 0 ? self.navigator.setAppBadge(n) : self.navigator.clearAppBadge()).catch(() => {})
}
self.addEventListener('message', (event) => {
  if (event.data?.type === 'ador-badge') event.waitUntil(writeBadge(Number(event.data.count) || 0))
})

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'ADOR OS', body: event.data ? event.data.text() : '' }
  }
  event.waitUntil(
    (async () => {
      // With ADOR OS open and in front, the in-app toast/call screen already
      // covers it — no second, system-level copy (except where required).
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const inFront = windows.some((w) => w.visibilityState === 'visible' && w.focused)
      if (inFront && !strictBrowser && data.tag !== 'test') return
      if (!inFront && data.tag && data.tag.startsWith('conv:')) await writeBadge((await readBadge()) + 1).catch(() => {})
      await self.registration.showNotification(data.title || 'ADOR OS', {
        body: data.body || '',
        tag: data.tag,
        renotify: Boolean(data.tag),
        icon: '/icon-192.png',
        badge: '/favicon-32.png',
        requireInteraction: data.kind === 'call',
        vibrate: data.kind === 'call' ? [300, 150, 300, 150, 300] : [120],
        data: { url: data.url || '/' },
      })
    })()
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const open = windows.find((w) => new URL(w.url).origin === self.location.origin)
      if (open) {
        await open.focus()
        open.postMessage({ type: 'ador-open', url })
        return
      }
      await self.clients.openWindow(url)
    })()
  )
})
