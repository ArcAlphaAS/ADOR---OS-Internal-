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
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Tardó demasiado — revisa tu conexión o que tu sesión siga activa')), ms)),
  ])
}

// Shared between the Lista header row and every TaskRow so columns always
// line up — a CSS grid template rather than an HTML <table> so column
// widths are explicit and predictable instead of shrinking/overflowing
// based on content (which is what was clipping the Estado column).
// checkbox · tarea · descripción · asignado · prioridad · estimación · estado
export const TASK_ROW_GRID = '28px minmax(140px,1.3fr) minmax(120px,1fr) 92px 88px 120px 104px'
