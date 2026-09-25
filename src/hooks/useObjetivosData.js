import { useEffect, useState } from 'react'
import { subscribeObjetivos, subscribeClients, subscribeAllTasks, subscribeUsers, subscribeExperimentos, subscribeDecisions } from '../lib/firestore'
import { clientType } from '../lib/clientStages'
import { quarterKey, isInQuarter } from '../lib/finance'
import { useFinanceData } from './useFinanceData'

// Resolves each Objetivo's `currentValue` live from real data instead of a
// hand-entered number — same "no parallel manually-entered source" rule as
// Finanzas/Home/Workspace (see CLAUDE.md §7/§8/§9/§10). Only `metric:
// 'custom'` goals carry a manually-edited currentValue (set either via the
// pencil-edit on the card or a Friday check-in — see submitCheckin), since
// there's no existing collection a custom goal could read from.
// `selectedQuarter` (e.g. '2026-Q3') lets the page browse other quarters.
// Live metrics only exist for the current quarter; other quarters show each
// objetivo's stored value (custom metrics) and no live number.
export function useObjetivosData(selectedQuarter) {
  const [objetivos, setObjetivos] = useState([])
  const [clients, setClients] = useState([])
  const [tasks, setTasks] = useState([])
  const [users, setUsers] = useState([])
  const { recaudadoTrimestre } = useFinanceData()

  useEffect(() => subscribeObjetivos(setObjetivos), [])
  useEffect(() => subscribeClients(setClients), [])
  useEffect(() => subscribeAllTasks(setTasks), [])
  useEffect(() => subscribeUsers(setUsers), [])
  const [experimentos, setExperimentos] = useState([])
  const [decisions, setDecisions] = useState([])
  useEffect(() => subscribeExperimentos(setExperimentos), [])
  useEffect(() => subscribeDecisions(setDecisions), [])

  const currentQuarter = quarterKey()
  const qKey = selectedQuarter || currentQuarter
  const isCurrent = qKey === currentQuarter
  const spActivos = clients.filter((c) => c.stage === 'intervencion_activa').length
  const spcPipeline = clients.filter((c) => clientType(c.stage) === 'SPC').length
  const tasksCompletadas = tasks.filter(
    (t) => t.status === 'completado' && t.createdAt?.toDate && isInQuarter(t.createdAt.toDate().toISOString().slice(0, 10), qKey)
  ).length

  const liveValueByMetric = {
    revenue_quarter: recaudadoTrimestre,
    sp_activos: spActivos,
    spc_pipeline: spcPipeline,
    tasks_completadas: tasksCompletadas,
  }

  // Linked tasks are how "what am I doing this week that moves this goal"
  // stays connected to real Workspace work instead of a parallel task list
  // — a task tags itself to an objetivo via an optional `objetivoId` field
  // (set from Task Detail Panel), counted here rather than stored on the
  // objetivo doc so it's always in sync with the actual task list.
  const openLinkedTaskCount = (objetivoId) =>
    tasks.filter((t) => t.objetivoId === objetivoId && t.status !== 'completado').length

  const resolved = objetivos.map((o) => {
    const currentValue =
      o.type === 'milestone' ? undefined : o.metric === 'custom' || !isCurrent ? o.currentValue || 0 : liveValueByMetric[o.metric] || 0
    const linked = tasks.filter((t) => t.objetivoId === o.id)
    return { ...o, currentValue, linkedTaskCount: openLinkedTaskCount(o.id), linkedDone: linked.filter((t) => t.status === 'completado').length, linkedTotal: linked.length }
  })

  const currentQuarterObjetivos = resolved
    .filter((o) => o.quarter === qKey)
    .sort((a, b) => (a.createdAt?.toDate?.() || 0) - (b.createdAt?.toDate?.() || 0))

  const northStar = currentQuarterObjetivos.find((o) => o.isNorthStar) || null

  // The "Focus Board" from the spec, built on Workspace's real tasks instead
  // of a parallel list — every open task tagged with an objetivoId belonging
  // to *this* quarter, enriched with the objetivo's title and the assignees'
  // user records so IniciativasPanel doesn't have to re-join anything.
  const objetivoById = Object.fromEntries(currentQuarterObjetivos.map((o) => [o.id, o]))
  const userById = Object.fromEntries(users.map((u) => [u.id, u]))
  const openLinkedTasks = tasks
    .filter((t) => t.objetivoId && objetivoById[t.objetivoId] && t.status !== 'completado')
    .map((t) => ({
      ...t,
      objetivoTitle: objetivoById[t.objetivoId].title,
      assignees: (t.assignedTo || []).map((uid) => userById[uid]).filter(Boolean),
    }))
    .sort((a, b) => (a.dueDate?.toDate?.() || Infinity) - (b.dueDate?.toDate?.() || Infinity))

  // Counts for the summary strip.
  const activeExperiments = experimentos.filter((e) => (e.status || 'pendiente') === 'pendiente').length
  const quarterDecisions = decisions.filter((d) => {
    const at = d.decidedAt?.toDate?.() || d.createdAt?.toDate?.()
    return at ? quarterKey(at) === qKey : false
  }).length

  return {
    objetivos: currentQuarterObjetivos,
    quarterKey: qKey,
    isCurrentQuarter: isCurrent,
    northStar,
    users,
    openLinkedTasks,
    liveValueByMetric,
    activeExperiments,
    quarterDecisions,
  }
}
