// Comunicación — the pure rules behind Chat's architecture (CLAUDE.md §34).
// Kept out of ChatModule.jsx so "who can see what" lives in one place and
// can be read without wading through UI code.

// Channels created before this architecture existed have no `kind` or
// `visibility` field — they were all open to everyone, so that's what a
// missing field means here.
export function conversationKind(c) {
  return c.kind || 'channel'
}

export function isPrivate(c) {
  return conversationKind(c) === 'group' || c.visibility === 'private'
}

export function isMember(c, uid) {
  return !isPrivate(c) || (c.memberUids || []).includes(uid)
}

// Who's actually in a conversation, as uids. A public channel has no
// member list of its own — it's everyone in ADOR, automatically.
export function membersOf(c, users) {
  if (!isPrivate(c)) return users.map((u) => u.id)
  return c.memberUids || []
}

// Falls back through displayName → email → a labeled placeholder — never a
// blank name next to a bare "?" avatar.
export function userLabel(u) {
  return u?.displayName || u?.email || 'Usuario sin nombre'
}

// A group with no name of its own is named after its members (minus you),
// the same way iMessage/WhatsApp label an unnamed group.
export function groupLabel(c, users, currentUid) {
  if (c.name) return c.name
  const names = (c.memberUids || [])
    .filter((uid) => uid !== currentUid)
    .map((uid) => userLabel(users.find((u) => u.id === uid)).split(' ')[0])
  return names.length ? names.join(', ') : 'Grupo'
}

// Suggested starting channels, straight from how ADOR is actually
// organized. `#direccion` is private by default: it's a *level of
// governance* (partners, sensitive decisions, compensation, hiring), not
// an area like #estrategia — the two are deliberately separate channels.
// Area channels start private too; flip any of them to public in their
// settings if the whole team should be able to read along.
export const SUGGESTED_CHANNELS = [
  { name: 'general', visibility: 'public', description: 'Conversación transversal y lo que todo el equipo debería ver.' },
  { name: 'anuncios', visibility: 'public', description: 'Anuncios oficiales de la firma.' },
  { name: 'direccion', visibility: 'private', description: 'Socios y dirección: decisiones estratégicas y temas sensibles.' },
  { name: 'estrategia', visibility: 'private', description: 'Equipo de estrategia.' },
  { name: 'operaciones', visibility: 'private', description: 'Operación diaria de la firma.' },
  { name: 'finanzas', visibility: 'private', description: 'Finanzas y temas de caja.' },
  { name: 'marketing', visibility: 'private', description: 'Marketing y marca.' },
  { name: 'proyectos', visibility: 'private', description: 'Coordinación de proyectos e intervenciones.' },
]

// Channel names follow Slack's convention: lowercase, no spaces or accents.
export function normalizeChannelName(raw) {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/^#/, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '')
}

// ---- Files: conversation files vs. official documents ----
// A file sent in chat is a *conversation file* — part of the exchange,
// not the record. The official version of a document lives in Google
// Drive and is shared here as a link, so ADOR OS never turns into a
// second Google Drive.
const DRIVE_PATTERN = /https?:\/\/(?:docs|drive|sheets|slides)\.google\.com\/[^\s]+/i
const MEET_PATTERN = /https?:\/\/meet\.google\.com\/[a-z0-9-]+/i

export function findDriveLink(text) {
  return text?.match(DRIVE_PATTERN)?.[0] || null
}

export function isMeetLink(url) {
  return MEET_PATTERN.test(url || '')
}

export function driveDocType(url) {
  if (/docs\.google\.com\/document/.test(url)) return 'Documento'
  if (/docs\.google\.com\/spreadsheets|sheets\.google/.test(url)) return 'Hoja de cálculo'
  if (/docs\.google\.com\/presentation|slides\.google/.test(url)) return 'Presentación'
  if (/drive\.google\.com\/drive\/folders/.test(url)) return 'Carpeta'
  return 'Archivo'
}

// Splits message text into plain text and link parts so URLs render as
// real links without ever using dangerouslySetInnerHTML.
export function splitLinks(text) {
  const parts = []
  const re = /https?:\/\/[^\s]+/g
  let last = 0
  let m
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push({ type: 'text', value: text.slice(last, m.index) })
    parts.push({ type: 'link', value: m[0] })
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push({ type: 'text', value: text.slice(last) })
  return parts
}

