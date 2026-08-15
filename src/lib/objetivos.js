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
