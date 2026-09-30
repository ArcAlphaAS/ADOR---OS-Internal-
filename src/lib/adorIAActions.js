// ADOR IA that acts, not just answers — still 100% local and rule-based (no
// Gemini, per the standing user preference, CLAUDE.md §17). `parseAction`
// recognizes a handful of commands in Spanish ("crea una tarea para Leo:
// revisar propuesta, viernes, alta"); the module then shows what it
// understood and only writes after the person presses Confirmar. Nothing is
// ever executed straight from a sentence.
//
//   crear tarea      → createTask (title, para quién, fecha, prioridad, proyecto)
//   completar tarea  → toggleTaskComplete
//   mover tarea      → applyTaskUpdate({ dueDate })
//   registrar decisión → createDecision
//
// Dates understood: hoy, mañana, pasado mañana, [el|este|próximo] lunes…
// domingo, "15 de octubre", "15/10", "el 15", "en 3 días", "en 2 semanas",
// "la próxima semana".

const norm = (s) => (s || '').normalize('NFC').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'] // Date#getDay order
const STOP = new Set(['la', 'el', 'los', 'las', 'de', 'del', 'que', 'para', 'como', 'hecha', 'hecho', 'completada', 'completado', 'lista', 'listo', 'terminada', 'terminado', 'una', 'un', 'tarea', 'a', 'al', 'en', 'por', 'y'])

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const addDays = (d, n) => {
  const x = startOfDay(d)
  x.setDate(x.getDate() + n)
  return x
}

// Cuts the first match of `re` (run on the accent-less copy) out of both the
// original and normalized strings so they stay aligned. Returns the match.
function cutFrom(state, re) {
  const m = re.exec(state.n)
  if (!m) return null
  state.n = state.n.slice(0, m.index) + ' ' + state.n.slice(m.index + m[0].length)
  state.o = state.o.slice(0, m.index) + ' ' + state.o.slice(m.index + m[0].length)
  return m
}

