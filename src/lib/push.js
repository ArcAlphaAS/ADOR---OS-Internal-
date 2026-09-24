import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { auth } from '../firebase'
import { db } from './firestore'

// Notificaciones push, the app side. See server/push.js for the full
// picture; in short: this device turns notifications on once (a button —
// browsers only ask from a tap), its private push address is saved in
// pushSubscriptions/{id}, and when you message/mention/call someone your
// app asks /api/push/send to notify them. The server decides who actually
// hears about it, with the same rules as the bell.
//
// On iPhone/iPad this only exists once ADOR OS is on the home screen
// (Safari → Compartir → Añadir a pantalla de inicio) — in a Safari tab
// there's no PushManager at all, hence the 'install' status.

const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
const isAppleMobile = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

// Whether this device is receiving push right now. When it is, the in-page
// "new Notification()" fallbacks (IncomingCallGate, ChatMessageToaster)
// stay quiet — the service worker already shows the same thing, so there
// would be two.
let pushOnHere = false
export const isPushOnHere = () => pushOnHere

export function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

// Registered on every load in production (main.jsx). Local dev skips it so
// a stale worker never gets in the way of Vite's hot reload.
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
}

// 'on' | 'off' | 'denied' | 'install' (iPhone in a Safari tab) | 'unsupported'
export async function pushStatus() {
  if (!pushSupported()) return isAppleMobile() && !isStandalone() ? 'install' : 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  if (Notification.permission !== 'granted') return 'off'
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  pushOnHere = Boolean(sub)
  return sub ? 'on' : 'off'
}

async function subscriptionId(endpoint) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint))
  return [...new Uint8Array(hash).slice(0, 16)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function keyBytes(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64url.length + 3) % 4)
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

function saveSubscription(uid, sub) {
  const data = sub.toJSON()
  return subscriptionId(data.endpoint).then((id) =>
    setDoc(doc(db, 'pushSubscriptions', id), {
      uid,
      endpoint: data.endpoint,
      keys: { p256dh: data.keys.p256dh, auth: data.keys.auth },
      device: navigator.userAgent.slice(0, 200),
      updatedAt: serverTimestamp(),
    })
  )
}

// Must be called from a tap (the browser's permission prompt needs one).
export async function enablePush(uid) {
  if (!pushSupported()) throw new Error(isAppleMobile() ? 'Primero añade ADOR OS a tu pantalla de inicio y ábrelo desde ahí.' : 'Este navegador no admite notificaciones.')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Permiso denegado — actívalo en los ajustes de notificaciones del dispositivo.')
  const reg = (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.register('/sw.js'))
  await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    const res = await fetch('/api/push/config')
    const cfg = await res.json().catch(() => ({}))
    if (!res.ok || !cfg.publicKey) throw new Error(cfg.error || 'Las notificaciones aún no están configuradas en el servidor.')
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(cfg.publicKey) })
  }
  await saveSubscription(uid, sub)
  pushOnHere = true
}

// On every open with permission already granted: re-save this device's
// address under whoever is signed in (addresses can rotate, and a shared
// computer may change hands).
export async function refreshPushSubscription(uid) {
  if (!uid || uid === 'preview' || !pushSupported() || Notification.permission !== 'granted') return
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return
  await saveSubscription(uid, sub)
  pushOnHere = true
}

// On sign-out: this device stops receiving that person's notifications.
export async function forgetThisDevice() {
  if (!pushSupported()) return
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return
  pushOnHere = false
  await deleteDoc(doc(db, 'pushSubscriptions', await subscriptionId(sub.endpoint))).catch(() => {})
  await sub.unsubscribe().catch(() => {})
}

// Ask the server to notify people. Fire-and-forget: a notification that
// can't go out never blocks or fails the message/call itself.
export function sendPush(event, sender) {
  const user = auth?.currentUser
  if (!user || !sender?.uid || sender.uid === 'preview' || import.meta.env.DEV) return Promise.resolve()
  return user
    .getIdToken()
    .then((token) =>
      fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ event, senderUid: sender.uid, senderName: sender.name || '' }),
      })
    )
    .then((res) => res.json().catch(() => ({})).then((body) => (res.ok ? body : Promise.reject(new Error(body.error || 'No se pudo enviar la notificación.')))))
}

// A tapped notification opens /?open=chat&ct=…&cid=… — turn that into the
// same [module, focus] AppShell's navigateTo already understands.
export function parseOpenLink(search) {
  const p = new URLSearchParams(search)
  if (p.get('open') !== 'chat' || !p.get('cid')) return null
  return [
    'chat',
    {
      type: 'chat',
      convType: p.get('ct') === 'conv' ? 'conv' : 'dm',
      convId: p.get('cid'),
      participantUids: p.get('p') ? p.get('p').split(',') : undefined,
      messageId: p.get('m') || undefined,
      threadParentId: p.get('t') || undefined,
    },
  ]
}
