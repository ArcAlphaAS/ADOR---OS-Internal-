import { useCallback, useEffect, useRef, useState } from 'react'
import { subscribeUserProfile, saveUserProfile, replaceUserField } from '../lib/firestore'

// Los avisos se calculan en vivo (no son documentos), así que "archivar" es
// recordar cuáles ya revisaste. Se guarda en tu perfil (users/{uid}.notifArchived),
// no en el dispositivo: lo que archivas en el teléfono también queda archivado
// en la computadora. Si un aviso cambia (otro texto), vuelve a aparecer solo.
// Cada aviso se recuerda por una huella corta de su texto; máximo 300.
export const keyOfNotification = (n) => n.key || `${n.kind}|${n.text}`

// Huella corta y estable (FNV-1a de 32 bits) para usarla como nombre de campo.
const fingerprint = (str) => {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return `n${(h >>> 0).toString(36)}`
}

export function useArchivedNotifications(uid) {
  const cacheKey = `ador_notif_archived2_${uid || 'anon'}`
  const oldKey = `ador_notif_archived_${uid || 'anon'}` // versión anterior: solo en este dispositivo
  const readCache = () => {
    try {
      return JSON.parse(localStorage.getItem(cacheKey) || '{}')
    } catch {
      return {}
    }
  }
  const [archived, setArchived] = useState(readCache)
  const latest = useRef(archived)
  latest.current = archived

  // Lo que dice tu perfil manda; la copia local solo evita el parpadeo al abrir.
  useEffect(() => {
    if (!uid || uid === 'preview') return
    let migrated = false
    return subscribeUserProfile(uid, (profile) => {
      let remote = profile?.notifArchived || {}
      // Lo que ya habías archivado en este dispositivo antes de que se sincronizara, se sube una vez.
      if (!migrated) {
        migrated = true
        try {
          const old = JSON.parse(localStorage.getItem(oldKey) || '{}')
          const fromOld = Object.fromEntries(Object.entries(old).map(([k, v]) => [fingerprint(k), v]))
          if (Object.keys(fromOld).length) {
            remote = { ...fromOld, ...remote }
            replaceUserField(uid, 'notifArchived', remote).catch(() => saveUserProfile(uid, { notifArchived: remote }))
          }
          localStorage.removeItem(oldKey)
        } catch {
          // nada que migrar
        }
      }
      setArchived(remote)
      try {
        localStorage.setItem(cacheKey, JSON.stringify(remote))
      } catch {
        // sin almacenamiento
      }
    })
  }, [uid, cacheKey, oldKey])

  const write = useCallback(
    (next) => {
      const trimmed = Object.fromEntries(Object.entries(next).sort((a, b) => b[1] - a[1]).slice(0, 300))
      setArchived(trimmed)
      try {
        localStorage.setItem(cacheKey, JSON.stringify(trimmed))
      } catch {
        // sin almacenamiento
      }
      if (uid && uid !== 'preview') {
        // Se reemplaza el mapa completo (no se mezcla), para que restaurar también se sincronice.
        replaceUserField(uid, 'notifArchived', trimmed).catch(() => saveUserProfile(uid, { notifArchived: trimmed }))
      }
    },
    [uid, cacheKey]
  )

  const isArchived = (n) => Boolean(archived[fingerprint(keyOfNotification(n))])
  const archive = (items) => write({ ...latest.current, ...Object.fromEntries([].concat(items).map((n) => [fingerprint(keyOfNotification(n)), Date.now()])) })
  const restore = (item) => {
    const next = { ...latest.current }
    delete next[fingerprint(keyOfNotification(item))]
    write(next)
  }
  return { isArchived, archive, restore }
}
