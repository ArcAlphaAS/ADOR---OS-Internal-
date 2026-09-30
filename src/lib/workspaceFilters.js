import { STATUSES, PRIORITIES, isOverdue, isDueToday, statusMeta, priorityMeta } from './workspace'

// Filters, sort and grouping for Workspace's team views (Grupo/Lista, Kanban,
// Timeline, Calendario). Pure functions over the live task list — nothing
// here is stored except the "vistas guardadas" a person chooses to keep
// (users/{uid}.workspaceSavedViews).

export const DEFAULT_FILTERS = { q: '', people: [], statuses: [], priorities: [], date: 'all' }
export const DEFAULT_SORT = { by: 'manual', dir: 'asc' }
export const DEFAULT_GROUP = 'proyecto'
export const NO_ASSIGNEE = '__none'

export const DATE_FILTERS = [
  { id: 'all', label: 'Cualquier fecha' },
  { id: 'overdue', label: 'Atrasadas' },
  { id: 'today', label: 'Vencen hoy' },
  { id: 'week', label: 'Esta semana' },
  { id: 'none', label: 'Sin fecha' },
]
export const SORTS = [
  { id: 'manual', label: 'Orden de creación' },
  { id: 'due', label: 'Vencimiento' },
  { id: 'priority', label: 'Prioridad' },
  { id: 'status', label: 'Estado' },
  { id: 'title', label: 'Nombre' },
]
export const GROUPS = [
  { id: 'proyecto', label: 'Proyecto' },
  { id: 'estado', label: 'Estado' },
  { id: 'prioridad', label: 'Prioridad' },
  { id: 'responsable', label: 'Responsable' },
]

const norm = (s) => (s || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

function inThisWeek(task) {
  const due = task.dueDate?.toDate?.()
  if (!due) return false
  const now = new Date()
  const monday = new Date(now)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return due >= monday && due <= sunday
}

export function applyTaskFilters(tasks, f) {
  const words = norm(f.q).split(/\s+/).filter(Boolean)
  return tasks.filter((t) => {
    if (words.length) {
      const hay = norm(`${t.title} ${t.description || ''}`)
      if (!words.every((w) => hay.includes(w))) return false
    }
    if (f.people.length) {
      const a = t.assignedTo || []
      const ok = f.people.some((p) => (p === NO_ASSIGNEE ? a.length === 0 : a.includes(p)))
      if (!ok) return false
    }
    if (f.statuses.length && !f.statuses.includes(t.status)) return false
    if (f.priorities.length && !f.priorities.includes(t.priority)) return false
    if (f.date === 'overdue' && !isOverdue(t)) return false
    if (f.date === 'today' && !isDueToday(t)) return false
    if (f.date === 'week' && !inThisWeek(t)) return false
    if (f.date === 'none' && t.dueDate) return false
    return true
  })
}

export function activeFilterCount(f) {
  return (f.q ? 1 : 0) + f.people.length + f.statuses.length + f.priorities.length + (f.date !== 'all' ? 1 : 0)
}

const statusRank = (id) => STATUSES.findIndex((s) => s.id === id)
const priorityRank = (id) => {
  const i = PRIORITIES.findIndex((p) => p.id === id)
  return i === -1 ? PRIORITIES.length : i
}

export function sortTasks(tasks, sort) {
  if (!sort || sort.by === 'manual') return tasks
  const dir = sort.dir === 'desc' ? -1 : 1
  const due = (t) => t.dueDate?.toDate?.()?.getTime() ?? null
  return [...tasks].sort((a, b) => {
    let r = 0
    if (sort.by === 'due') {
      const x = due(a)
      const y = due(b)
      if (x === null && y === null) r = 0
      else if (x === null) return 1 // undated always last, whichever the direction
      else if (y === null) return -1
      else r = x - y
    } else if (sort.by === 'priority') r = priorityRank(a.priority) - priorityRank(b.priority)
    else if (sort.by === 'status') r = statusRank(a.status) - statusRank(b.status)
    else if (sort.by === 'title') r = (a.title || '').localeCompare(b.title || '', 'es')
    return r * dir
  })
}

// Virtual groups for Lista when it isn't grouped by project. A task with
// several assignees shows in each of their groups (that's how Monday/Linear
// group by person too).
export function groupTasks(tasks, group, { userById = {} } = {}) {
  const make = (key, name, accent, list) => ({ id: `group:${group}:${key}`, kind: 'virtual', name, accent, tasks: list })
  if (group === 'estado') return STATUSES.map((s) => make(s.id, s.label, s.color === '#444444' ? '#888888' : s.color, tasks.filter((t) => statusMeta(t.status).id === s.id))).filter((g) => g.tasks.length)
  if (group === 'prioridad') return PRIORITIES.map((p) => make(p.id, `Prioridad ${p.label.toLowerCase()}`, p.color, tasks.filter((t) => priorityMeta(t.priority).id === p.id))).filter((g) => g.tasks.length)
  if (group === 'responsable') {
    const byUser = new Map()
    const none = []
    for (const t of tasks) {
      const a = t.assignedTo || []
      if (!a.length) none.push(t)
      for (const uid of a) byUser.set(uid, [...(byUser.get(uid) || []), t])
    }
    const groups = [...byUser].map(([uid, list]) => make(uid, userById[uid]?.displayName || userById[uid]?.email || 'Alguien', '#1E5FAD', list))
    groups.sort((a, b) => a.name.localeCompare(b.name, 'es'))
    if (none.length) groups.push(make('none', 'Sin asignar', '#666666', none))
    return groups
  }
  return []
}
