import { useEffect, useState } from 'react'
import { subscribeClients } from '../lib/firestore'

// "Sin contacto hace +7 días" — SPCs stuck in the same stage for a week or
// more, surfaced as real notifications in the top bar bell instead of a
// permanently empty state. Lives outside useHomeData since the bell needs
// this regardless of which module is currently open.
export function useClientNotifications() {
  const [clients, setClients] = useState([])

  useEffect(() => subscribeClients(setClients), [])

  const now = new Date()
  const stale = clients
    .filter((c) => c.stage !== 'intervencion_activa' && c.stageEnteredAt?.toDate)
    .map((c) => ({
      id: c.id,
      name: c.name,
      days: Math.floor((now - c.stageEnteredAt.toDate()) / 86400000),
    }))
    .filter((c) => c.days >= 7)
    .sort((a, b) => b.days - a.days)

  return stale.map((c) => ({
    text: `${c.name} — sin contacto hace ${c.days} días`,
    time: `${c.days}d`,
  }))
}
