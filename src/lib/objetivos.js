// Objetivos vocabulary + metric definitions. Three metrics are "live" —
// derived from real Clientes/Finanzas/Workspace data, never hand-entered,
// same rule as every other cross-module number in this app (see CLAUDE.md
// §7/§8/§9/§10). "custom" is the escape hatch for goals that don't map to
// an existing collection (e.g. "Contratar un cuarto asociado").
export const OBJETIVO_METRICS = [
  { id: 'revenue_quarter', label: 'Ingresos del trimestre', unit: 'S/', live: true },
  { id: 'sp_activos', label: 'SP Activos', unit: 'SP', live: true },
  { id: 'spc_pipeline', label: 'SPC en Pipeline', unit: 'SPC', live: true },
  { id: 'tasks_completadas', label: 'Tareas completadas (trimestre)', unit: 'tareas', live: true },
  { id: 'custom', label: 'Métrica personalizada', unit: '', live: false },
]

export function metricLabel(id) {
  return OBJETIVO_METRICS.find((m) => m.id === id)?.label || id
}

export const OBJETIVO_TYPES = [
  { id: 'kpi', label: 'Meta numérica' },
  { id: 'milestone', label: 'Hito (sí/no)' },
]

// Free text, not a fixed enum — ADOR doesn't have formal departments yet
// (3 founders, no org chart), so a hardcoded 5-category taxonomy would be
// fiction. These are just <datalist> suggestions; the field stores whatever
// the user types, and the board groups by that string.
export const FOCO_SUGGESTIONS = ['Crecimiento', 'Ingresos', 'Tecnología', 'Operaciones', 'Marketing']

export const CONFIDENCE_LEVELS = [
  { id: 'verde', label: 'En camino', color: '#4CAF50' },
  { id: 'amarillo', label: 'En riesgo', color: '#FFC107' },
  { id: 'rojo', label: 'Bloqueado', color: '#EF5350' },
]

export function confidenceColor(id) {
  return CONFIDENCE_LEVELS.find((c) => c.id === id)?.color || '#444444'
}

// Experiment log — "prueba y falla rápido" needs its own status vocabulary,
// distinct from CONFIDENCE_LEVELS: a check-in is "how is the existing goal
// trending," an experiment is "did this specific bet pay off." Reuses the
// same traffic-light palette as Workspace's task priority (§10) for visual
// consistency, but they're conceptually different fields.
export const EXPERIMENT_STATUSES = [
  { id: 'pendiente', label: 'Corriendo', color: '#888888' },
  { id: 'validado', label: 'Validado', color: '#4CAF50' },
  { id: 'invalidado', label: 'Invalidado', color: '#EF5350' },
]

export function experimentStatusColor(id) {
  return EXPERIMENT_STATUSES.find((s) => s.id === id)?.color || '#888888'
}

// ---- Board helpers (ObjetivosModule redesign) ----

// 0–100. Milestones are all-or-nothing.
export function objetivoPct(o) {
  if (o.type === 'milestone') return o.completed ? 100 : 0
  if (!o.targetValue) return 0
  return Math.max(0, Math.min(100, Math.round(((o.currentValue || 0) / o.targetValue) * 100)))
}

export const OBJETIVO_STATUS = {
  logrado: { label: 'Logrado', color: '#E8C15A' },
  encamino: { label: 'En camino', color: '#4CAF50' },
  riesgo: { label: 'En riesgo', color: '#FFC107' },
  bloqueado: { label: 'Bloqueado', color: '#EF5350' },
}

// Reached → Logrado. Otherwise the owner's last check-in wins (rojo =
// Bloqueado, amarillo = En riesgo); with no check-in, a KPI more than 15
// points behind the share of the quarter already gone counts as En riesgo
// (same pace rule as Resumen Semanal).
export function objetivoStatus(o, elapsedPct, isCurrentQuarter) {
  const pct = objetivoPct(o)
  if (pct >= 100) return 'logrado'
  if (o.confidence === 'rojo') return 'bloqueado'
  if (o.confidence === 'amarillo') return 'riesgo'
  if (o.confidence === 'verde') return 'encamino'
  if (isCurrentQuarter && o.type !== 'milestone' && pct < elapsedPct - 15) return 'riesgo'
  return 'encamino'
}

// Which modules an objetivo is actually connected to: its live metric's
// source, plus Workspace when tasks are linked to it.
const METRIC_MODULE = { revenue_quarter: ['finanzas', 'Finanzas'], sp_activos: ['clientes', 'Clientes'], spc_pipeline: ['clientes', 'Clientes'], tasks_completadas: ['workspace', 'Workspace'] }
export function objetivoLinks(o) {
  const links = []
  const m = METRIC_MODULE[o.metric]
  if (m && o.type !== 'milestone') links.push({ module: m[0], label: m[1] })
  if (o.linkedTotal > 0 && !links.some((l) => l.module === 'workspace')) links.push({ module: 'workspace', label: `Workspace · ${o.linkedDone}/${o.linkedTotal} tareas` })
  return links
}

// '2026-Q3' → '2026-Q2' / '2026-Q4' (crossing years).
export function shiftQuarter(key, delta) {
  const [y, q] = key.split('-Q').map(Number)
  const idx = y * 4 + (q - 1) + delta
  return `${Math.floor(idx / 4)}-Q${(idx % 4) + 1}`
}
