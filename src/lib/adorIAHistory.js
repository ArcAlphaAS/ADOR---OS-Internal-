// Historial de conversaciones de ADOR IA, guardado SOLO en este navegador (localStorage):
// sin lecturas ni escrituras en Firestore y sin cargar nada que no se esté viendo.
//   - un índice liviano (id, título, fecha) para la lista;
//   - cada conversación en su propia clave, que solo se lee al abrirla;
//   - solo texto (las tarjetas de órdenes se guardan como una línea de resumen);
//   - tope de 30 conversaciones, 60 mensajes cada una; al pasarse se descarta lo más viejo.
// Cada persona tiene su propio historial (clave por usuario) y no viaja a otro dispositivo.
const MAX_CONVS = 30
const MAX_MSGS = 60
const MAX_CHARS = 4000

const idxKey = (uid) => `ador_ia_idx_${uid}`
const convKey = (uid, id) => `ador_ia_c_${uid}_${id}`

const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}
const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false // lleno o bloqueado: el historial es una comodidad, nunca debe romper el chat
  }
}

export function listConversations(uid) {
  if (!uid) return []
  return read(idxKey(uid), []).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.updatedAt - a.updatedAt)
}

export function loadConversation(uid, id) {
  return read(convKey(uid, id), [])
}

const slim = (m) => {
  let content = String(m.content || '').slice(0, MAX_CHARS)
  if (m.action) content += `\n\n(${m.status === 'done' ? 'Orden ejecutada' : m.status === 'cancelled' ? 'Orden cancelada' : 'Orden sin confirmar'})`
  return { role: m.role, content, ...(m.topic ? { topic: m.topic } : {}), ...(m.prevTopic !== undefined ? { prevTopic: m.prevTopic } : {}) }
}

export function titleFrom(messages) {
  const first = messages.find((m) => m.role === 'user')?.content || 'Conversación'
  const t = first.replace(/\s+/g, ' ').trim()
  return t.length > 46 ? `${t.slice(0, 44)}…` : t
}

export function saveConversation(uid, id, messages) {
  if (!uid || !id || messages.length === 0) return
  const kept = messages.slice(-MAX_MSGS).map(slim)
  write(convKey(uid, id), kept)
  const idx = read(idxKey(uid), [])
  const prev = idx.find((c) => c.id === id)
  const entry = { id, title: prev?.customTitle ? prev.title : titleFrom(kept), customTitle: prev?.customTitle || false, pinned: prev?.pinned || false, updatedAt: Date.now(), count: kept.length }
  let next = [entry, ...idx.filter((c) => c.id !== id)]
  if (next.length > MAX_CONVS) {
    const drop = next.filter((c) => !c.pinned).sort((a, b) => a.updatedAt - b.updatedAt).slice(0, next.length - MAX_CONVS)
    drop.forEach((c) => { try { localStorage.removeItem(convKey(uid, c.id)) } catch { /* nada */ } })
    next = next.filter((c) => !drop.includes(c))
  }
  write(idxKey(uid), next)
}

export function renameConversation(uid, id, title) {
  const idx = read(idxKey(uid), [])
  write(idxKey(uid), idx.map((c) => (c.id === id ? { ...c, title: title.trim().slice(0, 60) || c.title, customTitle: true } : c)))
}

export function togglePinConversation(uid, id) {
  const idx = read(idxKey(uid), [])
  write(idxKey(uid), idx.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c)))
}

export function deleteConversation(uid, id) {
  try { localStorage.removeItem(convKey(uid, id)) } catch { /* nada */ }
  write(idxKey(uid), read(idxKey(uid), []).filter((c) => c.id !== id))
}

export function clearHistory(uid) {
  read(idxKey(uid), []).forEach((c) => { try { localStorage.removeItem(convKey(uid, c.id)) } catch { /* nada */ } })
  try { localStorage.removeItem(idxKey(uid)) } catch { /* nada */ }
}
