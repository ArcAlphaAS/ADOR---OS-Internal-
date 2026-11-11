// Period selector for Finanzas (mes / trimestre / año): everything is derived
// from the same movements list the rest of the module reads.
export const PERIODS = [
  { id: 'mes', label: 'Mes' },
  { id: 'trimestre', label: 'Trimestre' },
  { id: 'anio', label: 'Año' },
]

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function periodBounds(period, now = new Date()) {
  const y = now.getFullYear()
  const m = now.getMonth()
  if (period === 'anio') {
    return { start: `${y}-01-01`, end: `${y}-12-31`, prevStart: `${y - 1}-01-01`, prevEnd: `${y - 1}-12-31`, label: String(y), prevLabel: String(y - 1) }
  }
  if (period === 'trimestre') {
    const q = Math.floor(m / 3)
    const s = new Date(y, q * 3, 1)
    const e = new Date(y, q * 3 + 3, 0)
    const ps = new Date(y, q * 3 - 3, 1)
    const pe = new Date(y, q * 3, 0)
    return { start: iso(s), end: iso(e), prevStart: iso(ps), prevEnd: iso(pe), label: `T${q + 1} ${y}`, prevLabel: 'el trimestre anterior' }
  }
  const s = new Date(y, m, 1)
  const e = new Date(y, m + 1, 0)
  const ps = new Date(y, m - 1, 1)
  const pe = new Date(y, m, 0)
  const label = s.toLocaleDateString('es', { month: 'long', year: 'numeric' })
  return { start: iso(s), end: iso(e), prevStart: iso(ps), prevEnd: iso(pe), label: label.charAt(0).toUpperCase() + label.slice(1), prevLabel: 'el mes anterior' }
}

const inRange = (d, a, b) => d >= a && d <= b

export function periodStats(movements, period) {
  const b = periodBounds(period)
  const sum = (list, type) => list.filter((m) => m.type === type).reduce((s, m) => s + m.amount, 0)
  const cur = movements.filter((m) => inRange(m.date, b.start, b.end))
  const prev = movements.filter((m) => inRange(m.date, b.prevStart, b.prevEnd))
  const ingresos = sum(cur, 'ingreso')
  const gastos = sum(cur, 'gasto')
  const utilidad = ingresos - gastos
  const prevUtil = sum(prev, 'ingreso') - sum(prev, 'gasto')
  const resultDeltaPct = prevUtil ? ((utilidad - prevUtil) / Math.abs(prevUtil)) * 100 : null
  const categoryTotals = new Map()
  for (const m of cur) if (m.type === 'gasto') categoryTotals.set(m.category, (categoryTotals.get(m.category) || 0) + m.amount)
  return { bounds: b, ingresos, gastos, utilidad, resultDeltaPct, categoryTotals }
}

// Monthly series for the cash-flow chart: 6 months, or the 12 of the year.
export function monthlySeries(movements, period, now = new Date()) {
  const count = period === 'anio' ? 12 : 6
  const keys = []
  if (period === 'anio') for (let i = 0; i < 12; i++) keys.push(`${now.getFullYear()}-${String(i + 1).padStart(2, '0')}`)
  else for (let i = count - 1; i >= 0; i--) keys.push(iso(new Date(now.getFullYear(), now.getMonth() - i, 1)).slice(0, 7))
  return keys.map((k) => ({
    month: k,
    ingresos: movements.filter((m) => m.type === 'ingreso' && m.date.slice(0, 7) === k).reduce((s, m) => s + m.amount, 0),
    gastos: movements.filter((m) => m.type === 'gasto' && m.date.slice(0, 7) === k).reduce((s, m) => s + m.amount, 0),
  }))
}

// One plain sentence that answers "¿estamos bien?" from the live numbers.
export function verdictSentence(d) {
  const parts = []
  if (d.runwayMonths != null) parts.push(`Tienes ${d.runwayMonths.toFixed(1)} meses de margen con el gasto actual`)
  else parts.push('Registra tu caja para calcular cuánto margen tienes')
  if (d.overdueCount > 0) parts.push(`${d.overdueCount} cobro${d.overdueCount === 1 ? '' : 's'} vencido${d.overdueCount === 1 ? '' : 's'}`)
  else if (d.nextPayment?.date) {
    const dt = new Date(`${d.nextPayment.date}T00:00:00`)
    const days = Math.round((dt - new Date(new Date().toDateString())) / 86400000)
    const when = days <= 0 ? 'hoy' : days === 1 ? 'mañana' : days < 7 ? `el ${dt.toLocaleDateString('es', { weekday: 'long' })}` : `el ${dt.toLocaleDateString('es', { day: 'numeric', month: 'short' })}`
    parts.push(`el próximo cobro (${d.nextPayment.clientName}) llega ${when}`)
  } else if (d.porCobrarClientCount === 0 && d.runwayMonths != null) parts.push('no hay cobros pendientes')
  return `${parts.join('; ')}.`
}

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
export function movementsToCsv(list) {
  const rows = [['Fecha', 'Tipo', 'Descripción', 'Categoría', 'Cliente', 'Monto (S/)']]
  for (const m of list) rows.push([m.date, m.type === 'ingreso' ? 'Ingreso' : 'Gasto', m.type === 'ingreso' ? m.name : m.description, m.category || '', m.clientName || '', m.type === 'ingreso' ? m.amount : -m.amount])
  return '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\n')
}

export function downloadCsv(name, csv) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
