// Seasonal/festive personalization — makes the app feel like it's tracking
// the calendar instead of being a static shell, without touching layout or
// the app's core color tokens. Hardcoded to Peru for now since all 3 founders
// are Peruvian; when that's no longer true, this is the place to key off a
// user/org region setting. Deliberately not wired to any external holidays
// API — a short, hand-maintained list, same "no dependency for something
// this small" pattern as the hand-drawn charts elsewhere.
//
// What a season drives: the greeting's subtext (Home) and a small badge next
// to the date that fades in and out (see useSeasonPulse). No background
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

// `always: true` = the day itself (Oct 31, Dec 24/25/31, Jan 1…): the glow
// stays on all day instead of pulsing. Other days it only pulses.
// Order = priority: the most specific day comes first. When several seasons
// are active at once (all of October), the pulse alternates between them.
const SEASONS = [
  {
    id: 'halloween',
    always: true,
    match: (d) => between(d, [10, 31], [10, 31]),
    badge: { emoji: '🎃', label: 'Halloween · Canción Criolla', color: '#F97316' },
    tint: '#F97316',
    motes: true,
    phrases: phrases(
      ['Hoy es Halloween y el Día de la Canción Criolla.', 'Feliz Día de la Canción Criolla.'],
      ['Halloween y Canción Criolla — una tarde con ritmo.', 'Hoy se mezclan el vals y los fantasmas.'],
      ['Feliz noche de Halloween.', 'Feliz noche de Canción Criolla.'],
    ),
  },
  {
    id: 'spooky',
    match: (d) => between(d, [10, 1], [10, 30]),
    badge: { emoji: '🎃', label: 'Spooky season', color: '#F97316' },
    tint: '#F97316',
    motes: true,
    phrases: phrases(
      ['Octubre, spooky season. Buen día para construir.', 'Spooky season — que la agenda no dé sustos.'],
      ['Spooky season — que ningún pendiente dé sustos.', 'Octubre avanza, sigamos con foco.'],
      ['Que la noche de spooky season sea tranquila.', 'Cerrando el día, sin sustos.'],
    ),
  },
  {
    id: 'mes-morado',
    match: (d) => between(d, [10, 1], [10, 31]),
    badge: { emoji: '💜', label: 'Mes morado · Señor de los Milagros', color: '#A78BFA' },
    tint: '#8B5CF6',
    motes: false,
    phrases: phrases(
      ['Octubre, mes morado — buen día para construir.', 'Mes del Señor de los Milagros.'],
      ['Mes morado — sigamos avanzando.', 'Octubre, con fe y con foco.'],
      ['Buen cierre de día en el mes morado.', 'Que tengas una noche tranquila en el mes morado.'],
    ),
  },
  {
    id: 'todos-los-santos',
    always: true,
    match: (d) => between(d, [11, 1], [11, 2]),
    badge: { emoji: '🕯️', label: 'Todos los Santos', color: '#D4D4D8' },
    tint: '#D4D4D8',
    motes: false,
    phrases: phrases(
      ['Hoy es un día de recuerdo y calma.', 'Todos los Santos — un día más tranquilo.'],
      ['Una tarde de recuerdo — con calma.', 'Todos los Santos — sin prisa.'],
      ['Que tengas una noche tranquila.', 'Buen cierre de día, con calma.'],
    ),
  },
  {
    id: 'fiestas-patrias-dia',
    always: true,
    match: (d) => between(d, [7, 28], [7, 29]),
    badge: { emoji: '🇵🇪', label: 'Fiestas Patrias', color: '#D91023' },
    tint: '#D91023',
    motes: true,
    phrases: phrases(
      ['Feliz Fiestas Patrias.', 'Hoy se celebra el Perú.'],
      ['Feliz Fiestas Patrias — ¡Viva el Perú!', 'Una tarde para celebrar el Perú.'],
      ['Feliz Fiestas Patrias.', 'Que tengas una buena noche patria.'],
    ),
  },
  {
    id: 'fiestas-patrias',
    match: (d) => between(d, [7, 1], [7, 31]),
    badge: { emoji: '🇵🇪', label: 'Mes Patrio', color: '#D91023' },
    tint: '#D91023',
    motes: false,
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
    badge: { emoji: '🌹', label: 'Santa Rosa de Lima', color: '#F472B6' },
    tint: '#F472B6',
    motes: false,
    phrases: phrases(
      ['Hoy es Santa Rosa de Lima.', 'Feliz día de Santa Rosa.'],
      ['Santa Rosa de Lima — una tarde tranquila.', 'Feliz Santa Rosa.'],
      ['Feliz noche de Santa Rosa.', 'Buen cierre de día.'],
    ),
  },
  {
    id: 'dia-de-la-madre',
    match: (d) => withinDaysOf(d, nthSunday(d.getFullYear(), 4, 2), 3),
    badge: { emoji: '💐', label: 'Día de la Madre', color: '#F472B6' },
    tint: '#F472B6',
    motes: false,
    phrases: phrases(
      ['Se acerca el Día de la Madre.', 'Feliz Día de la Madre a quien corresponda.'],
      ['Día de la Madre cerca — a no olvidarlo.', 'Una tarde para pensar en mamá.'],
      ['Y a llamar a mamá antes de dormir.', 'Feliz Día de la Madre.'],
    ),
  },
  {
    id: 'dia-del-padre',
    match: (d) => withinDaysOf(d, nthSunday(d.getFullYear(), 5, 3), 3),
    badge: { emoji: '👔', label: 'Día del Padre', color: '#60A5FA' },
    tint: '#60A5FA',
    motes: false,
    phrases: phrases(
      ['Se acerca el Día del Padre.', 'Feliz Día del Padre a quien corresponda.'],
      ['Día del Padre cerca — a no olvidarlo.', 'Una tarde para pensar en papá.'],
      ['Y a llamar a papá antes de dormir.', 'Feliz Día del Padre.'],
    ),
  },
  {
    id: 'navidad-anticipo',
    match: (d) => between(d, [12, 1], [12, 23]),
    badge: { emoji: '🎄', label: 'Diciembre', color: '#15803D' },
    tint: '#22C55E',
    motes: 'snow',
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
    badge: { emoji: '🎄', label: 'Nochebuena', color: '#15803D' },
    tint: '#22C55E',
    motes: 'snow',
    phrases: phrases(
      ['Nochebuena — buen día para cerrar temprano.', 'Hoy es Nochebuena.'],
      ['Nochebuena — casi hora de parar.', 'Hoy es un día para cerrar temprano.'],
      ['Feliz Nochebuena.', 'Que tengas una excelente Nochebuena.'],
    ),
  },
  {
    id: 'navidad',
    always: true,
    match: (d) => between(d, [12, 25], [12, 25]),
    badge: { emoji: '🎄', label: 'Navidad', color: '#15803D' },
    tint: '#22C55E',
    motes: 'snow',
    phrases: phrases(
      ['Feliz Navidad.', 'Hoy es Navidad — feliz día.'],
      ['Feliz Navidad.', 'Que tengas una linda Navidad.'],
      ['Feliz Navidad.', 'Que tengas una linda noche de Navidad.'],
    ),
  },
  {
    id: 'fin-de-ano-anticipo',
    match: (d) => between(d, [12, 26], [12, 30]),
    badge: { emoji: '🎇', label: 'Fin de Año', color: '#F59E0B' },
    tint: '#F59E0B',
    motes: true,
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
    badge: { emoji: '🎆', label: 'Fin de Año', color: '#F59E0B' },
    tint: '#F59E0B',
    motes: true,
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
    badge: { emoji: '🎉', label: 'Año Nuevo', color: '#1E5FAD' },
    tint: '#E8C15A',
    motes: true,
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

// One season for the day — stable within a day, rotates day to day when
// several overlap (October), so the greeting subtext doesn't flip on refresh.
export function getActiveSeason(date) {
  const list = getActiveSeasons(date)
  if (list.length === 0) return null
  return list[dayOfYear(date) % list.length]
}
