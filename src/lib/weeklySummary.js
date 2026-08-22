import { currencyPEN } from './clientStages'
import { quarterOf } from './finance'

// Monday-Sunday, not a rolling 7 days — matches how the team actually
// thinks about "esta semana" (and how the Friday check-in / workload panel
// already frame it elsewhere in Objetivos/Workspace).
export function weekRange(date = new Date()) {
  const day = date.getDay() // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  start.setDate(date.getDate() + diffToMonday)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  const prevStart = new Date(start)
  prevStart.setDate(start.getDate() - 7)
  const prevEnd = new Date(start)
  prevEnd.setMilliseconds(-1)
  return { start, end, prevStart, prevEnd }
}

function inRange(date, start, end) {
  return date && date >= start && date <= end
}

// How far into the quarter we are, 0–100 — the reference line a KPI's own
// progress gets compared against to say "ahead" or "behind pace" instead of
// just reporting a bare percentage with no sense of whether it's good.
export function quarterElapsedPct(date = new Date()) {
  const q = quarterOf(date)
  const quarterStart = new Date(date.getFullYear(), (q - 1) * 3, 1)
  const quarterEnd = new Date(date.getFullYear(), q * 3, 0, 23, 59, 59)
  const total = quarterEnd - quarterStart
  const elapsed = date - quarterStart
  return Math.round((elapsed / total) * 100)
}

function pct(value, target) {
  if (!target) return 0
  return Math.round((value / target) * 100)
}

