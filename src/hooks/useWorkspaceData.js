import { useEffect, useState } from 'react'
import { subscribeClients, subscribeProyectosInternos, subscribeAllTasks, subscribeUsers } from '../lib/firestore'
import { workstreamId } from '../lib/workspace'

// Intervenciones are never stored — they're every client currently in
// "Intervención Activa", read live off `clients` (see lib/workspace.js and
// CLAUDE.md §8). Proyectos Internos are the only real Workspace collection.
export function useWorkspaceData() {
  const [clients, setClients] = useState([])
  const [proyectos, setProyectos] = useState([])
  const [tasks, setTasks] = useState([])
  const [users, setUsers] = useState([])

  useEffect(() => subscribeClients(setClients), [])
  useEffect(() => subscribeProyectosInternos(setProyectos), [])
  useEffect(() => subscribeAllTasks(setTasks), [])
  useEffect(() => subscribeUsers(setUsers), [])

  const intervenciones = clients
    .filter((c) => c.stage === 'intervencion_activa')
    .map((c) => ({
      id: workstreamId('intervencion', c.id),
      kind: 'intervencion',
      name: c.name,
      clientId: c.id,
      interventionWeek: c.interventionWeek || 1,
      interventionTotalWeeks: c.interventionTotalWeeks || 8,
    }))

  const proyectosInternos = proyectos.map((p) => ({
    id: workstreamId('proyecto', p.id),
    kind: 'proyecto_interno',
    name: p.name,
    proyectoId: p.id,
  }))

  const workstreams = [...intervenciones, ...proyectosInternos]

  const tasksByWorkstream = new Map()
  for (const task of tasks) {
    if (!task.workstreamId) continue
    const list = tasksByWorkstream.get(task.workstreamId) || []
    list.push(task)
    tasksByWorkstream.set(task.workstreamId, list)
  }

  const userById = Object.fromEntries(users.map((u) => [u.id, u]))

  return { workstreams, tasksByWorkstream, tasks, users, userById }
}
