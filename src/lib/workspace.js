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
