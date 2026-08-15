import { useEffect, useState } from 'react'
import { subscribeAllTasks, subscribeUsers } from '../lib/firestore'
import { useFinanceData } from './useFinanceData'
import { useObjetivosData } from './useObjetivosData'
import { computeWorkload, isOverdue } from '../lib/workspace'
import { daysSince } from '../lib/clientStages'
import { weekRange, buildWeeklyNarrative } from '../lib/weeklySummary'

// Pulls together the same live data every other module already reads —
// Finanzas' movements, Workspace's tasks/workload, Objetivos' confidence
// state, Clientes' pipeline — into one Monday-Sunday synthesis instead of
// leaving the founders to piece it together by opening four tabs.
export function useWeeklySummary() {
  const [tasks, setTasks] = useState([])
  const [users, setUsers] = useState([])
  const finance = useFinanceData()
  const { objetivos, northStar } = useObjetivosData()

  useEffect(() => subscribeAllTasks(setTasks), [])
  useEffect(() => subscribeUsers(setUsers), [])

  const range = weekRange()
  const toDateStr = (d) => d.toISOString().slice(0, 10)
  const startStr = toDateStr(range.start)
  const endStr = toDateStr(range.end)
  const prevStartStr = toDateStr(range.prevStart)
  const prevEndStr = toDateStr(range.prevEnd)

  const incomeThisWeek = finance.movements
    .filter((m) => m.type === 'ingreso' && m.date >= startStr && m.date <= endStr)
    .reduce((sum, m) => sum + m.amount, 0)
  const incomeLastWeek = finance.movements
    .filter((m) => m.type === 'ingreso' && m.date >= prevStartStr && m.date <= prevEndStr)
    .reduce((sum, m) => sum + m.amount, 0)
  const expensesThisWeek = finance.movements
    .filter((m) => m.type === 'gasto' && m.date >= startStr && m.date <= endStr)
    .reduce((sum, m) => sum + m.amount, 0)

  const paymentsReceivedThisWeek = []
  const pendingPaymentsThisWeek = []
  const newClients = []
  const staleClients = []
  for (const client of finance.clients) {
    for (const key of ['pago1', 'pago2']) {
      const payment = client[key]
      if (!payment?.date) continue
      if (payment.status === 'Recibido' && payment.date >= startStr && payment.date <= endStr) {
        paymentsReceivedThisWeek.push({ clientName: client.name, amount: payment.amount })
      }
      if (payment.status === 'Pendiente' && payment.date >= startStr && payment.date <= endStr) {
        pendingPaymentsThisWeek.push({ clientName: client.name, amount: payment.amount })
      }
    }
    const createdAt = client.createdAt?.toDate?.()
    if (createdAt && createdAt >= range.start && createdAt <= range.end) newClients.push(client)
    if (client.stage !== 'intervencion_activa' && !client.lost) {
      const days = daysSince(client.lastContactAt?.toDate?.() || client.createdAt?.toDate?.())
      if (days !== null && days >= 7) staleClients.push(client)
    }
  }

  const tasksCompletedThisWeek = tasks.filter((t) => {
    const completedAt = t.completedAt?.toDate?.()
    return completedAt && completedAt >= range.start && completedAt <= range.end
  }).length
  const tasksOverdue = tasks.filter(isOverdue)
  const workload = computeWorkload(tasks, users)

  const birthdaysThisWeek = users.filter((u) => {
    if (!u.birthday) return false
    const [, month, day] = u.birthday.split('-').map(Number)
    const now = new Date()
    // Check each day of the current week for a month/day match.
    for (let i = 0; i < 7; i++) {
      const d = new Date(range.start)
      d.setDate(range.start.getDate() + i)
      if (d.getMonth() + 1 === month && d.getDate() === day) return true
    }
    return false
  })

  const narrative = buildWeeklyNarrative({
    incomeThisWeek,
    incomeLastWeek,
    expensesThisWeek,
    tasksCompletedThisWeek,
    tasksOverdue,
    workload,
    objetivos,
    northStar,
    newClients,
    staleClients,
    paymentsReceivedThisWeek,
    pendingPaymentsThisWeek,
    birthdaysThisWeek,
  })

  return { ...narrative, range }
}
