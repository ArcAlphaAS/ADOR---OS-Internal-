// "Crear evento" escribiendo en lenguaje natural, en español, sin IA externa ni costo:
//   "Cena con Leo viernes 8pm por 2 horas"  ·  "Revisión QANLLA mañana 15:30 con meet"
// Devuelve lo entendido para abrir el formulario ya relleno — nunca crea nada solo.
const WEEKDAYS = { lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6, domingo: 0 }
const MONTHS = { enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5, julio: 6, agosto: 7, septiembre: 8, setiembre: 8, octubre: 9, noviembre: 10, diciembre: 11 }
const fold = (v) => v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function parseQuickEvent(input, now = new Date()) {
  let rest = ` ${input.trim()} `
  const take = (re) => {
    const m = rest.match(re)
    if (m) rest = rest.replace(re, ' ')
    return m
  }
  const folded = () => fold(rest)
  const cutFolded = (re) => {
    const f = folded()
    const m = f.match(re)
    if (!m) return null
    rest = rest.slice(0, m.index) + ' ' + rest.slice(m.index + m[0].length) // fold() conserva el largo en español
    return m
  }

  const emails = []
  rest = rest.replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, (m) => { emails.push(m); return ' ' })
  const meet = Boolean(cutFolded(/\b(con )?(meet|videollamada|google meet)\b/))

  // duración
  let durationMin = null
  let m = cutFolded(/\b(?:por|durante)?\s*(\d+(?:[.,]\d+)?)\s*(horas?|hrs?|h|minutos?|mins?|min)\b/)
  if (m) {
    const n = parseFloat(m[1].replace(',', '.'))
    durationMin = /^h/.test(m[2]) ? Math.round(n * 60) : Math.round(n)
  }

  // hora
  let hour = null, minute = 0
  m = cutFolded(/\b(?:a las?|a la)?\s*(\d{1,2})(?::|\.)(\d{2})\s*(am|pm|a\.m\.|p\.m\.)?/) || cutFolded(/\b(?:a las?|a la)?\s*(\d{1,2})\s*(am|pm|a\.m\.|p\.m\.)\b/) || cutFolded(/\ba las?\s*(\d{1,2})\b/)
  if (m) {
    hour = parseInt(m[1], 10)
    const ampm = (m[3] || m[2] || '').replace(/\./g, '')
    if (m[2] && /^\d{2}$/.test(m[2])) minute = parseInt(m[2], 10)
    if (ampm === 'pm' && hour < 12) hour += 12
    if (ampm === 'am' && hour === 12) hour = 0
    if (!ampm && hour >= 1 && hour <= 7) hour += 12 // "a las 3" casi siempre es la tarde
  }
  if (hour == null && cutFolded(/\bde la (tarde|noche)\b/)) hour = null

  // fecha
  let date = null
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (cutFolded(/\bpasado manana\b/)) { date = new Date(base); date.setDate(date.getDate() + 2) }
  else if (cutFolded(/\bmanana\b/)) { date = new Date(base); date.setDate(date.getDate() + 1) }
  else if (cutFolded(/\bhoy\b/)) date = new Date(base)
  if (!date) {
    m = cutFolded(/\b(?:el\s+)?(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b/)
    if (m) {
      date = new Date(base.getFullYear(), MONTHS[m[2]], parseInt(m[1], 10))
      if (date < base) date.setFullYear(date.getFullYear() + 1)
    }
  }
  if (!date) {
    m = cutFolded(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/)
    if (m) {
      const y = m[3] ? (m[3].length === 2 ? 2000 + parseInt(m[3], 10) : parseInt(m[3], 10)) : base.getFullYear()
      date = new Date(y, parseInt(m[2], 10) - 1, parseInt(m[1], 10))
      if (!m[3] && date < base) date.setFullYear(date.getFullYear() + 1)
    }
  }
  if (!date) {
    m = cutFolded(/\b(?:el\s+|este\s+|proximo\s+)?(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b/)
    if (m) {
      const target = WEEKDAYS[m[1]]
      date = new Date(base)
      const diff = (target - base.getDay() + 7) % 7 || 7
      date.setDate(date.getDate() + diff)
    }
  }
  if (!date && cutFolded(/\ben (\d+) dias?\b/) === null) date = null

  const title = rest.replace(/\b(el|para|a las?|a la|de la|de)\s*$/i, '').replace(/\s+/g, ' ').trim().replace(/^[-–:,]+|[-–:,]+$/g, '').trim()
  const when = date || base
  const start = new Date(when)
  start.setHours(hour ?? (date && date > base ? 9 : Math.min(now.getHours() + 1, 22)), hour != null ? minute : 0, 0, 0)
  const end = new Date(start.getTime() + (durationMin || 60) * 60000)
  return { title: title ? title.charAt(0).toUpperCase() + title.slice(1) : '', start, end, guests: emails, meet, understood: { date: Boolean(date), time: hour != null, duration: durationMin != null } }
}