// Everything shared inside one conversation, newest first — powers the
// profile panel's "Archivos compartidos" and "Enlaces". Derived from the
// messages already loaded, never a separately-stored index. Meet links are
// left out on purpose: those are calls, already shown as call cards.
export function sharedInConversation(messages) {
  const files = []
  const links = []
  for (const m of [...messages].reverse()) {
    if (m.attachment?.kind === 'image') files.push({ id: m.id, attachment: m.attachment, name: m.attachment.name, src: m.attachment.thumbUrl || m.attachment.dataUrl, createdAt: m.createdAt })
    for (const part of splitLinks(m.text || '')) {
      if (part.type !== 'link' || isMeetLink(part.value)) continue
      let host = part.value
      try {
        host = new URL(part.value).hostname.replace(/^www\./, '')
      } catch {
        // keep the raw URL as its own label
      }
      const drive = DRIVE_PATTERN.test(part.value)
      links.push({ id: `${m.id}-${links.length}`, url: part.value, host, label: drive ? `${driveDocType(part.value)} de Drive` : host, drive, createdAt: m.createdAt })
    }
  }
  return { files, links }
}

// ---- Emoji, reactions, formatting, mentions ----

// A curated set instead of an emoji library — keeps the bundle small and
// covers what a work chat actually uses.
export const EMOJIS = [
  '👍', '👏', '🙌', '🙏', '💪', '👀', '✅', '❌', '🔥', '🚀', '🎯', '💡',
  '📌', '📈', '📉', '💰', '🗓️', '⏰', '⚠️', '❓', '❗', '💯', '🤝', '🎉',
  '😀', '😂', '😊', '😉', '😍', '🤔', '😅', '😬', '😮', '😢', '😴', '🙃',
  '❤️', '💙', '👌', '✌️', '🤞', '👋', '☕', '🍕', '🏆', '⭐', '📎', '📝',
]

export const QUICK_REACTIONS = ['👍', '✅', '👀', '🙌', '😂', '❤️']

// Lightweight Slack-style formatting — *not* full Markdown:
//   **negrita**   _cursiva_   ~tachado~   `código`
export const FORMATS = [
  { id: 'bold', label: 'B', wrap: '**', title: 'Negrita' },
  { id: 'italic', label: 'I', wrap: '_', title: 'Cursiva' },
  { id: 'strike', label: 'S', wrap: '~', title: 'Tachado' },
  { id: 'code', label: '</>', wrap: '`', title: 'Código' },
]

const FORMAT_RE = /(\*\*[^*\n]+\*\*|`[^`\n]+`|_[^_\n]+_|~[^~\n]+~)/g

export function splitFormatting(text) {
  const parts = []
  let last = 0
  let m
  FORMAT_RE.lastIndex = 0
  while ((m = FORMAT_RE.exec(text))) {
    if (m.index > last) parts.push({ type: 'text', value: text.slice(last, m.index) })
    const token = m[0]
    if (token.startsWith('**')) parts.push({ type: 'bold', value: token.slice(2, -2) })
    else if (token.startsWith('`')) parts.push({ type: 'code', value: token.slice(1, -1) })
    else if (token.startsWith('_')) parts.push({ type: 'italic', value: token.slice(1, -1) })
    else parts.push({ type: 'strike', value: token.slice(1, -1) })
    last = m.index + token.length
  }
  if (last < text.length) parts.push({ type: 'text', value: text.slice(last) })
  return parts
}

// Splits text around "@Nombre" tokens for the people actually mentioned in
// this message (stored as `mentions: [{uid, name}]`) — never a guess from
// arbitrary "@word" text.
export function splitMentions(text, mentions = []) {
  if (!mentions.length) return [{ type: 'text', value: text }]
  const names = [...mentions].sort((a, b) => b.name.length - a.name.length)
  const parts = []
  let rest = text
  while (rest) {
    let best = null
    for (const m of names) {
      const i = rest.indexOf(`@${m.name}`)
      if (i !== -1 && (!best || i < best.i)) best = { i, m }
    }
    if (!best) {
      parts.push({ type: 'text', value: rest })
      break
    }
    if (best.i > 0) parts.push({ type: 'text', value: rest.slice(0, best.i) })
    parts.push({ type: 'mention', value: `@${best.m.name}`, uid: best.m.uid })
    rest = rest.slice(best.i + best.m.name.length + 1)
  }
  return parts
}

// The "@que" being typed right before the cursor, if any — drives the
// mention suggestions above the composer.
export function mentionQueryAt(text, cursor) {
  const before = text.slice(0, cursor)
  const m = before.match(/(?:^|\s)@([^\s@]{0,30})$/)
  return m ? { query: m[1], start: cursor - m[1].length - 1 } : null
}

// ---- Presencia, escribiendo, leído ----

const ONLINE_MS = 2.5 * 60 * 1000 // heartbeat is every 60s; allow a missed beat
const AWAY_MS = 30 * 60 * 1000

