// Seasonal/festive personalization — makes the app feel like it's tracking
// the calendar instead of being a static shell, without touching layout or
// the app's core color tokens. Hardcoded to Peru for now since all 3 founders
// are Peruvian; when that's no longer true, this is the place to key off a
// user/org region setting. Deliberately not wired to any external holidays
// API — a short, hand-maintained list, same "no dependency for something
// this small" pattern as the hand-drawn charts elsewhere.
//
// What a season drives: the greeting's subtext (Home) and a small badge next
// to the date, always visible while the season lasts. No background
// lighting: a gradient wash was tried twice (a fixed one, then a pulsing edge
// glow with embers) and both were removed as looking bad.

function between(date, [startMonth, startDay], [endMonth, endDay]) {
  const m = date.getMonth() + 1
  const d = date.getDate()
  const after = m > startMonth || (m === startMonth && d >= startDay)
  const before = m < endMonth || (m === endMonth && d <= endDay)
  return after && before
}

// nth Sunday of a month (1-based n) — Día de la Madre / del Padre float.
function nthSunday(year, monthIndex, n) {
  const first = new Date(year, monthIndex, 1)
  const offset = (7 - first.getDay()) % 7
  return new Date(year, monthIndex, 1 + offset + (n - 1) * 7)
}

// True from `daysBefore` days ahead of the target day until the day itself.
function withinDaysOf(date, target, daysBefore) {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diff = Math.round((target - day) / 86400000)
  return diff >= 0 && diff <= daysBefore
}

const phrases = (morning, afternoon, evening) => ({ morning, afternoon, evening })

