// ADOR's pipeline vocabulary — never "cliente"/"prospecto" in UI copy.
// An SPC (Strategic Partner Candidate) moves through the first 6 stages;
// reaching "Intervención Activa" converts it into an SP (Strategic Partner).
export const STAGES = [
  { id: 'generacion', label: 'Generación', type: 'SPC' },
  { id: 'contacto', label: 'Contacto', type: 'SPC' },
  { id: 'calificacion', label: 'Calificación', type: 'SPC' },
  { id: 'lectura', label: 'Lectura', type: 'SPC' },
  { id: 'propuesta', label: 'Propuesta Comercial', type: 'SPC' },
  { id: 'cierre', label: 'Cierre', type: 'SPC' },
  { id: 'intervencion_activa', label: 'Intervención Activa', type: 'SP' },
]

export const STAGE_ORDER = STAGES.map((s) => s.id)
export const STAGE_BY_ID = Object.fromEntries(STAGES.map((s) => [s.id, s]))

export function stageLabel(stageId) {
  return STAGE_BY_ID[stageId]?.label || stageId
}

export function clientType(stageId) {
  return STAGE_BY_ID[stageId]?.type || 'SPC'
}

export const INTERACTION_TYPES = ['Llamada', 'Reunión', 'Lectura', 'Email', 'WhatsApp']

// "Perdido" is deliberately not a STAGES entry — the 7 stages above are a
// forward-only pipeline (Kanban columns, "move to next" arrows) and a lost
// SPC isn't the "next step" from anywhere. Instead a client can carry
// `lost: true` on top of whatever stage it froze at, same pattern as
// pago1/pago2 living on the client doc rather than a parallel collection
// (CLAUDE.md §8). Fixed reasons, not free text, since the set is small and
// known — same rationale as Finanzas' EXPENSE_CATEGORIES.
export const LOST_REASONS = ['Presupuesto', 'Timing', 'Eligió otra opción', 'Sin respuesta', 'Otro']

export function daysSince(date) {
  if (!date) return null
  const ms = Date.now() - date.getTime()
  return Math.floor(ms / 86400000)
}

// Amber past a week without movement/contact, red past two — used for both
// "days in stage" (Kanban card) and "days since last contact" (List view).
export function urgencyColor(days) {
  if (days === null) return '#444444'
  if (days >= 14) return '#E05252'
  if (days >= 7) return '#B8860B'
  return '#444444'
}

export const PAGO1_PERCENT = 60
export const PAGO2_PERCENT = 40

export function paymentStatusLabel(client) {
  const p1 = client?.pago1?.status === 'Recibido'
  const p2 = client?.pago2?.status === 'Recibido'
  if (p1 && p2) return 'Pagado'
  if (p1) return `${PAGO1_PERCENT}% recibido`
  if (p2) return `${PAGO2_PERCENT}% recibido`
  return 'Pendiente'
}

export function stageColor(stageId) {
  return clientType(stageId) === 'SP' ? '#1E5FAD' : '#888888'
}

export const currencyPEN = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  maximumFractionDigits: 0,
})
