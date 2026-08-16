import { useEffect, useState } from 'react'
import { subscribeAllTasks, subscribeUsers, subscribeClients } from '../lib/firestore'
import { useFinanceData } from './useFinanceData'
import { useObjetivosData } from './useObjetivosData'
import { computeWorkload, isOverdue } from '../lib/workspace'
import { clientType, daysSince } from '../lib/clientStages'
import { buildAdorIAContext } from '../lib/adorIA'

// Same data every other live module already reads — no independent
// subscriptions invented just for the chat. Recomputed on every render so
// the context sent to Gemini is always current, not a stale snapshot from
// when the chat first opened.
export function useAdorIAContext() {
  const [tasks, setTasks] = useState([])
  const [users, setUsers] = useState([])
  const [clients, setClients] = useState([])
  const finance = useFinanceData()
  const { objetivos, quarterKey } = useObjetivosData()

  useEffect(() => subscribeAllTasks(setTasks), [])
  useEffect(() => subscribeUsers(setUsers), [])
  useEffect(() => subscribeClients(setClients), [])

  const openTasks = tasks.filter((t) => t.status !== 'completado')
  const overdueTasks = tasks.filter(isOverdue)
  const workload = computeWorkload(tasks, users)

  const staleClients = clients.filter((c) => {
    if (c.stage === 'intervencion_activa' || c.lost) return false
    const days = daysSince(c.lastContactAt?.toDate?.() || c.createdAt?.toDate?.())
    return days !== null && days >= 7
  })

  const data = {
    finance,
    objetivos,
    quarterKey,
    tasksOpenCount: openTasks.length,
    tasksOverdueCount: overdueTasks.length,
    workload,
    clientsPipeline: clients.filter((c) => clientType(c.stage) === 'SPC' && !c.lost).length,
    clientsActive: clients.filter((c) => c.stage === 'intervencion_activa').length,
    staleClients,
  }

  // `data` feeds the zero-cost local answerer (see lib/adorIA.js); `text` is
  // the formatted context block kept ready for when GEMINI_API_KEY is added.
  return { data, text: buildAdorIAContext(data) }
}
