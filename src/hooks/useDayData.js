import { useEffect, useState } from 'react'
import { subscribeTasksForUser, subscribeClients, subscribeProyectosInternos } from '../lib/firestore'
import { isOverdue, isDueToday, isCompletedToday, isPendingFor, pickFocusTask, priorityMeta } from '../lib/workspace'

const RANK = { alta: 0, media: 1, baja: 2 }
const byPriority = (a, b) => (RANK[a.priority] ?? 1) - (RANK[b.priority] ?? 1)

// "Tu día" on Inicio: the person's one most important task, the next few
// behind it, and how much of today is already done. Same Vencidas / Para hoy
// split as Workspace → Hoy, so both always agree.
export function useDayData(uid) {
  const [tasks, setTasks] = useState([])
  const [clients, setClients] = useState([])
  const [proyectos, setProyectos] = useState([])

  useEffect(() => (uid ? subscribeTasksForUser(uid, setTasks) : undefined), [uid])
  useEffect(() => subscribeClients(setClients), [])
  useEffect(() => subscribeProyectosInternos(setProyectos), [])

  const mine = tasks.filter((t) => t.status !== 'completado' && !isPendingFor(t, uid))
  const vencidas = mine.filter(isOverdue)
  const hoy = mine.filter((t) => isDueToday(t) && !isOverdue(t))
  const pendientes = mine.filter((t) => !isOverdue(t) && !isDueToday(t))
  const completedToday = tasks.filter(isCompletedToday).length
  const focus = pickFocusTask(vencidas, hoy, pendientes)
  const upNext = [...[...vencidas].sort(byPriority), ...[...hoy].sort(byPriority)].filter((t) => t.id !== focus?.id).slice(0, 3)

  const workstreamName = (task) => {
    const id = task.workstreamId || ''
    if (id.startsWith('client:')) return clients.find((c) => c.id === id.slice(7))?.name || null
    if (id.startsWith('proyecto:')) return proyectos.find((p) => p.id === id.slice(9))?.name || null
    return null
  }

  return {
    focus,
    upNext,
    workstreamName,
    priorityMeta,
    openCount: vencidas.length + hoy.length,
    completedToday,
    totalToday: vencidas.length + hoy.length + completedToday,
  }
}
