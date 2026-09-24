// Notificaciones push — the part of ADOR OS that reaches a phone or computer
// even when the app is closed (the system's notification bar).
//
// How it fits together:
//   1. A device turns notifications on (lib/push.js): the browser hands it a
//      private push address, saved in Firestore as pushSubscriptions/{id}.
//   2. When someone sends a message / mention / call, their app asks this
//      endpoint to notify the people involved (POST /api/push/send), with
//      their own Firebase sign-in token.
//   3. This code reads what it needs from Firestore *as that person* (the
//      token goes to Firestore's REST API, so the normal security rules
//      apply and an invalid token simply gets nothing), decides who should
//      actually hear about it — same rules as the bell: notification level
//      per conversation, silenced conversations, No molestar — then encrypts
//      and sends the notification to Apple's / Google's push service.
//   4. The service worker (public/sw.js) receives it and shows it.
//
// Web Push is a standard: messages are encrypted for each device (RFC 8291)
// and signed with ADOR OS's own VAPID key (RFC 8292) — no Firebase Cloud
// Messaging, no paid service. VAPID_PUBLIC_KEY lives in wrangler.jsonc;
// VAPID_PRIVATE_KEY is a secret in Cloudflare (Settings → Variables and
// Secrets). Keeping this file on Web Crypto only (no npm packages) means it
// runs on Cloudflare Workers as is.

const json = (status, body) => ({ status, json: body })
const enc = new TextEncoder()

// ---- base64url + bytes ----
function b64urlToBytes(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}
function bytesToB64url(bytes) {
  let bin = ''
  for (const b of new Uint8Array(bytes)) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function concat(...parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}

// ---- VAPID (RFC 8292): a short signed token that says "this is ADOR OS" ----
async function vapidAuthorization(endpoint, env) {
  const pub = b64urlToBytes(env.VAPID_PUBLIC_KEY)
  const key = await crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', x: bytesToB64url(pub.slice(1, 33)), y: bytesToB64url(pub.slice(33, 65)), d: env.VAPID_PRIVATE_KEY, ext: true },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )
  const header = bytesToB64url(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const claims = bytesToB64url(
    enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: env.VAPID_SUBJECT || 'https://ador-os.adorfirm.workers.dev' }))
  )
  const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(`${header}.${claims}`))
  return `vapid t=${header}.${claims}.${bytesToB64url(signature)}, k=${env.VAPID_PUBLIC_KEY}`
}

// ---- Payload encryption (RFC 8291, "aes128gcm") ----
async function hkdf(salt, ikm, info, length) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, length * 8))
}

export async function encryptPayload(subscription, plaintext) {
  const uaPublic = b64urlToBytes(subscription.keys.p256dh)
  const authSecret = b64urlToBytes(subscription.keys.auth)
  const local = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', local.publicKey))
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  const ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, local.privateKey, 256))

  const ikm = await hkdf(authSecret, ecdhSecret, concat(enc.encode('WebPush: info\0'), uaPublic, asPublic), 32)
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16)
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12)

  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
  // One record: the message followed by the 0x02 "last record" delimiter.
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, concat(plaintext, new Uint8Array([2]))))
  const rs = new Uint8Array([0, 0, 0x10, 0]) // record size 4096
  return concat(salt, rs, new Uint8Array([asPublic.length]), asPublic, cipher)
}

async function sendPush(subscription, payload, env, { ttl = 86400, urgency = 'high' } = {}) {
  const body = await encryptPayload(subscription, enc.encode(JSON.stringify(payload)))
  const res = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      Authorization: await vapidAuthorization(subscription.endpoint, env),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: String(ttl),
      Urgency: urgency,
    },
    body,
  })
  return res.status
}

// ---- Firestore REST, as the signed-in sender ----
function decodeValue(v) {
  if (!v) return null
  if ('stringValue' in v) return v.stringValue
  if ('booleanValue' in v) return v.booleanValue
  if ('integerValue' in v) return Number(v.integerValue)
  if ('doubleValue' in v) return v.doubleValue
  if ('timestampValue' in v) return Date.parse(v.timestampValue)
  if ('nullValue' in v) return null
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(decodeValue)
  if ('mapValue' in v) return decodeFields(v.mapValue.fields)
  return null
}
function decodeFields(fields = {}) {
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, decodeValue(v)]))
}

