// Finanzas module vocabulary + helpers. Categories are fixed (not user-defined)
// because with a 3-founder team the categories themselves are a known, small
// set — an open-ended category picker would just be another empty text field.
export const EXPENSE_CATEGORIES = [
  'Salarios',
  'Operaciones',
  'Herramientas',
  'Marketing',
  'Desplazamientos',
  'Otros',
]

export function quarterOf(date) {
  return Math.floor(date.getMonth() / 3) + 1
}

export function quarterKey(date = new Date()) {
  return `${date.getFullYear()}-Q${quarterOf(date)}`
}

export function quarterLabel(key) {
  const [year, q] = key.split('-Q')
  return `${q}T ${year}`
}

// `dateStr` is a plain 'YYYY-MM-DD' string, same convention as client
// payment dates (see CLAUDE.md §8) — no Firestore Timestamp parsing needed.
export function isInQuarter(dateStr, key) {
  if (!dateStr) return false
  const date = new Date(`${dateStr}T00:00:00`)
  return quarterKey(date) === key
}

export function daysLeftInQuarter(date = new Date()) {
  const q = quarterOf(date)
  const quarterEndMonth = q * 3 // 0-indexed month right after the quarter's last month
  const end = new Date(date.getFullYear(), quarterEndMonth, 0, 23, 59, 59)
  return Math.max(0, Math.ceil((end - date) / 86400000))
}

export function monthLabel(monthKey) {
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(year, month - 1, 1)
  return date.toLocaleDateString('es', { month: 'short' }).replace('.', '')
}

// ---- Gastos e ingresos recurrentes ----
// `financeRecurring/{id}` is a template (kind, amount, frequency, `nextDate`);
// `materializeFinanceRecurring` (lib/firestore.js) turns every occurrence that
// has come due into a normal expense/income entry and moves `nextDate`
// forward. `anchorDay` keeps "el 31" from drifting to the 28th after February.
export const RECURRING_FREQUENCIES = [
  { id: 'monthly', label: 'Cada mes', months: 1 },
  { id: 'quarterly', label: 'Cada trimestre', months: 3 },
  { id: 'yearly', label: 'Cada año', months: 12 },
]
export const frequencyLabel = (id) => RECURRING_FREQUENCIES.find((f) => f.id === id)?.label || id

export function advanceRecurringDate(dateStr, frequency, anchorDay) {
  const months = RECURRING_FREQUENCIES.find((f) => f.id === frequency)?.months || 1
  const [y, m, d] = dateStr.split('-').map(Number)
  const total = m - 1 + months
  const year = y + Math.floor(total / 12)
  const month = total % 12
  const day = Math.min(anchorDay || d, new Date(year, month + 1, 0).getDate())
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
