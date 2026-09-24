// Workspace vocabulary. Two kinds of work live side by side:
//   Intervención      — one per SP in "Intervención Activa", never stored as
//                        its own record. Derived live from clients/{id} (see
//                        CLAUDE.md §8 — intervention progress already lives
//                        on the client doc; a parallel `interventions`
//                        collection was tried and retired for this exact
//                        reason). Its id is `client:{clientId}`.
//   Proyecto Interno   — internal ADOR work (platform, marketing, ops), no
//                        SP behind it. Stored in `proyectosInternos`. Its
//                        workstream id is `proyecto:{proyectoId}`.
// Tasks reference whichever id via `workstreamId`.

export const STATUSES = [
  { id: 'por_hacer', label: 'Por Hacer', color: '#444444' },
  { id: 'en_progreso', label: 'En Progreso', color: '#1E5FAD' },
  { id: 'completado', label: 'Completado', color: '#4CAF50' },
  { id: 'bloqueado', label: 'Bloqueado', color: '#EF5350' },
]
export const STATUS_BY_ID = Object.fromEntries(STATUSES.map((s) => [s.id, s]))
export function statusMeta(id) {
  return STATUS_BY_ID[id] || STATUS_BY_ID.por_hacer
}

export const PRIORITIES = [
  { id: 'alta', label: 'Alta', color: '#EF5350' },
  { id: 'media', label: 'Media', color: '#FFC107' },
  { id: 'baja', label: 'Baja', color: '#4CAF50' },
]
export const PRIORITY_BY_ID = Object.fromEntries(PRIORITIES.map((p) => [p.id, p]))
export function priorityMeta(id) {
  return PRIORITY_BY_ID[id] || PRIORITY_BY_ID.media
}

// Turns a raw updateTask() patch into a human-readable activity-log line —
// used by lib/firestore.js's applyTaskUpdate so every edit surface (Lista's
// inline cells, the Task Detail Panel, Kanban drag-and-drop) leaves the same
// kind of trail without each call site having to know the copy itself.
export function describeTaskChange(data) {
  if ('status' in data) return `Estado → ${statusMeta(data.status).label}`
  if ('priority' in data) return `Prioridad → ${priorityMeta(data.priority).label}`
  if ('assignedTo' in data) return 'Asignados actualizados'
  if ('startDate' in data || 'dueDate' in data) return 'Fechas actualizadas'
  if ('workstreamId' in data) return 'Proyecto actualizado'
  if ('description' in data) return 'Descripción actualizada'
  if ('title' in data) return 'Título actualizado'
  return 'Tarea actualizada'
}

// ADOR's 7-layer methodology — every Intervención moves through these over
// its fixed 8-week run. There's no per-client "current layer" field on
// purpose (see file header): it's computed from the existing
// interventionWeek/interventionTotalWeeks fields Clientes already writes.
export const LAYERS = [
  'Arquitectura del Modelo de Negocio',
  'Arquitectura Estratégica y de Crecimiento',
  'Arquitectura Competitiva y de Mercado',
  'Arquitectura Comercial',
  'Arquitectura Financiera y Económica',
  'Arquitectura Operacional',
  'Arquitectura del Futuro',
]

export function currentLayer(interventionWeek, interventionTotalWeeks) {
  const week = interventionWeek || 1
  const total = interventionTotalWeeks || 8
  return Math.min(LAYERS.length, Math.max(1, Math.ceil((week / total) * LAYERS.length)))
}

// A task assigned to `uid` that they haven't accepted yet (see
// AssignmentConfirmGate.jsx) doesn't count as "theirs" for personal views —
// Hoy, the Personal filter, and the notification bell all exclude it until
// resolved, so nothing nags someone about a task before they've agreed to it.
export function isPendingFor(task, uid) {
  return (task.pendingConfirmations || []).includes(uid)
}

// A workstream's "salud" (health) pill — inspired by a project-pipeline
// reference the user shared (colored Schedule/Budget Health columns), but
// derived from real task data instead of a manually-set status field: any
// open overdue task in the group means "Atrasado," otherwise "En tiempo."
// Reuses computeWorkload's isOverdue rather than inventing a second signal.
export function workstreamHealth(tasks) {
  if (tasks.length === 0) return null
  const hasOverdue = tasks.some((t) => t.status !== 'completado' && isOverdue(t))
  return hasOverdue ? { label: 'Atrasado', color: '#EF5350' } : { label: 'En tiempo', color: '#4CAF50' }
}

export function isOverdue(task) {
  const due = task.dueDate?.toDate?.()
  return Boolean(due && task.status !== 'completado' && due < new Date())
}

export function isDueToday(task) {
  const due = task.dueDate?.toDate?.()
  if (!due) return false
  const now = new Date()
  return due.toDateString() === now.toDateString()
}

// Same "was this touched today" check as isDueToday, but against
// completedAt instead of dueDate — powers Hoy's "Completado hoy" section.
export function isCompletedToday(task) {
  const completedAt = task.completedAt?.toDate?.()
  if (!completedAt) return false
  return completedAt.toDateString() === new Date().toDateString()
}

