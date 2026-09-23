import { useEffect, useState } from 'react'
import {
  subscribeClients,
  subscribeTasksForUser,
  subscribeDecisions,
} from '../lib/firestore'
import { isPendingFor } from '../lib/workspace'

// Shapes expected on each collection (beyond what's in firestore.js):
//   clients:   { name, stage, pago1: {amount, status, date}, pago2: {...},
//                interventionWeek, interventionTotalWeeks }
//   tasks:     { assignedTo, title, dueDate: Timestamp, status, clientId? }
//   decisions: { title, decidedAt: Timestamp, clientId? }
// `clientId` on tasks/decisions is optional — there's no UI to
// create them yet (Workspace/Calendario are still placeholders), but Home
// already resolves it to a client name wherever present so nothing needs to
// change here once those modules exist and start writing it.
export function useHomeData(userId) {
  const [clients, setClients] = useState([])
  const [tasks, setTasks] = useState([])
  const [decisions, setDecisions] = useState([])

  useEffect(() => subscribeClients(setClients), [])
  useEffect(() => subscribeDecisions(setDecisions), [])
  useEffect(() => {
    if (!userId) return
    return subscribeTasksForUser(userId, setTasks)
  }, [userId])

  const activeSPs = clients.filter((c) => c.stage === 'intervencion_activa')
  const pipelineSPCs = clients.filter((c) => c.stage !== 'intervencion_activa')

  const clientNameById = Object.fromEntries(clients.map((c) => [c.id, c.name]))

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const endOfToday = new Date()
  endOfToday.setHours(23, 59, 59, 999)
  const tasksToday = tasks.filter((t) => {
    const due = t.dueDate?.toDate?.()
    return due && due >= startOfToday && due <= endOfToday && !isPendingFor(t, userId)
  })
  const tasksTodayRows = tasksToday
    .map((t) => ({
      id: t.id,
      title: t.title,
      clientName: clientNameById[t.clientId],
      dueDate: t.dueDate.toDate(),
      status: t.status || 'por_hacer',
    }))
    .sort((a, b) => a.dueDate - b.dueDate)

  const interventionRows = activeSPs.map((c) => ({
    client: c.name,
    week: c.interventionWeek || 1,
    totalWeeks: c.interventionTotalWeeks || 1,
    progress: c.interventionTotalWeeks
      ? Math.round(((c.interventionWeek || 1) / c.interventionTotalWeeks) * 100)
      : 0,
  }))

  // Próxima reunión comes from Google Calendar now (HomeScreen) — the old
  // `meetings` collection was never written by anything.

  const latestDecisionRaw = decisions
    .filter((d) => d.decidedAt?.toDate)
    .sort((a, b) => b.decidedAt.toDate() - a.decidedAt.toDate())[0]
  const latestDecision = latestDecisionRaw && {
    ...latestDecisionRaw,
    clientName: clientNameById[latestDecisionRaw.clientId],
  }

  // Resumen financiero now reads useFinanceData() in HomeScreen — the same
  // numbers as Finanzas (client payments + manual incomes), so the two can
  // never disagree.

  return {
    activeSPCount: activeSPs.length,
    pipelineSPCCount: pipelineSPCs.length,
    tasksTodayCount: tasksToday.length,
    tasksTodayRows,
    interventions: interventionRows,
    latestDecision,
  }
}
