import { useEffect, useState } from 'react'
import {
  subscribeClients,
  subscribeInterventions,
  subscribeTasksForUser,
  subscribeDecisions,
  subscribeMeetings,
  subscribeRevenue,
} from '../lib/firestore'

// Shapes expected on each collection (beyond what's in firestore.js):
//   clients:       { name, status: 'active' | 'inactive' }
//   interventions: { clientId, status: 'active' | 'completed', weekNumber, totalWeeks }
//   tasks:         { assignedTo, title, dueDate: Timestamp, status }
//   decisions:     { title, decidedAt: Timestamp }
//   meetings:      { title, startsAt: Timestamp }
//   revenue:       { month: 'YYYY-MM', amount: number } — one doc per month
export function useHomeData(userId) {
  const [clients, setClients] = useState([])
  const [interventions, setInterventions] = useState([])
  const [tasks, setTasks] = useState([])
  const [decisions, setDecisions] = useState([])
  const [meetings, setMeetings] = useState([])
  const [revenue, setRevenue] = useState([])

  useEffect(() => subscribeClients(setClients), [])
  useEffect(() => subscribeInterventions(setInterventions), [])
  useEffect(() => subscribeDecisions(setDecisions), [])
  useEffect(() => subscribeMeetings(setMeetings), [])
  useEffect(() => subscribeRevenue(setRevenue), [])
  useEffect(() => {
    if (!userId) return
    return subscribeTasksForUser(userId, setTasks)
  }, [userId])

  const activeClients = clients.filter((c) => c.status === 'active')
  const activeInterventions = interventions.filter((i) => i.status === 'active')

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const endOfToday = new Date()
  endOfToday.setHours(23, 59, 59, 999)
  const tasksToday = tasks.filter((t) => {
    const due = t.dueDate?.toDate?.()
    return due && due >= startOfToday && due <= endOfToday
  })

  const clientNameById = Object.fromEntries(clients.map((c) => [c.id, c.name]))
  const interventionRows = activeInterventions.map((i) => ({
    client: clientNameById[i.clientId] || 'Cliente',
    week: i.weekNumber,
    totalWeeks: i.totalWeeks,
    progress: i.totalWeeks ? Math.round((i.weekNumber / i.totalWeeks) * 100) : 0,
  }))

  const now = new Date()
  const upcomingMeeting = meetings
    .filter((m) => m.startsAt?.toDate?.() >= now)
    .sort((a, b) => a.startsAt.toDate() - b.startsAt.toDate())[0]

  const latestDecision = decisions
    .filter((d) => d.decidedAt?.toDate)
    .sort((a, b) => b.decidedAt.toDate() - a.decidedAt.toDate())[0]

  const latestRevenue = revenue[revenue.length - 1]
  const previousRevenue = revenue[revenue.length - 2]
  const revenueChangePct =
    latestRevenue && previousRevenue?.amount
      ? ((latestRevenue.amount - previousRevenue.amount) / previousRevenue.amount) * 100
      : null

  return {
    activeClientsCount: activeClients.length,
    activeInterventionsCount: activeInterventions.length,
    tasksTodayCount: tasksToday.length,
    interventions: interventionRows,
    upcomingMeeting,
    latestDecision,
    revenueSeries: revenue.slice(-6),
    latestRevenueAmount: latestRevenue?.amount,
    revenueChangePct,
  }
}
