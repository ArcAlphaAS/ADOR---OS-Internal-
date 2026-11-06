import { useCallback, useState } from 'react'

// Los avisos se calculan en vivo (no son documentos), así que "archivar" es
// recordar, en este dispositivo, cuáles ya revisaste. Si un aviso cambia (otro
// texto), vuelve a aparecer solo. Máximo 300 recuerdos por persona.
export const keyOfNotification = (n) => n.key || `${n.kind}|${n.text}`

export function useArchivedNotifications(uid) {
  const storageKey = `ador_notif_archived_${uid || 'anon'}`
  const read = () => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '{}')
    } catch {
      return {}
    }
  }
  const [archived, setArchived] = useState(read)

  const write = useCallback(
    (next) => {
      const entries = Object.entries(next).sort((a, b) => b[1] - a[1]).slice(0, 300)
      const trimmed = Object.fromEntries(entries)
      setArchived(trimmed)
      try {
        localStorage.setItem(storageKey, JSON.stringify(trimmed))
      } catch {
        // sin almacenamiento: dura mientras la app esté abierta
      }
    },
    [storageKey]
  )

  const archive = (items) => write({ ...archived, ...Object.fromEntries([].concat(items).map((n) => [keyOfNotification(n), Date.now()])) })
  const restore = (item) => {
    const next = { ...archived }
    delete next[keyOfNotification(item)]
    write(next)
  }
  return { archived, archive, restore }
}
