// "Exportar todo" — a complete copy of ADOR OS's data as one JSON file,
// saved to the admin's Google Drive (lib/googleDrive.js). Free: it only
// reads Firestore (one read per document) and writes a file in Drive.
//
// What's included: every collection and its subcollections (client history
// and documents, task history, knowledge-doc history, every channel/DM
// message and thread reply). What's left out on purpose:
//   - chatBlobs (full-size chat images / voice notes): heavy, and they
//     expire after 90 days anyway; messages keep their thumbnails.
//   - chatTyping and presence: momentary state, not data.
//   - Google connection tokens (refreshToken): a backup file must never
//     carry credentials that could open someone's Google account.
import { collection, getDocs } from 'firebase/firestore'
import { db, COLLECTIONS } from './firestore'

const SKIP = new Set([COLLECTIONS.chatBlobs, COLLECTIONS.chatTyping, COLLECTIONS.presence])
const SUBCOLLECTIONS = {
  [COLLECTIONS.clients]: ['history', 'documents'],
  [COLLECTIONS.tasks]: ['history'],
  [COLLECTIONS.knowledgeDocs]: ['history'],
  [COLLECTIONS.chatChannels]: ['messages'],
  [COLLECTIONS.chatDms]: ['messages'],
}
const SECRET_KEYS = new Set(['refreshToken', 'accessToken'])

// Firestore values → plain JSON: timestamps become ISO dates, credentials
// are dropped wherever they appear.
function clean(value) {
  if (value === null || value === undefined) return value
  if (typeof value.toDate === 'function') return value.toDate().toISOString()
  if (Array.isArray(value)) return value.map(clean)
  if (typeof value === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(value)) if (!SECRET_KEYS.has(k)) out[k] = clean(v)
    return out
  }
  return value
}

async function readDocs(ref) {
  const snap = await getDocs(ref)
  return snap.docs
}

// onProgress(label) is called as each collection is read, so the button
// can say what it's doing on a long export.
export async function exportAllData(onProgress = () => {}) {
  if (!db) throw new Error('Firestore no configurado')
  const data = {}
  let count = 0
  for (const name of Object.values(COLLECTIONS)) {
    if (SKIP.has(name)) continue
    onProgress(name)
    const docs = await readDocs(collection(db, name))
    const subs = SUBCOLLECTIONS[name] || []
    data[name] = []
    for (const d of docs) {
      const entry = { id: d.id, ...clean(d.data()) }
      for (const sub of subs) {
        const subDocs = await readDocs(collection(db, name, d.id, sub))
        entry[`_${sub}`] = []
        for (const s of subDocs) {
          const subEntry = { id: s.id, ...clean(s.data()) }
          // Thread replies live one level deeper, only under messages
          // that actually have replies.
          if (sub === 'messages' && s.data().replyCount) {
            const replies = await readDocs(collection(db, name, d.id, 'messages', s.id, 'replies'))
            subEntry._replies = replies.map((r) => ({ id: r.id, ...clean(r.data()) }))
            count += replies.length
          }
          entry[`_${sub}`].push(subEntry)
        }
        count += subDocs.length
      }
      data[name].push(entry)
    }
    count += docs.length
  }
  return {
    app: 'ADOR OS',
    format: 1,
    exportedAt: new Date().toISOString(),
    documentCount: count,
    notes: 'Copia completa de los datos. Sin imágenes/notas de voz del chat (caducan a los 90 días) ni tokens de conexión.',
    data,
  }
}

export function backupFileName(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return `ADOR OS respaldo ${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}.${pad(date.getMinutes())}.json`
}