function ago(ms) {
  const min = Math.floor(ms / 60000)
  if (min < 60) return `hace ${Math.max(1, min)} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.floor(h / 24)
  return d === 1 ? 'ayer' : `hace ${d} días`
}

// En línea = ADOR OS open and visible in the last ~2 min. Ausente = open
// but in a background tab/window. Otherwise, when they were last active.
export function presenceOf(p, now = Date.now()) {
  const at = p?.lastActiveAt?.toMillis?.()
  if (!at) return { status: 'offline', label: 'Sin actividad reciente', color: null }
  const age = now - at
  if (p.state === 'online' && age < ONLINE_MS) return { status: 'online', label: 'En línea', color: '#4CAF50' }
  if (p.state === 'away' && age < AWAY_MS) return { status: 'away', label: 'Ausente', color: '#FFC107' }
  return { status: 'offline', label: `Activo ${ago(age)}`, color: null }
}

// Who is typing right now in a typing doc, minus you. Entries older than
// a few seconds are stale (the person stopped without sending).
export function typingNames(doc, currentUid, now = Date.now()) {
  return Object.entries(doc || {})
    .filter(([uid, v]) => uid !== currentUid && v?.at?.toMillis && now - v.at.toMillis() < 7000)
    .map(([, v]) => (v.name || '').split(' ')[0])
}

export function typingLabel(names) {
  if (!names.length) return ''
  if (names.length === 1) return `${names[0]} está escribiendo…`
  if (names.length === 2) return `${names[0]} y ${names[1]} están escribiendo…`
  return 'Varias personas están escribiendo…'
}

// WhatsApp-style receipts on your own messages, for DMs and private groups
// (Slack-style public channels don't have them — "leído por toda la
// empresa" isn't meaningful). Built on the chatLastRead timestamps every
// user already writes, read straight from their users/{uid} docs:
//   sending → not confirmed by the server yet
//   sent    → ✓   delivered, not read
//   read    → ✓✓  every other participant has opened it since
export function receiptFor(message, readerUids, users, conversationKey) {
  const sentAt = message.createdAt?.toMillis?.()
  if (!sentAt) return { state: 'sending', readers: [] }
  const readers = readerUids.filter((uid) => {
    const u = users.find((x) => x.id === uid)
    return (u?.chatLastRead?.[conversationKey]?.toMillis?.() || 0) >= sentAt
  })
  return { state: readerUids.length && readers.length === readerUids.length ? 'read' : 'sent', readers }
}

// ---- Llamadas: estado estilo Teams ----
export const RING_MS = 45_000
const STALE_CALL_MS = 3 * 60 * 60 * 1000 // a call nobody closed stops showing "en curso" after 3h

function minutesLabel(ms) {
  const min = Math.max(1, Math.round(ms / 60000))
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} min`
}

// One place that turns a chatCalls doc into what every surface shows:
//   ringing   → "Llamando…"          (first 45s, nobody else in yet)
//   active    → "En curso"           (someone besides the caller joined)
//   missed    → "Llamada perdida" / "Sin respuesta" (caller's view)
//   declined  → everyone invited said no
//   cancelled → the caller hung up before anyone joined
//   ended     → someone pressed Finalizar (or it went stale)
export function callState(call, uid, now = Date.now()) {
  if (!call) return { key: 'unknown', label: 'Llamada' }
  const created = call.createdAt?.toMillis?.() || now
  const age = now - created
  const others = (call.joinedUids || []).filter((x) => x !== call.fromUid)
  // `label` completes "Llamada …" / "Videollamada …" in the call card.
  if (call.status === 'cancelled') return { key: 'cancelled', label: 'cancelada' }
  if (call.status === 'ended') {
    const end = call.statusAt?.toMillis?.() || now
    return { key: 'ended', label: others.length ? `finalizada · ${minutesLabel(end - created)}` : 'finalizada' }
  }
  if (others.length) {
    if (age > STALE_CALL_MS) return { key: 'ended', label: 'finalizada' }
    return { key: 'active', label: 'en curso', joined: call.joinedUids || [] }
  }
  if (age < RING_MS) return { key: 'ringing', label: '· llamando…' }
  const declined = (call.toUids || []).length && (call.toUids || []).every((x) => call.responses?.[x] === 'declined')
  if (declined) return { key: 'declined', label: 'rechazada' }
  return { key: 'missed', label: uid === call.fromUid ? 'sin respuesta' : 'perdida' }
}

// ---- Inbox como email ----
export function unreadCountOf(messageCount, readCount) {
  if (typeof messageCount !== 'number' || typeof readCount !== 'number') return null
  return Math.max(0, messageCount - readCount)
}

// Email-client day buckets for the Inbox list.
export function dayBucket(ts, now = new Date()) {
  if (!ts?.toDate) return 'Anteriores'
  const d = ts.toDate()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const t = d.getTime()
  if (t >= start) return 'Hoy'
  if (t >= start - 86400000) return 'Ayer'
  if (t >= start - 6 * 86400000) return 'Esta semana'
  return 'Anteriores'
}