function firestore(env, idToken) {
  const project = env.FIREBASE_PROJECT_ID
  const root = `projects/${project}/databases/(default)/documents`
  const base = `https://firestore.googleapis.com/v1/${root}`
  const headers = { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' }
  return {
    // Several docs in one round-trip → { 'users/abc': {...} | null }
    async getMany(paths) {
      if (!paths.length) return {}
      const res = await fetch(`${base}:batchGet`, { method: 'POST', headers, body: JSON.stringify({ documents: paths.map((p) => `${root}/${p}`) }) })
      if (!res.ok) throw Object.assign(new Error(`Firestore ${res.status}`), { status: res.status })
      const out = {}
      for (const r of await res.json()) {
        const name = r.found?.name || r.missing
        if (!name) continue
        out[name.slice(root.length + 1)] = r.found ? decodeFields(r.found.fields) : null
      }
      return out
    },
    async list(collectionId) {
      const res = await fetch(`${base}:runQuery`, { method: 'POST', headers, body: JSON.stringify({ structuredQuery: { from: [{ collectionId }], limit: 500 } }) })
      if (!res.ok) throw Object.assign(new Error(`Firestore ${res.status}`), { status: res.status })
      return (await res.json()).filter((r) => r.document).map((r) => ({ id: r.document.name.split('/').pop(), ...decodeFields(r.document.fields) }))
    },
    remove(path) {
      return fetch(`${base}/${path}`, { method: 'DELETE', headers }).catch(() => {})
    },
  }
}

// ---- Who hears about what (mirrors lib/chat.js notifyLevel + the bell) ----
function notifyLevel(profile, key, kind) {
  const explicit = profile?.chatNotify?.[key]
  if (explicit) return explicit
  if (profile?.chatMuted?.[key]) return 'none'
  return kind === 'channel' ? 'mentions' : 'all'
}
const inDnd = (presence, now) => (presence?.dnd?.until || 0) > now

const VERB = { mention: 'te mencionó', quote: 'citó tu mensaje', important: 'marcó un mensaje como importante', reply: 'respondió en un hilo' }
const firstName = (s) => (s || '').split(' ')[0]

export function pushConfig(_req, env) {
  if (!env.VAPID_PUBLIC_KEY) return json(500, { error: 'Notificaciones no configuradas.' })
  return json(200, { publicKey: env.VAPID_PUBLIC_KEY })
}

// body.event:
//   { kind: 'message', convType: 'dm'|'conv', convId, participantUids?, parentId?,
//     messageId, text, conversationLabel, targets: [{uid, reason}] }
//   { kind: 'call', toUids, callType: 'video'|'audio', convType, convId, participantUids? }
//   { kind: 'test' }
export async function pushSend({ method, headers, body }, env) {
  if (method !== 'POST') return json(405, { error: 'Method not allowed' })
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.FIREBASE_PROJECT_ID) return json(500, { error: 'Notificaciones no configuradas en el servidor todavía.' })
  const auth = headers.authorization || ''
  if (!auth.startsWith('Bearer ')) return json(401, { error: 'Falta la sesión.' })
  const idToken = auth.slice(7)
  const { event, senderUid, senderName } = body || {}
  if (!event?.kind || !senderUid) return json(400, { error: 'Falta el evento.' })

  const fs = firestore(env, idToken)
  const now = Date.now()
  try {
    // Every subscribed device — a handful of docs. Also proves the token is
    // valid: without a real ADOR OS session Firestore answers 401/403.
    const subs = await fs.list('pushSubscriptions')

    // uid → the notification that person gets (or nothing).
    const notes = new Map()

    if (event.kind === 'test') {
      notes.set(senderUid, { title: 'ADOR OS', body: 'Las notificaciones funcionan en este dispositivo ✓', tag: 'test', url: '/' })
    } else if (event.kind === 'call') {
      const toUids = (event.toUids || []).filter((u) => u && u !== senderUid).slice(0, 30)
      const docs = await fs.getMany(toUids.map((u) => `presence/${u}`))
      const video = event.callType !== 'audio'
      for (const uid of toUids) {
        if (inDnd(docs[`presence/${uid}`], now)) continue
        notes.set(uid, {
          title: `📞 ${senderName || 'Alguien'} te está llamando`,
          body: `${video ? 'Videollamada' : 'Llamada'} · toca para abrir ADOR OS`,
          tag: `call:${event.convId || senderUid}`,
          url: chatUrl(event),
          kind: 'call',
        })
      }
    } else if (event.kind === 'message') {
      const { convType, convId } = event
      if (!convId) return json(400, { error: 'Falta la conversación.' })
      let kind = 'dm'
      let audience = []
      let label = event.conversationLabel || ''
      if (convType === 'dm') {
        audience = (event.participantUids || []).filter((u) => u !== senderUid)
      } else {
        const channel = (await fs.getMany([`chatChannels/${convId}`]))[`chatChannels/${convId}`]
        if (!channel) return json(200, { sent: 0 })
        kind = channel.kind === 'group' ? 'group' : 'channel'
        const isPublic = kind === 'channel' && channel.visibility !== 'private'
        audience = isPublic ? [...new Set(subs.map((s) => s.uid))] : channel.memberUids || []
        audience = audience.filter((u) => u && u !== senderUid)
        if (!label) label = kind === 'channel' ? `#${channel.name || 'canal'}` : channel.name || 'Grupo'
      }
      if (event.onlyTargets) audience = [] // thread reply: only its followers + mentions
      const reasons = new Map(audience.map((u) => [u, 'message']))
      for (const t of event.targets || []) if (t?.uid && t.uid !== senderUid) reasons.set(t.uid, t.reason)

      const uids = [...reasons.keys()].filter((u) => subs.some((s) => s.uid === u)).slice(0, 50)
      const docs = await fs.getMany(uids.flatMap((u) => [`users/${u}`, `presence/${u}`]))
      const text = (event.text || 'Nuevo mensaje').slice(0, 180)
      for (const uid of uids) {
        const reason = reasons.get(uid)
        if (inDnd(docs[`presence/${uid}`], now)) continue
        const level = notifyLevel(docs[`users/${uid}`], convId, kind)
        if (level === 'none') continue
        if (reason === 'message' && level !== 'all') continue
        const where = kind === 'dm' ? '' : ` en ${label}`
        notes.set(uid, {
          title:
            reason === 'message'
              ? kind === 'dm'
                ? senderName || 'Mensaje nuevo'
                : `${firstName(senderName)}${where}`
              : `${firstName(senderName)} ${VERB[reason] || 'te escribió'}${where}`,
          body: text,
          tag: `conv:${convId}${event.parentId ? `:${event.parentId}` : ''}`,
          url: chatUrl(event),
        })
      }
    } else {
      return json(400, { error: 'Evento desconocido.' })
    }

    let sent = 0
    await Promise.all(
      subs
        .filter((s) => notes.has(s.uid) && s.endpoint && s.keys?.p256dh && s.keys?.auth)
        .map(async (s) => {
          const note = notes.get(s.uid)
          try {
            const status = await sendPush(s, note, env, note.kind === 'call' ? { ttl: 60 } : undefined)
            if (status === 404 || status === 410) await fs.remove(`pushSubscriptions/${s.id}`) // device unsubscribed
            else if (status < 300) sent++
          } catch {
            // one bad device never blocks the others
          }
        })
    )
    return json(200, { sent })
  } catch (error) {
    if (error.status === 401 || error.status === 403) return json(401, { error: 'Sesión no válida.' })
    return json(500, { error: error.message || 'No se pudo enviar la notificación.' })
  }
}

// Where tapping the notification opens: Comunicación, that conversation,
// that message (read by lib/push.js parseOpenLink on the app side).
function chatUrl(e) {
  const p = new URLSearchParams({ open: 'chat', ct: e.convType || 'dm', cid: e.convId || '' })
  if (e.participantUids?.length) p.set('p', e.participantUids.join(','))
  if (e.messageId) p.set('m', e.messageId)
  if (e.parentId) p.set('t', e.parentId)
  return `/?${p}`
}
