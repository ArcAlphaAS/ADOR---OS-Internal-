import { useEffect, useState } from 'react'
import { subscribeAllTasks, subscribeClients, subscribeNews } from '../lib/firestore'
import { allPayments, currencyPEN } from '../lib/clientStages'
import { isPublished } from '../lib/news'

// Lo que pasó en el equipo en los últimos días, con la persona que lo hizo.
// Todo sale de colecciones reales; nada se escribe aparte.
const DAY = 864e5
const ms = (v) => v?.toMillis?.() || 0

export function useTeamActivity() {
  const [tasks, setTasks] = useState([])
  const [clients, setClients] = useState([])
  const [posts, setPosts] = useState([])
  const [loaded, setLoaded] = useState(false)
  useEffect(() => subscribeAllTasks((v) => { setTasks(v); setLoaded(true) }), [])
  useEffect(() => subscribeClients(setClients), [])
  useEffect(() => subscribeNews(setPosts), [])

  const now = Date.now()
  const items = []
  for (const t of tasks) {
    const at = ms(t.completedAt)
    if (t.status === 'completado' && at && now - at < 2 * DAY) {
      items.push({ key: `t-${t.id}`, at, uids: t.assignedTo || [], verb: 'completó', what: t.title })
    }
  }
  for (const c of clients) {
    const at = ms(c.stageEnteredAt)
    if (c.stage === 'intervencion_activa' && !c.lost && !c.completed && at && now - at < 5 * DAY) {
      items.push({ key: `s-${c.id}`, at, uids: c.assignedTo ? [c.assignedTo] : [], verb: 'inició la intervención de', what: c.name || c.nombre })
    }
    for (const { key, payment } of allPayments(c)) {
      if (payment?.status !== 'Recibido' || !payment.date) continue
      const at = new Date(`${payment.date}T12:00:00`).getTime()
      if (now - at < 5 * DAY && at <= now + DAY) {
        items.push({ key: `p-${c.id}-${key}`, at, uids: c.assignedTo ? [c.assignedTo] : [], verb: 'cobró', what: `${currencyPEN.format(payment.amount || 0)} de ${c.name || c.nombre}` })
      }
    }
  }
  for (const p of posts) {
    const at = ms(p.createdAt)
    if (isPublished(p) && at && now - at < 3 * DAY) {
      items.push({ key: `n-${p.id}`, at, uids: p.createdByUid ? [p.createdByUid] : [], verb: 'publicó', what: p.title })
    }
  }
  items.sort((a, b) => b.at - a.at)
  return { items: items.slice(0, 5), loaded }
}