const PRIORITY_RANK = { alta: 0, media: 1, baja: 2 }

// Picks the single most urgent open task for Hoy's "Enfoque actual" card —
// oldest overdue first, then today's highest-priority, then the highest-
// priority item in the general backlog. A visual highlight only, no timer
// state (deliberate scope cut, see HoyView.jsx) — "Iniciar enfoque" just
// opens this task's detail panel.
export function pickFocusTask(vencidas, hoy, pendientes) {
  const byPriority = (a, b) => (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1)
  if (vencidas.length) return [...vencidas].sort(byPriority)[0]
  if (hoy.length) return [...hoy].sort(byPriority)[0]
  if (pendientes.length) return [...pendientes].sort(byPriority)[0]
  return null
}

// Seeded by day-of-year (same stable-within-a-day, varies-day-to-day
// pattern as GreetingBlock's rotating subtext) rather than randomized on
// every render/reload.
const HOY_QUOTES = [
  'Enfócate en lo que mueve la aguja.',
  'La disciplina construye libertad.',
  'Lo simple, bien hecho, gana.',
  'Un paso claro vale más que diez dispersos.',
  'Hoy es el único día que puedes mover.',
  'La consistencia compone el resultado.',
]
export function dailyQuote(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((date - start) / 86400000)
  return HOY_QUOTES[dayOfYear % HOY_QUOTES.length]
}

function isDueThisWeek(task) {
  const due = task.dueDate?.toDate?.()
  if (!due) return false
  const now = new Date()
  const weekEnd = new Date(now)
  weekEnd.setDate(now.getDate() + (7 - now.getDay()))
  weekEnd.setHours(23, 59, 59, 999)
  return due <= weekEnd && task.status !== 'completado'
}

// One row per user with an open (non-completado) task assigned to them —
// "esta semana" counts overdue + due-within-this-week tasks specifically,
// since that's the number that actually predicts who's about to be
// overloaded, not just who has the most tasks parked far in the future.
// Sorted by dueThisWeek desc so the person closest to overloaded leads.
export function computeWorkload(tasks, users) {
  const openTasks = tasks.filter((t) => t.status !== 'completado')
  return users
    .map((u) => {
      const assigned = openTasks.filter((t) => (t.assignedTo || []).includes(u.id) && !isPendingFor(t, u.id))
      return {
        userId: u.id,
        displayName: u.displayName || u.email || 'Sin nombre',
        openCount: assigned.length,
        dueThisWeekCount: assigned.filter(isDueThisWeek).length,
      }
    })
    .filter((row) => row.openCount > 0)
    .sort((a, b) => b.dueThisWeekCount - a.dueThisWeekCount || b.openCount - a.openCount)
}

export function workstreamId(kind, id) {
  return kind === 'intervencion' ? `client:${id}` : `proyecto:${id}`
}

// Firestore writes that never get a valid auth token attached (signed-out
// session, expired token) don't always reject promptly — the SDK can leave
// the promise pending indefinitely instead of surfacing a clear error. Every
// inline write in Workspace races against this so a stuck write reads as
// "this failed, try again" instead of silently doing nothing forever, which
// looks indistinguishable from a broken button.
export function withTimeout(promise, ms = 8000) {
  // Offline, a write isn't failing — Firestore keeps it and sends it the
  // moment the connection is back. So with no connection the clock simply
  // waits for 'online' and starts again; only a write that stalls *while
  // online* counts as an error. (The "Sin conexión" pill, OfflineBanner,
  // tells the person what's going on.)
  return new Promise((resolve, reject) => {
    let done = false
    promise.then(
      (v) => {
        done = true
        resolve(v)
      },
      (e) => {
        done = true
        reject(e)
      }
    )
    const arm = () =>
      setTimeout(() => {
        if (done) return
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          window.addEventListener('online', arm, { once: true })
          return
        }
        reject(new Error('Tardó demasiado — revisa tu conexión o que tu sesión siga activa'))
      }, ms)
    arm()
  })
}

// Shared between the Lista header row and every TaskRow so columns always
// line up — a CSS grid template rather than an HTML <table> so column
// widths are explicit and predictable instead of shrinking/overflowing
// based on content (which is what was clipping the Estado column).
// checkbox · tarea · descripción · asignado · prioridad · estimación · estado
export const TASK_ROW_GRID = '28px minmax(140px,1.3fr) minmax(120px,1fr) 92px 88px 120px 104px'

// Same shape as TASK_ROW_GRID plus a Proyecto column — for the two places a
// task list isn't already grouped by workstream (so the project isn't
// implied by a section header the way it is in Lista's WorkstreamGroup):
// Personal's task table and Hoy's sections. Grupo/Lista deliberately keeps
// TASK_ROW_GRID as-is, no Proyecto column, since that would just repeat
// the group header on every row.
export const PROJECT_TASK_ROW_GRID = '28px minmax(130px,1.1fr) 108px minmax(110px,1fr) 88px 84px 110px 100px'
