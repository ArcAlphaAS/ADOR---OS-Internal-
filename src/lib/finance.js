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

export function monthLabel(monthKey) {
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(year, month - 1, 1)
  return date.toLocaleDateString('es', { month: 'short' }).replace('.', '')
}
