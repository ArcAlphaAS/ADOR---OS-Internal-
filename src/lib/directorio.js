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
// Fails open on a missing `isAdmin` field (undefined, not `false`) so the 3
// founders — whose profiles predate this field — are admins with no manual
// Firestore bootstrap step. Only an explicit `isAdmin: false`, set by hand
// in the console the same way `allowedEmails` already is, opts someone out.
export function isDirectorioAdmin(profile) {
  return profile?.isAdmin !== false
}
