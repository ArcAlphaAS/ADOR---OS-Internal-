import { useEffect, useState } from 'react'
import {
  subscribeClients,
  subscribeTasksForUser,
  subscribeDecisions,
  subscribeMeetings,
} from '../lib/firestore'

// Shapes expected on each collection (beyond what's in firestore.js):
//   clients:   { name, stage, pago1: {amount, status, date}, pago2: {...},
//                interventionWeek, interventionTotalWeeks }
//   tasks:     { assignedTo, title, dueDate: Timestamp, status, clientId? }
//   decisions: { title, decidedAt: Timestamp, clientId? }
//   meetings:  { title, startsAt: Timestamp, clientId? }
// `clientId` on tasks/decisions/meetings is optional — there's no UI to
// create them yet (Workspace/Calendario are still placeholders), but Home
// already resolves it to a client name wherever present so nothing needs to
// change here once those modules exist and start writing it.
export function useHomeData(userId) {
  const [clients, setClients] = useState([])
  const [tasks, setTasks] = useState([])
  const [decisions, setDecisions] = useState([])
  const [meetings, setMeetings] = useState([])

  useEffect(() => subscribeClients(setClients), [])
  useEffect(() => subscribeDecisions(setDecisions), [])
  useEffect(() => subscribeMeetings(setMeetings), [])
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
    return due && due >= startOfToday && due <= endOfToday
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

  const now = new Date()
  const upcomingMeetingRaw = meetings
    .filter((m) => m.startsAt?.toDate?.() >= now)
    .sort((a, b) => a.startsAt.toDate() - b.startsAt.toDate())[0]
  const upcomingMeeting = upcomingMeetingRaw && {
    ...upcomingMeetingRaw,
    clientName: clientNameById[upcomingMeetingRaw.clientId],
  }

  const latestDecisionRaw = decisions
    .filter((d) => d.decidedAt?.toDate)
    .sort((a, b) => b.decidedAt.toDate() - a.decidedAt.toDate())[0]
  const latestDecision = latestDecisionRaw && {
    ...latestDecisionRaw,
    clientName: clientNameById[latestDecisionRaw.clientId],
  }

  // Revenue is derived from real payment records (pago1/pago2 across all
  // clients) rather than a hand-entered monthly total — one source of truth
  // shared with the Clientes module's Pagos tab. See CLAUDE.md §8.
  const monthTotals = new Map()
  for (const client of clients) {
    for (const key of ['pago1', 'pago2']) {
      const payment = client[key]
      if (payment?.status !== 'Recibido' || !payment.date || !payment.amount) continue
      const monthKey = payment.date.slice(0, 7)
      monthTotals.set(monthKey, (monthTotals.get(monthKey) || 0) + payment.amount)
    }
  }
  const revenueSeries = [...monthTotals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, amount]) => ({ month, amount }))
  const latestRevenueEntry = revenueSeries[revenueSeries.length - 1]
  const previousRevenueEntry = revenueSeries[revenueSeries.length - 2]
  const revenueChangePct =
    latestRevenueEntry && previousRevenueEntry?.amount
      ? ((latestRevenueEntry.amount - previousRevenueEntry.amount) / previousRevenueEntry.amount) * 100
      : null

  return {
    activeSPCount: activeSPs.length,
    pipelineSPCCount: pipelineSPCs.length,
    tasksTodayCount: tasksToday.length,
    tasksTodayRows,
    interventions: interventionRows,
    upcomingMeeting,
    latestDecision,
    revenueSeries: revenueSeries.slice(-6),
    latestRevenueAmount: latestRevenueEntry?.amount,
    revenueChangePct,
  }
}
