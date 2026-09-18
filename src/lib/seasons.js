// Seasonal/festive personalization for Home's greeting — makes the app feel
// like it's actually tracking the calendar instead of being a static shell,
// without touching layout or the app's core color tokens. Hardcoded to Peru
// for now since all 3 founders are Peruvian; when that's no longer true,
// this is the place to key off a user/org region setting instead of always
// returning the Peru calendar. Deliberately not wired to any external
// holidays API — this is a short, hand-maintained list, same "no dependency
// for something this small" pattern as the hand-drawn charts elsewhere.

function isBetween(date, [startMonth, startDay], [endMonth, endDay]) {
  const m = date.getMonth() + 1
  const d = date.getDate()
  const after = m > startMonth || (m === startMonth && d >= startDay)
  const before = m < endMonth || (m === endMonth && d <= endDay)
  return after && before
}

const SEASONS = [
  {
    id: 'fiestas-patrias',
    range: [[7, 1], [7, 31]],
    accentColor: '#D91023',
    phrases: {
      morning: ['Julio, mes patrio — buen día para construir país.', 'Feliz mes de la Patria.'],
      afternoon: ['Mes patrio — sigamos avanzando.', 'Julio, con el Perú de fondo.'],
      evening: ['Cerrando otro día de nuestro mes patrio.', 'Buen día para el Perú, buen día para ADOR.'],
    },
  },
  {
    id: 'navidad-anticipo',
    range: [[12, 1], [12, 23]],
    accentColor: '#B91C1C',
    phrases: {
      morning: ['Diciembre — cerrando el año con foco.', 'Recta final del año.'],
      afternoon: ['Diciembre avanza — sigamos ejecutando.', 'El año se cierra bien, con trabajo.'],
      evening: ['Otro día menos para cerrar el año.', 'Diciembre, cerrando fuerte.'],
    },
  },
  {
    id: 'nochebuena',
    range: [[12, 24], [12, 24]],
    accentColor: '#B91C1C',
    phrases: {
      morning: ['Nochebuena — buen día para cerrar temprano.', 'Hoy es Nochebuena.'],
      afternoon: ['Nochebuena — casi hora de parar.', 'Hoy es un día para cerrar temprano.'],
      evening: ['Feliz Nochebuena.', 'Que tengas una excelente Nochebuena.'],
    },
  },
  {
    id: 'navidad',
    range: [[12, 25], [12, 25]],
    accentColor: '#B91C1C',
    phrases: {
      morning: ['Feliz Navidad.', 'Hoy es Navidad — feliz día.'],
      afternoon: ['Feliz Navidad.', 'Que tengas una linda Navidad.'],
      evening: ['Feliz Navidad.', 'Cerrando un lindo día de Navidad.'],
    },
  },
  {
    id: 'fin-de-ano-anticipo',
    range: [[12, 26], [12, 30]],
    accentColor: '#B91C1C',
    phrases: {
      morning: ['Últimos días del año.', 'Cerrando el año — casi listos.'],
      afternoon: ['El año casi termina.', 'Últimos días — buen cierre.'],
      evening: ['Ya casi termina el año.', 'Cerrando otro día del año.'],
    },
  },
  {
    id: 'fin-de-ano',
    range: [[12, 31], [12, 31]],
    accentColor: '#B91C1C',
    phrases: {
      morning: ['Último día del año — buen cierre.', 'Hoy termina el año.'],
      afternoon: ['Último día del año.', 'Cerrando el año hoy.'],
      evening: ['Feliz fin de año.', 'Que termines bien el año.'],
    },
  },
  {
    id: 'ano-nuevo',
    range: [[1, 1], [1, 1]],
    accentColor: '#1E5FAD',
    phrases: {
      morning: ['Feliz año nuevo.', 'Empezamos el año.'],
      afternoon: ['Feliz año nuevo.', 'Primer día del año.'],
      evening: ['Feliz año nuevo.', 'Cerrando el primer día del año.'],
    },
  },
]

// Returns the active season for `date`, or null most of the year — most
// days have no season and the greeting stays exactly as it always has.
export function getActiveSeason(date) {
  return SEASONS.find((s) => isBetween(date, s.range[0], s.range[1])) || null
}