// `always: true` = the day itself (Oct 31, Dec 24/25/31, Jan 1…): only on
// those days does the greeting use the season's own phrases; longer seasons
// (all of October) only show the badge.
// Order = priority: the most specific day comes first. When several seasons
// are active at once (all of October), the pulse alternates between them.
const SEASONS = [
  {
    id: 'halloween',
    always: true,
    match: (d) => between(d, [10, 31], [10, 31]),
    badge: { label: 'Halloween · Canción Criolla', color: '#F97316' },
    tint: '#F97316',
    phrases: phrases(
      ['Hoy es Halloween y el Día de la Canción Criolla.', 'Feliz Halloween y feliz Día de la Canción Criolla.'],
      ['Halloween y Canción Criolla — una tarde con ritmo.', 'Hoy se mezclan el vals y los fantasmas.'],
      ['Que tengas una linda noche de Halloween y Canción Criolla.', 'Feliz noche de Halloween y de Canción Criolla.'],
    ),
  },
  {
    id: 'mes-morado',
    match: (d) => between(d, [10, 1], [10, 31]),
    badge: { label: 'Mes morado', color: '#A78BFA' },
    tint: '#8B5CF6',
    phrases: phrases(
      ['Octubre, mes morado — buen día para construir.', 'Mes del Señor de los Milagros.'],
      ['Mes morado — sigamos avanzando.', 'Octubre, con fe y con foco.'],
      ['Buen cierre de día en el mes morado.', 'Que tengas una noche tranquila en el mes morado.'],
    ),
  },
  {
    id: 'spooky',
    match: (d) => between(d, [10, 1], [10, 30]),
    badge: { label: 'Spooky season', color: '#F97316' },
    tint: '#F97316',
    phrases: phrases(
      ['Octubre, spooky season. Buen día para construir.', 'Spooky season — que la agenda no dé sustos.'],
      ['Spooky season — que ningún pendiente dé sustos.', 'Octubre avanza, sigamos con foco.'],
      ['Que la noche de spooky season sea tranquila.', 'Cerrando el día, sin sustos.'],
    ),
  },
  {
    id: 'fiestas-patrias-dia',
    always: true,
    match: (d) => between(d, [7, 28], [7, 29]),
    badge: { label: 'Fiestas Patrias', color: '#D91023' },
    tint: '#D91023',
    phrases: phrases(
      ['Feliz Fiestas Patrias.', 'Hoy se celebra el Perú.'],
      ['Feliz Fiestas Patrias — ¡Viva el Perú!', 'Una tarde para celebrar el Perú.'],
      ['Feliz Fiestas Patrias.', 'Que tengas una buena noche patria.'],
    ),
  },
  {
    id: 'fiestas-patrias',
    match: (d) => between(d, [7, 1], [7, 31]),
    badge: { label: 'Mes Patrio', color: '#D91023' },
    tint: '#D91023',
    phrases: phrases(
      ['Julio, mes patrio — buen día para construir país.', 'Feliz mes de la Patria.'],
      ['Mes patrio — sigamos avanzando.', 'Julio, con el Perú de fondo.'],
      ['Buen cierre de día en nuestro mes patrio.', 'Buen día para el Perú, buen día para ADOR.'],
    ),
  },
  {
    id: 'santa-rosa',
    always: true,
    match: (d) => between(d, [8, 30], [8, 30]),
    badge: { label: 'Santa Rosa de Lima', color: '#F472B6' },
    tint: '#F472B6',
    phrases: phrases(
      ['Hoy es Santa Rosa de Lima.', 'Feliz día de Santa Rosa.'],
      ['Santa Rosa de Lima — una tarde tranquila.', 'Feliz Santa Rosa.'],
      ['Feliz noche de Santa Rosa.', 'Buen cierre de día.'],
    ),
  },
  {
    id: 'dia-de-la-madre',
    match: (d) => withinDaysOf(d, nthSunday(d.getFullYear(), 4, 2), 3),
    badge: { label: 'Día de la Madre', color: '#F472B6' },
    tint: '#F472B6',
    phrases: phrases(
      ['Se acerca el Día de la Madre.', 'Feliz Día de la Madre a quien corresponda.'],
      ['Día de la Madre cerca — a no olvidarlo.', 'Una tarde para pensar en mamá.'],
      ['Y a llamar a mamá antes de dormir.', 'Feliz Día de la Madre.'],
    ),
  },
  {
    id: 'dia-del-padre',
    match: (d) => withinDaysOf(d, nthSunday(d.getFullYear(), 5, 3), 3),
    badge: { label: 'Día del Padre', color: '#60A5FA' },
    tint: '#60A5FA',
    phrases: phrases(
      ['Se acerca el Día del Padre.', 'Feliz Día del Padre a quien corresponda.'],
      ['Día del Padre cerca — a no olvidarlo.', 'Una tarde para pensar en papá.'],
      ['Y a llamar a papá antes de dormir.', 'Feliz Día del Padre.'],
    ),
  },
  {
    id: 'navidad-anticipo',
    match: (d) => between(d, [12, 1], [12, 23]),
    badge: { label: 'Diciembre', color: '#15803D' },
    tint: '#22C55E',
    phrases: phrases(
      ['Diciembre — cerrando el año con foco.', 'Recta final del año.'],
      ['Diciembre avanza — sigamos ejecutando.', 'El año se cierra bien, con trabajo.'],
      ['Otro día menos para cerrar el año.', 'Diciembre, cerrando fuerte.'],
    ),
  },
  {
    id: 'nochebuena',
    always: true,
    match: (d) => between(d, [12, 24], [12, 24]),
    badge: { label: 'Nochebuena', color: '#15803D' },
    tint: '#22C55E',
    phrases: phrases(
      ['Feliz Nochebuena.'],
      ['Feliz Nochebuena.'],
      ['Feliz Nochebuena. Que tengas una linda noche.'],
    ),
  },
  {
    id: 'navidad',
    always: true,
    match: (d) => between(d, [12, 25], [12, 25]),
    badge: { label: 'Navidad', color: '#15803D' },
    tint: '#22C55E',
    phrases: phrases(
      ['Feliz Navidad.'],
      ['Feliz Navidad.'],
      ['Feliz Navidad. Que tengas una linda noche.'],
    ),
  },
  {
    id: 'fin-de-ano-anticipo',
    match: (d) => between(d, [12, 26], [12, 30]),
    badge: { label: 'Fin de Año', color: '#F59E0B' },
    tint: '#F59E0B',
    phrases: phrases(
      ['Últimos días del año.', 'Cerrando el año — casi listos.'],
      ['El año casi termina.', 'Últimos días — buen cierre.'],
      ['Ya casi termina el año.', 'Cerrando otro día del año.'],
    ),
  },
  {
    id: 'fin-de-ano',
    always: true,
    match: (d) => between(d, [12, 31], [12, 31]),
    badge: { label: 'Fin de Año', color: '#F59E0B' },
    tint: '#F59E0B',
    phrases: phrases(
      ['Último día del año — buen cierre.', 'Hoy termina el año.'],
      ['Último día del año.', 'Cerrando el año hoy.'],
      ['Feliz fin de año.', 'Que termines bien el año.'],
    ),
  },
  {
    id: 'ano-nuevo',
    always: true,
    match: (d) => between(d, [1, 1], [1, 1]),
    badge: { label: 'Año Nuevo', color: '#1E5FAD' },
    tint: '#E8C15A',
    phrases: phrases(
      ['Feliz año nuevo.', 'Empezamos el año.'],
      ['Feliz año nuevo.', 'Primer día del año.'],
      ['Feliz año nuevo.', 'Que el año empiece tranquilo esta noche.'],
    ),
  },
]

function dayOfYear(date) {
  return Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000)
}

// Dev-only: `?season=<id>` forces a season so it can be previewed on any day.
function forcedSeasonId() {
  if (!import.meta.env.DEV || typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get('season')
}

// Every season active on `date`, most specific first. Usually empty.
export function getActiveSeasons(date) {
  const forced = forcedSeasonId()
  if (forced) return SEASONS.filter((s) => s.id === forced)
  return SEASONS.filter((s) => s.match(date))
}

// What the badge next to Home's date shows: every season active today, as one
// quiet pill — dots in each season's color + the names joined by " · ", e.g.
// "Mes morado · Spooky season" (Peru's October is both). Null most of the year.
export function seasonBadge(date) {
  const active = getActiveSeasons(date).filter((s) => s.badge)
  if (active.length === 0) return null
  return {
    label: active.map((s) => s.badge.label).join(' · '),
    colors: active.map((s) => s.tint),
  }
}
