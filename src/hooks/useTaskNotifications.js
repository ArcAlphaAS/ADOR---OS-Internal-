import { useEffect, useState } from 'react'
import { subscribeTasksForUser, subscribeClients, subscribeProyectosInternos } from '../lib/firestore'
import { isOverdue, isDueToday, isPendingFor, isReminderDue, remindLabel, workstreamId } from '../lib/workspace'

// Overdue / due-today tasks assigned to the signed-in user, surfaced in the
// top bar bell — same pattern as useClientNotifications' "sin contacto +7
// días". Lives outside useWorkspaceData since the bell needs it regardless
// of which module is open, not just while Workspace itself is mounted.
export function useTaskNotifications(userId) {
  const [tasks, setTasks] = useState([])
  const [clients, setClients] = useState([])
  const [proyectos, setProyectos] = useState([])

  useEffect(() => {
    if (!userId) return
    return subscribeTasksForUser(userId, setTasks)
  }, [userId])
  useEffect(() => subscribeClients(setClients), [])
  useEffect(() => subscribeProyectosInternos(setProyectos), [])

  const workstreamNameById = {
    ...Object.fromEntries(clients.map((c) => [workstreamId('intervencion', c.id), c.name])),
    ...Object.fromEntries(proyectos.map((p) => [workstreamId('proyecto', p.id), p.name])),
  }

  const flagged = tasks
    .filter((t) => t.status !== 'completado' && !isPendingFor(t, userId) && (isOverdue(t) || isDueToday(t)))
    .map((t) => {
      const due = t.dueDate.toDate()
      const overdue = isOverdue(t)
      const days = Math.floor((new Date() - due) / 86400000)
      const workstreamName = workstreamNameById[t.workstreamId]
      return {
        id: t.id,
        title: t.title,
        overdue,
        days,
        workstreamName,
      }
    })
    .sort((a, b) => b.days - a.days)

  // Recordatorios que ya les toca ("recuérdamela en 3 días") y que no están ya atrasadas / para hoy.
  const reminders = tasks
    .filter((t) => !isPendingFor(t, userId) && isReminderDue(t) && !isOverdue(t) && !isDueToday(t))
    .map((t) => ({ text: `🔔 ${t.title}${workstreamNameById[t.workstreamId] ? ` — ${workstreamNameById[t.workstreamId]}` : ''}`, time: `recordatorio · ${remindLabel(t)}` }))

  return [
    ...flagged.map((t) => ({
      text: `${t.title}${t.workstreamName ? ` — ${t.workstreamName}` : ''}`,
      time: t.overdue ? `${t.days}d atrasada` : 'vence hoy',
    })),
    ...reminders,
  ]
}