function parseDate(state, now = new Date()) {
  const today = startOfDay(now)
  let m
  if ((m = cutFrom(state, /\b(?:para\s+)?pasado\s+manana\b/))) return addDays(today, 2)
  if ((m = cutFrom(state, /\b(?:para\s+)?manana\b/))) return addDays(today, 1)
  if ((m = cutFrom(state, /\b(?:para\s+)?hoy\b/))) return today
  if ((m = cutFrom(state, /\b(?:para\s+)?(?:la\s+)?(?:proxima\s+semana|semana\s+que\s+viene)\b/))) {
    const d = addDays(today, 1)
    while (d.getDay() !== 1) d.setDate(d.getDate() + 1)
    return d
  }
  if ((m = cutFrom(state, /\ben\s+(\d{1,3})\s+dias?\b/))) return addDays(today, Number(m[1]))
  if ((m = cutFrom(state, /\ben\s+(\d{1,2})\s+semanas?\b/))) return addDays(today, Number(m[1]) * 7)
  if ((m = cutFrom(state, new RegExp(`\\b(?:para\\s+)?(?:el\\s+)?(?:este\\s+|proximo\\s+)?(${WEEKDAYS.filter(Boolean).join('|')})\\b`)))) {
    const target = WEEKDAYS.indexOf(m[1])
    const d = addDays(today, 1)
    while (d.getDay() !== target) d.setDate(d.getDate() + 1)
    return d
  }
  if ((m = cutFrom(state, new RegExp(`\\b(?:para\\s+)?(?:el\\s+)?(\\d{1,2})\\s+de\\s+(${MONTHS.join('|')})(?:\\s+de\\s+(\\d{4}))?\\b`)))) {
    const year = m[3] ? Number(m[3]) : today.getFullYear()
    let d = new Date(year, MONTHS.indexOf(m[2]), Number(m[1]))
    if (!m[3] && d < today) d = new Date(year + 1, MONTHS.indexOf(m[2]), Number(m[1]))
    return d
  }
  if ((m = cutFrom(state, /\b(?:para\s+)?(?:el\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/))) {
    let year = m[3] ? Number(m[3]) : today.getFullYear()
    if (year < 100) year += 2000
    let d = new Date(year, Number(m[2]) - 1, Number(m[1]))
    if (!m[3] && d < today) d = new Date(year + 1, Number(m[2]) - 1, Number(m[1]))
    return d
  }
  if ((m = cutFrom(state, /\b(?:para\s+)?el\s+(\d{1,2})\b(?!\s*(?:de|\/))/))) {
    let d = new Date(today.getFullYear(), today.getMonth(), Number(m[1]))
    if (d < today) d = new Date(today.getFullYear(), today.getMonth() + 1, Number(m[1]))
    return d
  }
  return null
}

function parsePriority(state) {
  const m = cutFrom(state, /(?:\bprioridad\s+(alta|media|baja)\b|\b(alta|baja|media)\s+prioridad\b|!(alta|media|baja)\b|\b(urgente)\b|,\s*(alta|media|baja)\s*(?:$|,))/)
  if (!m) return null
  const v = m[1] || m[2] || m[3] || (m[4] ? 'alta' : null) || m[5]
  return v
}

function firstNameOf(u) {
  return norm((u.displayName || u.email || '').split(/[\s@]/)[0])
}

function parseAssignee(state, users, actor) {
  const re = /(?:\bpara\s+|\basignad[ao]\s+a\s+|\basigna(?:la|lo)?\s+a\s+|@)([a-z]+)/g
  let m
  while ((m = re.exec(state.n))) {
    const token = m[1]
    let person = null
    if (token === 'mi') person = actor
    else person = users.find((u) => firstNameOf(u) === token) || (token.length >= 3 ? users.find((u) => firstNameOf(u).startsWith(token)) : null)
    if (person) {
      state.n = state.n.slice(0, m.index) + ' ' + state.n.slice(m.index + m[0].length)
      state.o = state.o.slice(0, m.index) + ' ' + state.o.slice(m.index + m[0].length)
      return person
    }
  }
  return null
}

function parseWorkstream(state, workstreams) {
  const sorted = [...workstreams].sort((a, b) => b.name.length - a.name.length)
  for (const w of sorted) {
    const name = norm(w.name).trim()
    if (name.length < 3) continue
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const m = cutFrom(state, new RegExp(`\\b(?:en|del|de)\\s+(?:el\\s+|la\\s+)?(?:proyecto\\s+|intervencion\\s+|cliente\\s+)?${esc}\\b`))
    if (m) return w
  }
  return null
}

const cleanTitle = (o) => {
  let t = o.replace(/(?:\s*,){2,}/g, ',').replace(/\s+/g, ' ').replace(/^[\s,:;.\-–—]+|[\s,:;.\-–—]+$/g, '')
  t = t.replace(/^(?:de|que|para|sobre|:)\s+/i, '').replace(/\s+(?:para|en|el|a|de)$/i, '').trim()
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : ''
}

function findTask(query, tasks) {
  const words = norm(query).split(/[^a-z0-9ñ]+/).filter((w) => w && !STOP.has(w))
  if (!words.length) return { none: true }
  const scored = tasks
    .map((t) => {
      const title = norm(t.title)
      const hits = words.filter((w) => title.includes(w)).length
      return { t, score: hits / words.length + (title.includes(words.join(' ')) ? 0.5 : 0) }
    })
    .filter((s) => s.score >= 0.6)
    .sort((a, b) => b.score - a.score)
  if (!scored.length) return { none: true }
  const top = scored[0].score
  const tied = scored.filter((s) => s.score === top)
  if (tied.length > 1) return { ambiguous: tied.slice(0, 3).map((s) => s.t.title) }
  return { task: scored[0].t }
}

// ctx: { tasks (open tasks), users, workstreams [{id,name}], actor {id, displayName} }
export function parseAction(text, ctx) {
  const state = { o: (text || '').normalize('NFC'), n: norm(text) }
  const t = state.n.trim()
  let m

  if ((m = /\b(?:registra|registrar|anota|anotar|guarda|guardar)\b.*\bdecision\b[:\-\s]*(.*)$/.exec(t))) {
    const idx = t.length - m[1].length
    const title = cleanTitle(state.o.slice(idx))
    if (!title) return { type: 'clarify', message: '¿Qué decisión registro? Dímela así: “registra la decisión: pausar el proyecto X”.' }
    return { type: 'decision', title }
  }

  if ((m = /^(?:completa|completar|termina|terminar|cierra|cerrar|marca|marcar)\b.*?\btarea\b(.*)$/.exec(t))) {
    const query = m[1].replace(/\bcomo\s+(?:hecha|completada|lista|terminada)\b/g, '')
    const found = findTask(query, ctx.tasks)
    if (found.task) return { type: 'completeTask', task: found.task }
    if (found.ambiguous) return { type: 'clarify', message: `Encontré varias parecidas: ${found.ambiguous.map((x) => `“${x}”`).join(', ')}. ¿Cuál de ellas?` }
    return { type: 'clarify', message: 'No encontré esa tarea entre las abiertas. Dime su nombre tal como aparece en Workspace.' }
  }

  if ((m = /^(?:mueve|mover|cambia|cambiar|pasa|pasar|reprograma|reprogramar|posterga|postergar|adelanta|adelantar)\b.*?\btarea\b(.*)$/.exec(t))) {
    const idx = t.length - m[1].length
    const rest = { o: state.o.slice(idx), n: m[1] }
    const date = parseDate(rest)
    if (!date) return { type: 'clarify', message: '¿Para cuándo la muevo? Por ejemplo: “mueve la tarea X para el viernes”.' }
    const found = findTask(rest.n.replace(/\b(?:para|a)\b/g, ' '), ctx.tasks)
    if (found.task) return { type: 'moveTask', task: found.task, dueDate: date }
    if (found.ambiguous) return { type: 'clarify', message: `Encontré varias parecidas: ${found.ambiguous.map((x) => `“${x}”`).join(', ')}. ¿Cuál de ellas?` }
    return { type: 'clarify', message: 'No encontré esa tarea entre las abiertas. Dime su nombre tal como aparece en Workspace.' }
  }

  if ((m = /^(?:crea|crear|agrega|agregar|anade|anadir|nueva|nuevo|anota|anotar|programa|programar|pon|poner)\b.*?\btarea\b(.*)$/.exec(t)) || (m = /^tarea\b[:\s](.*)$/.exec(t))) {
    const idx = t.length - m[1].length
    const rest = { o: state.o.slice(idx), n: m[1] }
    const priority = parsePriority(rest)
    const dueDate = parseDate(rest)
    const person = parseAssignee(rest, ctx.users, ctx.actor)
    const workstream = parseWorkstream(rest, ctx.workstreams)
    const title = cleanTitle(rest.o)
    if (!title) return { type: 'clarify', message: '¿Qué tarea creo? Por ejemplo: “crea una tarea para Leo: revisar la propuesta, viernes, alta”.' }
    return {
      type: 'createTask',
      title,
      priority: priority || 'media',
      dueDate,
      assignee: person || ctx.actor,
      assigneeGiven: Boolean(person),
      workstream: workstream || null,
    }
  }

  return null
}

const fmt = (d) => d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })

// The lines shown on the confirmation card (label → value).
export function describeAction(a, actorId) {
  if (a.type === 'createTask') {
    const rows = [
      ['Tarea', a.title],
      ['Para', a.assignee ? `${a.assignee.displayName || a.assignee.email}${a.assignee.id !== actorId ? ' (le pedirá confirmar)' : ''}` : 'ti'],
      ['Vence', a.dueDate ? fmt(a.dueDate) : 'sin fecha'],
      ['Prioridad', a.priority],
      ['Proyecto', a.workstream ? a.workstream.name : 'General'],
    ]
    return { heading: 'Voy a crear esta tarea', rows, cta: 'Crear tarea' }
  }
  if (a.type === 'completeTask') return { heading: 'Voy a marcar como completada', rows: [['Tarea', a.task.title]], cta: 'Marcar completada' }
  if (a.type === 'moveTask') return { heading: 'Voy a mover la fecha límite', rows: [['Tarea', a.task.title], ['Nueva fecha', fmt(a.dueDate)]], cta: 'Mover' }
  if (a.type === 'decision') return { heading: 'Voy a registrar esta decisión', rows: [['Decisión', a.title]], cta: 'Registrar' }
  return null
}
