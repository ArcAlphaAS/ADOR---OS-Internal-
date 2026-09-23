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
    if (m.attachment?.kind === 'image') files.push({ id: m.id, name: m.attachment.name, dataUrl: m.attachment.dataUrl, createdAt: m.createdAt })
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
