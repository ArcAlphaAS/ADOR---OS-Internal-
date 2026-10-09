import { currencyPEN, daysSince } from './clientStages'
import { computeWorkload, isOverdue, isPendingFor } from './workspace'

// What needs a person's attention across the whole firm, ranked — the Inicio
// "Necesita tu atención" list. Everything is derived live from data the
// modules already hold (no stored flags). Each item says where to go:
// `target = [moduleId, focus]` goes straight to navigateTo().
const STALE_DAYS = 14

const first = (name) => (name || '').split(' ')[0] || 'Alguien'

export function buildAttention({ finance, clients, objetivos, tasks, users, uid }) {
  const items = []

  // Payments whose own date already passed.
  for (const p of finance.overduePayments || []) {
    const days = daysSince(new Date(`${p.date}T00:00:00`))
    items.push({
      id: `pay-${p.clientId}-${p.label}`,
      level: 'urgent',
      title: `${currencyPEN.format(p.amount)} por cobrar a ${p.clientName}`,
      detail: `Vencido hace ${days} ${days === 1 ? 'día' : 'días'} · ${p.label}`,
      target: ['clientes', { type: 'client', id: p.clientId }],
    })
  }

  // Cash runway.
  if (finance.runwayMonths != null && finance.runwayMonths < 3) {
    items.push({
      id: 'runway',
      level: finance.runwayMonths < 2 ? 'urgent' : 'warn',
      title: `Runway de ${finance.runwayMonths.toFixed(1)} meses`,
      detail: 'Es lo que alcanza la caja al ritmo actual de gasto',
      target: ['finanzas', null],
    })
  }

  // Objetivos reported blocked in their own check-in.
  for (const o of objetivos) {
    if (o.confidence !== 'rojo') continue
    items.push({
      id: `obj-${o.id}`,
      level: 'urgent',
      title: `“${o.title}” está bloqueado`,
      detail: o.blocker || 'Reportado en el último check-in',
      target: ['objetivos', null],
    })
  }

  // Prospects going cold.
  const stale = clients
    .filter((c) => c.stage !== 'intervencion_activa' && !c.lost)
    .map((c) => ({ c, days: daysSince(c.lastContactAt?.toDate?.() || c.createdAt?.toDate?.()) }))
    .filter(({ days }) => days !== null && days >= STALE_DAYS)
    .sort((a, b) => b.days - a.days)
  for (const { c, days } of stale) {
    items.push({
      id: `stale-${c.id}`,
      level: days >= 21 ? 'urgent' : 'warn',
      title: `${c.name} sin contacto hace ${days} días`,
      detail: 'Retómalo antes de que se enfríe',
      target: ['clientes', { type: 'client', id: c.id }],
    })
  }

  // Your own overdue tasks.
  const mineOverdue = tasks.filter((t) => (t.assignedTo || []).includes(uid) && !isPendingFor(t, uid) && isOverdue(t))
  if (mineOverdue.length > 0) {
    items.push({
      id: 'my-overdue',
      level: 'warn',
      title: `${mineOverdue.length} ${mineOverdue.length === 1 ? 'tarea vencida tuya' : 'tareas vencidas tuyas'}`,
      detail: mineOverdue[0].title,
      target: ['workspace', null],
    })
  }

  // Someone carrying too much this week.
  const overloaded = computeWorkload(tasks, users).find((w) => w.dueThisWeekCount >= 5)
  if (overloaded) {
    items.push({
      id: `load-${overloaded.userId}`,
      level: 'warn',
      title: `${first(overloaded.displayName)} tiene ${overloaded.dueThisWeekCount} tareas esta semana`,
      detail: 'Puede ser momento de repartir carga',
      target: ['workspace', null],
    })
  }

  return [...items.filter((i) => i.level === 'urgent'), ...items.filter((i) => i.level === 'warn')]
}
