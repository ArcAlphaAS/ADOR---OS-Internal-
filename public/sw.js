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
