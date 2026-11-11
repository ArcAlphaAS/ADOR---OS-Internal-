// Directorio vocabulary and pure helpers — mirrors the STATUSES/PRIORITIES
// pattern already established in lib/workspace.js (a fixed small palette,
// `xMeta(id)` lookups with a safe default).

export const STATUSES = [
  { id: 'disponible', label: 'Disponible', color: '#4CAF50' },
  { id: 'en_reunion', label: 'En reunión', color: '#FFC107' },
  { id: 'fuera_oficina', label: 'Fuera de oficina', color: '#888888' },
  { id: 'remoto', label: 'Remoto', color: '#1E5FAD' },
]
const STATUS_BY_ID = Object.fromEntries(STATUSES.map((s) => [s.id, s]))
export function statusMeta(id) {
  return STATUS_BY_ID[id] || STATUS_BY_ID.disponible
}

// Groups non-leadership people by their free-text `area` (same "don't force
// a fixed department taxonomy on a small team" rule already used for
// Objetivos' "Foco de Impacto", CLAUDE.md §12) — whatever string someone
// typed becomes a real group, defaulting to "General" when unset.
export function groupByArea(people) {
  const groups = new Map()
  for (const person of people) {
    const key = person.area?.trim() || 'General'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(person)
  }
  return Array.from(groups.entries()).map(([area, members]) => ({ area, members }))
}

// Live-derived counts for the sidebar's "Áreas" list — Dirección is its own
// implicit "area" (anyone flagged isDirectivo), never a real `area` string,
// so it's counted separately rather than mixed into groupByArea's groups.
export function areaCounts(people) {
  const directivos = people.filter((p) => p.isDirectivo)
  const rest = people.filter((p) => !p.isDirectivo)
  const groups = groupByArea(rest).map(({ area, members }) => ({ area, count: members.length }))
  const result = groups.sort((a, b) => b.count - a.count)
  if (directivos.length) result.unshift({ area: 'Dirección', count: directivos.length })
  return result
}

// Only administrators can manage the Directorio (create/edit/delete people
// and teams, decide who's "Dirección") — direct user request: not just
// anyone with an ADOR OS login should be able to self-declare a title.
// Delegates to the shared lib/permissions.js check (also used by
// Conocimiento) — kept as its own export here so existing call sites don't
// need to change import paths.
export { isAdmin as isDirectorioAdmin } from './permissions'

// ---- Fichas incompletas, fechas que celebrar y línea de reporte ----

// Lo mínimo para que una ficha sirva: foto, área y correo.
export function missingFields(p) {
  const out = []
  if (!p.photoDataUrl) out.push('foto')
  if (!p.area && !p.isDirectivo) out.push('área')
  if (!p.email) out.push('correo')
  return out
}

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

// Próxima vez que cae un 'YYYY-MM-DD' (mes y día) desde hoy: { date, days, years }.
export function nextOccurrence(iso, today = new Date()) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return null
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  const t0 = startOfDay(today)
  let next = new Date(t0.getFullYear(), m - 1, d)
  if (next < t0) next = new Date(t0.getFullYear() + 1, m - 1, d)
  return { date: next, days: Math.round((next - t0) / 86400000), years: next.getFullYear() - y }
}

export function dayMonthLabel(date) {
  return `${date.getDate()} de ${MONTHS[date.getMonth()]}`
}

// Cumpleaños (de su cuenta) y aniversarios (fecha de ingreso) de los próximos `within` días.
export function upcomingDates(people, within = 30, today = new Date()) {
  const out = []
  for (const p of people) {
    const b = nextOccurrence(p.birthday, today)
    if (b && b.days <= within) out.push({ person: p, kind: 'cumpleaños', ...b })
    const a = nextOccurrence(p.startDate, today)
    if (a && a.years >= 1 && a.days <= within) out.push({ person: p, kind: 'aniversario', ...a })
  }
  return out.sort((x, y) => x.days - y.days)
}

export function tenureLabel(startDate, today = new Date()) {
  if (!startDate || !/^\d{4}-\d{2}-\d{2}/.test(startDate)) return null
  const [y, m] = startDate.slice(0, 10).split('-').map(Number)
  const months = (today.getFullYear() - y) * 12 + (today.getMonth() + 1 - m)
  if (months < 1) return 'se unió este mes'
  if (months < 12) return `${months} ${months === 1 ? 'mes' : 'meses'} en ADOR`
  const yrs = Math.floor(months / 12)
  return `${yrs} ${yrs === 1 ? 'año' : 'años'} en ADOR`
}

// Árbol de "reporta a". Raíces = quien no reporta a nadie (válido). Sin ningún dato de
// reporte devuelve null y el organigrama usa su agrupación por área de siempre.
export function buildReportTree(people) {
  const ids = new Set(people.map((p) => p.id))
  if (!people.some((p) => p.reportsTo && ids.has(p.reportsTo))) return null
  const kids = new Map()
  for (const p of people) {
    const parent = p.reportsTo && ids.has(p.reportsTo) && p.reportsTo !== p.id ? p.reportsTo : null
    if (parent) kids.set(parent, [...(kids.get(parent) || []), p])
  }
  const roots = people.filter((p) => !(p.reportsTo && ids.has(p.reportsTo) && p.reportsTo !== p.id))
  const withTeam = roots.filter((p) => (kids.get(p.id) || []).length > 0 || p.isDirectivo)
  const loose = roots.filter((p) => !withTeam.includes(p))
  return { kids, roots: withTeam, loose }
}