// Turns raw aggregates into a small set of concrete, named callouts instead
// of a wall of numbers — each one names the actual client/objetivo/person
// involved, not just a count, so reading it substitutes for actually
// opening every module.
export function buildWeeklyNarrative(data) {
  const {
    incomeThisWeek,
    incomeLastWeek,
    expensesThisWeek,
    tasksCompletedThisWeek,
    tasksOverdue,
    workload,
    objetivos,
    northStar,
    newClients,
    staleClients,
    paymentsReceivedThisWeek,
    pendingPaymentsThisWeek,
    birthdaysThisWeek,
  } = data

  const sections = { finanzas: [], objetivos: [], workspace: [], clientes: [] }
  const highlights = [] // ordered by urgency, feeds the one-line TL;DR

  // ---- Finanzas ----
  if (incomeThisWeek > 0 || incomeLastWeek > 0) {
    const delta = incomeLastWeek ? Math.round(((incomeThisWeek - incomeLastWeek) / incomeLastWeek) * 100) : null
    const trend = delta === null ? '' : delta >= 0 ? ` (+${delta}% vs. la semana pasada)` : ` (${delta}% vs. la semana pasada)`
    sections.finanzas.push(`Ingresos de la semana: ${currencyPEN.format(incomeThisWeek)}${trend}.`)
    if (delta !== null && delta <= -20) highlights.push({ level: 'warn', text: `los ingresos cayeron ${Math.abs(delta)}% esta semana` })
  } else {
    sections.finanzas.push('Sin ingresos registrados esta semana.')
  }
  if (expensesThisWeek > 0) sections.finanzas.push(`Gastos de la semana: ${currencyPEN.format(expensesThisWeek)}.`)
  if (paymentsReceivedThisWeek.length > 0) {
    sections.finanzas.push(
      `Pagos recibidos: ${paymentsReceivedThisWeek.map((p) => `${p.clientName} (${currencyPEN.format(p.amount)})`).join(', ')}.`
    )
  }
  if (pendingPaymentsThisWeek.length > 0) {
    sections.finanzas.push(
      `Cobros esperados esta semana: ${pendingPaymentsThisWeek.map((p) => `${p.clientName} (${currencyPEN.format(p.amount)})`).join(', ')}.`
    )
  }

  // ---- Objetivos ----
  const byConfidence = { rojo: [], amarillo: [], verde: [] }
  for (const o of objetivos) {
    if (o.confidence && byConfidence[o.confidence]) byConfidence[o.confidence].push(o)
  }
  if (objetivos.length === 0) {
    sections.objetivos.push('Sin objetivos definidos este trimestre todavía.')
  } else {
    if (byConfidence.rojo.length > 0) {
      sections.objetivos.push(`Bloqueados: ${byConfidence.rojo.map((o) => o.title).join(', ')}.`)
      highlights.push({ level: 'urgent', text: `${byConfidence.rojo.length === 1 ? byConfidence.rojo[0].title : `${byConfidence.rojo.length} objetivos`} ${byConfidence.rojo.length === 1 ? 'está bloqueado' : 'están bloqueados'}` })
    }
    if (byConfidence.amarillo.length > 0) {
      sections.objetivos.push(`En riesgo: ${byConfidence.amarillo.map((o) => o.title).join(', ')}.`)
      if (highlights.length === 0) highlights.push({ level: 'warn', text: `${byConfidence.amarillo.length === 1 ? byConfidence.amarillo[0].title : `${byConfidence.amarillo.length} objetivos`} ${byConfidence.amarillo.length === 1 ? 'está en riesgo' : 'están en riesgo'}` })
    }
    const noCheckin = objetivos.filter((o) => !o.confidence)
    if (noCheckin.length > 0) sections.objetivos.push(`Sin check-in esta semana: ${noCheckin.map((o) => o.title).join(', ')}.`)

    if (northStar && northStar.targetValue) {
      const goalPct = pct(northStar.currentValue, northStar.targetValue)
      const elapsedPct = quarterElapsedPct()
      const pace = goalPct >= elapsedPct - 5 ? 'al ritmo esperado o mejor' : 'por debajo del ritmo esperado'
      sections.objetivos.push(
        `Métrica Norte "${northStar.title}": ${goalPct}% de la meta, con ${elapsedPct}% del trimestre transcurrido — ${pace}.`
      )
      if (goalPct < elapsedPct - 15) highlights.push({ level: 'warn', text: `la Métrica Norte va por debajo del ritmo del trimestre` })
    }
  }

  // ---- Workspace ----
  sections.workspace.push(`${tasksCompletedThisWeek} tarea${tasksCompletedThisWeek === 1 ? '' : 's'} completada${tasksCompletedThisWeek === 1 ? '' : 's'} esta semana.`)
  if (tasksOverdue.length > 0) {
    sections.workspace.push(`Vencidas: ${tasksOverdue.slice(0, 5).map((t) => t.title).join(', ')}${tasksOverdue.length > 5 ? ` y ${tasksOverdue.length - 5} más` : ''}.`)
    highlights.push({ level: 'warn', text: `${tasksOverdue.length} tarea${tasksOverdue.length === 1 ? '' : 's'} vencida${tasksOverdue.length === 1 ? '' : 's'}` })
  }
  const overloaded = workload.filter((w) => w.dueThisWeekCount >= 5)
  if (overloaded.length > 0) {
    sections.workspace.push(`Carga alta: ${overloaded.map((w) => `${w.displayName.split(' ')[0]} (${w.dueThisWeekCount} tareas)`).join(', ')}.`)
    highlights.push({ level: 'warn', text: `${overloaded[0].displayName.split(' ')[0]} tiene ${overloaded[0].dueThisWeekCount} tareas esta semana` })
  }

  // ---- Clientes ----
  if (newClients.length > 0) sections.clientes.push(`Nuevos SPC esta semana: ${newClients.map((c) => c.name).join(', ')}.`)
  if (staleClients.length > 0) {
    sections.clientes.push(`Sin contacto hace +7 días: ${staleClients.map((c) => c.name).join(', ')}.`)
    highlights.push({ level: 'warn', text: `${staleClients.length} SPC${staleClients.length === 1 ? '' : 's'} sin contacto hace más de una semana` })
  }
  if (newClients.length === 0 && staleClients.length === 0) sections.clientes.push('Sin movimiento nuevo en el pipeline esta semana.')

  // ---- TL;DR: up to 2 signals, worst first, else a calm default ----
  const ordered = [...highlights.filter((h) => h.level === 'urgent'), ...highlights.filter((h) => h.level === 'warn')]
  const tldr =
    ordered.length === 0
      ? 'Semana tranquila — sin bloqueos ni vencidos pendientes.'
      : ordered.slice(0, 2).map((h) => h.text).join('; ') + '.'

  // Drives WeeklySummaryCard's hero color/glow on Home — so the one card
  // that actually synthesizes the week gets a visual weight matching its
  // importance, instead of reading as just another same-toned glass box.
  const level = highlights.some((h) => h.level === 'urgent') ? 'urgent' : highlights.some((h) => h.level === 'warn') ? 'warn' : 'calm'

  return { tldr: tldr.charAt(0).toUpperCase() + tldr.slice(1), level, sections, birthdaysThisWeek }
}

export function inWeek(date, range) {
  return inRange(date, range.start, range.end)
}
