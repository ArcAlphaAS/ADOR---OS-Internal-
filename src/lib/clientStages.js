// ADOR's pipeline vocabulary — never "cliente"/"prospecto" in UI copy.
// An SPC (Strategic Partner Candidate) moves through the first 6 stages;
// reaching "Intervención Activa" converts it into an SP (Strategic Partner).
export const STAGES = [
  { id: 'generacion', label: 'Generación', type: 'SPC', description: 'Candidatos identificados' },
  { id: 'contacto', label: 'Contacto', type: 'SPC', description: 'Primer acercamiento' },
  { id: 'calificacion', label: 'Calificación', type: 'SPC', description: 'Validación de encaje' },
  { id: 'lectura', label: 'Lectura', type: 'SPC', description: 'Diagnóstico inicial' },
  { id: 'propuesta', label: 'Propuesta Comercial', type: 'SPC', description: 'Solución y propuesta' },
  { id: 'cierre', label: 'Cierre', type: 'SPC', description: 'Términos y decisión' },
  { id: 'intervencion_activa', label: 'Intervención Activa', type: 'SP', description: 'SP en ejecución' },
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

// "Completado": a client whose work is done but who may come back (a new
// service later). Like `lost`, it is a flag on top of the frozen stage
// (`completed`, `completedAt`, `completedNote`) — it keeps its history and
// payments, leaves the active pipeline and Workspace, and "Nuevo servicio"
// reopens it. Each closed cycle is archived in `serviceHistory`
// ([{ id, type, amount, completedAt, note, pagos: { pago1, pago2 } }]) so the
// old payments keep counting in Finanzas. A client is "open" when it's in
// neither end state.
export const isOpenClient = (c) => !c.lost && !c.completed

// Service types are managed by administrators (settings/clientServices); each
// one has a MODALITY — how that kind of service is billed and how long it
// lasts. These are the defaults until they change them.
export const MODALITIES = [
  { id: 'proyecto', label: 'Proyecto fijo', hint: 'Intervención con 2 pagos: 60 % y 40 %' },
  { id: 'contrato', label: 'Contrato', hint: 'Periodo base y opciones de renovación, cobros periódicos' },
  { id: 'suscripcion', label: 'Suscripción', hint: 'Un cobro que se repite, sin fecha de fin' },
  { id: 'unico', label: 'Pago único', hint: 'Un solo cobro' },
]
export const modalityLabel = (id) => MODALITIES.find((m) => m.id === id)?.label || 'Proyecto fijo'

// How often a contract / subscription bills.
export const BILLING_EVERY = [
  { id: 'mes', months: 1, label: 'Mensual', per: 'mes' },
  { id: 'trimestre', months: 3, label: 'Trimestral', per: 'trimestre' },
  { id: 'anio', months: 12, label: 'Anual', per: 'año' },
]
export const everyMeta = (id) => BILLING_EVERY.find((e) => e.id === id) || BILLING_EVERY[2]

export const DEFAULT_SERVICES = [
  { id: 'intervencion', label: 'Intervención', modality: 'proyecto' },
  { id: 'contrato', label: 'Contrato', modality: 'contrato' },
  { id: 'suscripcion', label: 'Suscripción mensual', modality: 'suscripcion' },
]
const findService = (id, services) => (services || []).find((s) => s.id === id) || DEFAULT_SERVICES.find((s) => s.id === id)
export const serviceLabel = (id, services = DEFAULT_SERVICES) => findService(id, services)?.label || (id ? id : 'Intervención')
export const serviceModality = (id, services = DEFAULT_SERVICES) => findService(id, services)?.modality || 'proyecto'

// ---- dates as 'YYYY-MM-DD' strings (same convention as pago1/pago2) ----
const pad = (n) => String(n).padStart(2, '0')
export const todayISO = () => {
  const t = new Date()
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`
}
// Adds whole months keeping the anchor day (31 → 28 → 31).
export function addMonthsISO(iso, n, anchorDay) {
  const [y, m, d] = iso.split('-').map(Number)
  const total = m - 1 + n
  const ny = y + Math.floor(total / 12)
  const nm = ((total % 12) + 12) % 12
  const last = new Date(ny, nm + 1, 0).getDate()
  return `${ny}-${pad(nm + 1)}-${pad(Math.min(anchorDay || d, last))}`
}
export function daysUntilISO(iso) {
  if (!iso) return null
  return Math.round((new Date(`${iso}T00:00:00`) - new Date(`${todayISO()}T00:00:00`)) / 86400000)
}

// ---- contracts: base term + renewal options ----
// client.billing = { modality, amount, every, startDate, termMonths (contrato),
//   options: [{ id, label, months, amount, status: 'pendiente'|'ejercida'|'no_renovada' }],
//   nextDue, active }. Coverage ends (exclusive) at start + base term + the
// months of every option that was exercised.
export function coverageEnd(billing) {
  if (!billing || billing.modality !== 'contrato' || !billing.startDate) return null
  const extra = (billing.options || []).filter((o) => o.status === 'ejercida').reduce((sum, o) => sum + (Number(o.months) || 0), 0)
  return addMonthsISO(billing.startDate, (Number(billing.termMonths) || 0) + extra)
}
// The amount a cobro of `date` should carry: the base amount during the base
// term, then the amount of the renewal option that covers that date.
export function amountAt(billing, date) {
  const base = Number(billing?.amount) || 0
  if (!billing || billing.modality !== 'contrato') return base
  let end = addMonthsISO(billing.startDate, Number(billing.termMonths) || 0)
  if (date < end) return base
  for (const o of (billing.options || []).filter((x) => x.status === 'ejercida')) {
    end = addMonthsISO(end, Number(o.months) || 0)
    if (date < end) return Number(o.amount) || base
  }
  return base
}
export const RENEWAL_ALERT_DAYS = 90 // "un trimestre antes"
// Where a contract stands: when coverage ends, how many days are left, the
// next renewal option still open, and whether the renewal alert applies.
export function contractStatus(client) {
  const b = client?.billing
  if (!b || b.modality !== 'contrato' || client.completed || client.lost) return null
  const end = coverageEnd(b)
  const days = daysUntilISO(end)
  const nextOption = (b.options || []).find((o) => o.status === 'pendiente') || null
  return { end, days, nextOption, alert: days !== null && days <= RENEWAL_ALERT_DAYS }
}

// Every payment of a client, current and from archived cycles, with a stable
// key. Finanzas and the weekly summary read this so reopening a client for a
// new service never makes past income disappear. Includes the periodic
// `cobros` of contracts, subscriptions and one-off payments.
export function allPayments(client) {
  const out = []
  for (const key of ['pago1', 'pago2']) {
    if (client?.[key]) out.push({ key, payment: client[key], archived: false })
  }
  const cobroEntry = (c, prefix) => ({
    key: `${prefix}c-${c.id}`,
    label: c.label,
    payment: { status: c.status, amount: c.amount, date: c.status === 'Recibido' ? c.receivedAt || c.date : c.date },
    archived: Boolean(prefix),
  })
  for (const c of client?.cobros || []) out.push(cobroEntry(c, ''))
  ;(client?.serviceHistory || []).forEach((cycle, i) => {
    for (const key of ['pago1', 'pago2']) {
      if (cycle?.pagos?.[key]) out.push({ key: `h${i}-${key}`, baseKey: key, payment: cycle.pagos[key], archived: true })
    }
    for (const c of cycle?.cobros || []) out.push(cobroEntry(c, `h${i}-`))
  })
  return out
}

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

// The amount actually owed right now — only ever one payment is "next" at a
// time since pago2 stays locked until pago1 is Recibido (see PagosTab.jsx).
// Returns 0 for a client with nothing pending, never a negative or double count.
export function pendingPaymentAmount(client) {
  // Contracts / subscriptions / one-off payments bill through `cobros`.
  if (client?.billing) return (client.cobros || []).filter((c) => c.status === 'Pendiente').reduce((sum, c) => sum + (Number(c.amount) || 0), 0)
  const monto = client?.montoAcordado || 0
  if (client?.pago1?.status !== 'Recibido') return Math.round((monto * PAGO1_PERCENT) / 100)
  if (client?.pago2?.status !== 'Recibido') return Math.round((monto * PAGO2_PERCENT) / 100)
  return 0
}

// Real CRM-style funnel health, computed live from the actual client list —
// never a separately-tracked/manually-entered figure, same rule as every
// other cross-module number in this app. `conversionRate` only counts
// clients that reached a terminal state (became SP or were marked lost) —
// an SPC still mid-pipeline hasn't "failed" yet, so it's excluded rather
// than counted against the rate. `avgDaysInStage` is a live proxy (current
// stage age for still-active SPC), not a true historical average — this app
// doesn't keep a full stage-transition log, so it's the honest number
// available, not a fabricated more-precise one.
export function pipelineHealth(clients) {
  const spCount = clients.filter((c) => !c.lost && c.stage === 'intervencion_activa').length
  const lostClients = clients.filter((c) => c.lost)
  const terminal = spCount + lostClients.length
  const conversionRate = terminal ? Math.round((spCount / terminal) * 100) : null

  const activeSPC = clients.filter((c) => !c.lost && c.stage !== 'intervencion_activa')
  const stageDays = activeSPC.map((c) => daysSince(c.stageEnteredAt?.toDate?.())).filter((d) => d !== null)
  const avgDaysInStage = stageDays.length ? Math.round(stageDays.reduce((a, b) => a + b, 0) / stageDays.length) : null

  const lostByReason = new Map()
  for (const c of lostClients) {
    const reason = c.lostReason || 'Otro'
    lostByReason.set(reason, (lostByReason.get(reason) || 0) + 1)
  }
  const lostBreakdown = Array.from(lostByReason.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)

  return { conversionRate, avgDaysInStage, lostBreakdown, lostTotal: lostClients.length }
}
