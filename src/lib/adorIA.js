import { currencyPEN } from './clientStages'
import { quarterLabel, daysLeftInQuarter } from './finance'
import { quarterElapsedPct } from './weeklySummary'

// A trusted, dry-witted digital chief of staff for ADOR — not a generic
// chatbot persona. Explicitly instructed to only speak from the data block
// it's given (never invent numbers) and to say so plainly when something
// isn't in scope, since a confidently wrong number from an "assistant" is
// worse than no answer at all for a firm handling client-sensitive data.
export const ADOR_IA_SYSTEM_PROMPT = `Eres ADOR IA, el asistente interno de ADOR — una firma de inteligencia estratégica de 3 fundadores. Tu tono es el de un jefe de gabinete de máxima confianza: formal pero cálido, directo, con un toque de humor seco cuando corresponde. Nunca eres efusivo ni genérico.

Reglas estrictas:
- Solo puedes hablar de cifras y estados que aparezcan explícitamente en el bloque "ESTADO ACTUAL DE ADOR" que se te entrega en cada mensaje. Nunca inventes ni estimes un número que no esté ahí.
- Si te preguntan algo que no está en los datos entregados, dilo con claridad ("no tengo ese dato a la mano") en vez de improvisar.
- Respondes siempre en español, de forma concisa — sin relleno, sin listas eternas salvo que el usuario las pida.
- Puedes dar tu opinión o señalar riesgos ("noto que..."), pero siempre anclado a los datos reales, no a supuestos.`

function formatObjetivo(o) {
  const confidence = { verde: 'en camino', amarillo: 'en riesgo', rojo: 'bloqueado' }[o.confidence] || 'sin check-in'
  if (o.type === 'milestone') return `- ${o.title} (hito, ${o.completed ? 'completado' : 'pendiente'}, ${confidence})`
  const progress = o.targetValue ? `${Math.round((o.currentValue / o.targetValue) * 100)}%` : '—'
  return `- ${o.title}${o.isNorthStar ? ' [★ Métrica Norte]' : ''} (${progress} de la meta, ${confidence})`
}

// Compact, labeled plain text — not JSON — since it reads as naturally as
// the rest of the prompt and keeps token usage low against the free tier's
// daily quota. Reuses the exact same live data every other module already
// computes (Finanzas' hook, Objetivos' hook, Workspace's helpers) — this
// context builder does no independent data-fetching of its own.
export function buildAdorIAContext({ finance, objetivos, quarterKey, tasksOverdueCount, tasksOpenCount, workload, clientsPipeline, clientsActive, staleClients }) {
  const lines = []
  lines.push(`Fecha: ${new Date().toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}`)
  lines.push('')
  lines.push('FINANZAS')
  lines.push(`- Ingresos del mes: ${currencyPEN.format(finance.ingresosDelMes)}`)
  lines.push(`- Gastos del mes: ${currencyPEN.format(finance.gastosDelMes)}`)
  lines.push(`- Utilidad neta del mes: ${currencyPEN.format(finance.utilidadNeta)}`)
  lines.push(`- Recaudado en ${quarterLabel(quarterKey)}: ${currencyPEN.format(finance.recaudadoTrimestre)} de meta ${currencyPEN.format(finance.quarterlyTarget || 0)}`)
  if (finance.cashBalance) {
    lines.push(`- Caja actual: ${currencyPEN.format(finance.cashBalance)}`)
    lines.push(`- Proyección de caja a 30 días: ${currencyPEN.format(finance.projectedIn30)}`)
  }
  if (finance.nextPayment) {
    lines.push(`- Próximo cobro esperado: ${finance.nextPayment.clientName} — ${currencyPEN.format(finance.nextPayment.amount)}`)
  }

  lines.push('')
  lines.push(`OBJETIVOS (${quarterLabel(quarterKey)}, quedan ${daysLeftInQuarter()} días del trimestre)`)
  if (objetivos.length === 0) {
    lines.push('- Sin objetivos definidos este trimestre.')
  } else {
    objetivos.forEach((o) => lines.push(formatObjetivo(o)))
  }

  lines.push('')
  lines.push('WORKSPACE')
  lines.push(`- ${tasksOpenCount} tareas abiertas, ${tasksOverdueCount} vencidas`)
  if (workload.length > 0) {
    lines.push(`- Carga por persona: ${workload.map((w) => `${w.displayName} (${w.openCount} abiertas)`).join(', ')}`)
  }

  lines.push('')
  lines.push('CLIENTES')
  lines.push(`- ${clientsPipeline} SPC en pipeline, ${clientsActive} SP activos`)
  if (staleClients.length > 0) {
    lines.push(`- Sin contacto hace +7 días: ${staleClients.map((c) => c.name).join(', ')}`)
  }

  return lines.join('\n')
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function firstOnly(name) {
  return (name || '').split(' ')[0]
}

// Cross-references the same live data every module already reads into a
// short list of *named, ranked* signals — the building block both the
// "priority" question and the risk asides in every other answer draw from.
// Deliberately the same shape/thresholds as lib/weeklySummary.js's
// highlights (blocked objetivo > North Star off-pace > overload > overdue >
// stale client) so ADOR IA never disagrees with the Resumen Semanal card
// about what actually matters right now.
function computeSignals(data) {
  const { finance, objetivos, workload, tasksOverdueCount, staleClients, quarterKey } = data
  const signals = []

  const blocked = objetivos.filter((o) => o.confidence === 'rojo')
  if (blocked.length > 0) {
    signals.push({
      level: 'urgent',
      topic: 'objetivos',
      text: `${blocked.map((o) => `"${o.title}"`).join(' y ')} ${blocked.length > 1 ? 'están bloqueados' : 'está bloqueado'}`,
      reason: 'un objetivo marcado en rojo significa que su propio dueño reportó un bloqueo en el último check-in — no es una lectura mía, es lo que ustedes mismos registraron.',
    })
  }

  const northStar = objetivos.find((o) => o.isNorthStar)
  if (northStar && northStar.targetValue) {
    const goalPct = Math.round((northStar.currentValue / northStar.targetValue) * 100)
    const elapsedPct = quarterElapsedPct()
    if (goalPct < elapsedPct - 15) {
      signals.push({
        level: 'warn',
        topic: 'objetivos',
        text: `la Métrica Norte "${northStar.title}" va al ${goalPct}% con ${elapsedPct}% del trimestre ya consumido — por debajo del ritmo que tocaría`,
        reason: `si el trimestre ya lleva ${elapsedPct}% transcurrido, lo esperable es que la meta ronde ese mismo porcentaje. Un margen de más de 15 puntos por debajo no es ruido, es una tendencia.`,
      })
    }
  }

  const overloaded = [...workload].sort((a, b) => b.dueThisWeekCount - a.dueThisWeekCount).filter((w) => w.dueThisWeekCount >= 5)
  if (overloaded.length > 0) {
    signals.push({
      level: 'warn',
      topic: 'workspace',
      text: `${firstOnly(overloaded[0].displayName)} tiene ${overloaded[0].dueThisWeekCount} tareas para esta semana`,
      reason: 'cinco o más tareas con vencimiento en la misma semana suele ser el punto donde algo empieza a atrasarse sin que nadie lo note a tiempo.',
    })
  }

  if (tasksOverdueCount > 0) {
    signals.push({
      level: 'warn',
      topic: 'workspace',
      text: `hay ${tasksOverdueCount} tarea${tasksOverdueCount === 1 ? '' : 's'} vencida${tasksOverdueCount === 1 ? '' : 's'} en Workspace`,
      reason: 'una tarea vencida no desaparece sola, y cada día que pasa hace más probable que termine olvidada del todo.',
    })
  }

  if (staleClients.length > 0) {
    signals.push({
      level: 'warn',
      topic: 'clientes',
      text: `${staleClients.map((c) => c.name).join(', ')} ${staleClients.length > 1 ? 'no tienen' : 'no tiene'} contacto hace más de una semana`,
      reason: 'una semana sin contacto con un SPC activo es tiempo suficiente para que la relación empiece a enfriarse, sobre todo en etapa de pipeline.',
    })
  }

  if (finance.cashBalance && finance.projectedIn30 != null && finance.projectedIn30 < finance.cashBalance * 0.3) {
    signals.push({
      level: 'urgent',
      topic: 'finanzas',
      text: `la proyección de caja a 30 días (${currencyPEN.format(finance.projectedIn30)}) queda bastante por debajo de la caja actual`,
      reason: 'una caída proyectada de más del 70% en 30 días vale la pena mirarla de cerca antes de comprometer nuevos gastos.',
    })
  }

  return [...signals.filter((s) => s.level === 'urgent'), ...signals.filter((s) => s.level === 'warn')]
}

const hasAny = (q, ...words) => words.some((w) => q.includes(w))

// A short/pronoun-only follow-up ("¿por qué?", "y eso?", "explícamelo",
// "profundiza") has no topic keywords of its own — without this check it
// would fall straight into the generic fallback, breaking the "conversation"
// illusion the moment someone asks a natural second question instead of a
// fresh one. detectFollowUp() lets answerLocally() reuse the previous turn's
// topic instead of treating every message as isolated.
const FOLLOWUP_MARKERS = ['por qué', 'porque', 'y eso', 'y el', 'y la', 'explica', 'explíca', 'detalla', 'más detalle', 'mas detalle', 'cuál', 'cual', 'profundiza', 'amplía', 'amplia', 'y por']
function isFollowUp(q) {
  return FOLLOWUP_MARKERS.some((m) => q.includes(m)) || q.trim().split(/\s+/).length <= 3
}

// Pure classification — no text generation here — so the same detection
// logic decides both "does this message start a new topic" and "what topic
// should a follow-up resolve against."
function detectTopic(q) {
  if (hasAny(q, 'hola', 'buenas', 'qué tal', 'que tal') && q.length < 25) return 'saludo'
  if (hasAny(q, 'gracias')) return 'gracias'
  if (hasAny(q, 'cómo estamos', 'como estamos', 'cómo vamos', 'como vamos', 'todo bien', 'estado general', 'panorama', 'resumen')) return 'overview'
  if (hasAny(q, 'qué debería', 'que deberia', 'que debería', 'prioridad', 'en qué me enfoco', 'en que me enfoco', 'qué hago', 'que hago', 'qué es urgente', 'que es urgente', 'qué me preocupa', 'que me preocupa')) return 'priority'
  if (hasAny(q, 'ingreso', 'factur', 'plata', 'dinero', 'recaud', 'caja', 'runway')) return 'finanzas'
  if (hasAny(q, 'objetivo', 'meta', 'norte', 'trimestre', 'okr')) return 'objetivos'
  if (hasAny(q, 'carga', 'equipo', 'quien tiene', 'quién tiene', 'sobrecarga', 'asociado', 'tarea', 'vencid', 'pendiente')) return 'workspace'
  if (hasAny(q, 'cliente', 'spc', 'sp activo', 'contacto', 'pipeline')) return 'clientes'
  return null
}

// Builds the reply for a given topic. `followUp` reframes the opening line
// as a continuation ("Sobre eso mismo...") instead of a fresh answer, and —
// when the raw question asked "por qué" — appends the reasoning behind the
// top relevant signal instead of just repeating the same facts verbatim.
function buildAnswer(topic, { data, name, address, signals, followUp, wantsWhy }) {
  const { finance, objetivos, quarterKey, tasksOpenCount, tasksOverdueCount, workload, clientsPipeline, clientsActive, staleClients } = data

  if (topic === 'saludo') {
    return pick([
      `Buenas${address}. Dígame por dónde quiere empezar — finanzas, objetivos, el equipo o clientes — y le doy el panorama real.`,
      `A su servicio${address}. Puedo hablarle de ingresos, objetivos del trimestre, carga del equipo o el pipeline de clientes.`,
    ])
  }

  if (topic === 'gracias') {
    return pick(['Para eso estoy.', 'Un placer, como siempre.', 'Cuando guste.'])
  }

  const whyFor = (topicFilter) => {
    const s = signals.find((sig) => !topicFilter || sig.topic === topicFilter)
    return s ? `${pick(['Por lo siguiente', 'La razón es esta'])}: ${s.reason}` : 'No hay una señal concreta detrás de eso — es simplemente el estado normal de los datos.'
  }

  if (topic === 'overview') {
    if (followUp && wantsWhy) return whyFor(null)
    const lines = [followUp ? pick(['Sobre eso mismo:', 'Retomando:']) : pick(['Un vistazo rápido:', 'Permítame resumirlo:', 'En limpio:'])]
    lines.push(`Ingresos del mes: ${currencyPEN.format(finance.ingresosDelMes)}. ${objetivos.length} objetivo${objetivos.length === 1 ? '' : 's'} en marcha este trimestre. ${tasksOpenCount} tareas abiertas (${tasksOverdueCount} vencidas). ${clientsPipeline} SPC en pipeline, ${clientsActive} SP activos.`)
    if (signals.length > 0) {
      lines.push('', `${pick(['Lo que sí merece su atención:', 'Dos cosas antes de seguir:'])} ${signals.slice(0, 2).map((s) => s.text).join('; ')}.`)
    } else {
      lines.push('', pick(['Nada bloqueado, nada vencido sin más de una semana de retraso — un buen día, me atrevería a decir.', 'El panorama está limpio. Aprovéchelo.']))
    }
    return lines.join('\n')
  }

  if (topic === 'priority') {
    if (followUp && wantsWhy) return whyFor(null)
    if (signals.length === 0) return pick([`No hay nada urgente pidiendo su atención${address} — buen momento para avanzar en lo que ya tenía planeado.`, 'El tablero está despejado. Yo aprovecharía para adelantar objetivos, no para apagar incendios.'])
    const top = signals.slice(0, 2)
    return [
      followUp ? pick(['Retomando lo anterior:', 'Como le decía:']) : `${pick(['Si tuviera que elegir', 'En su lugar, empezaría por aquí'])}${address}:`,
      ...top.map((s, i) => `${i + 1}. ${s.text.charAt(0).toUpperCase() + s.text.slice(1)}.`),
      signals.length > top.length ? `\nHay algo más de fondo, pero eso puede esperar un día.` : '',
    ].filter(Boolean).join('\n')
  }

  if (topic === 'finanzas') {
    if (followUp && wantsWhy) return whyFor('finanzas')
    const lines = [
      followUp ? pick(['Con más detalle:', 'Para ampliar:']) : null,
      `Este mes: ${currencyPEN.format(finance.ingresosDelMes)} en ingresos, ${currencyPEN.format(finance.gastosDelMes)} en gastos, utilidad neta ${currencyPEN.format(finance.utilidadNeta)}.`,
      `Recaudado en ${quarterLabel(quarterKey)}: ${currencyPEN.format(finance.recaudadoTrimestre)} de una meta de ${currencyPEN.format(finance.quarterlyTarget || 0)}.`,
    ].filter(Boolean)
    if (finance.nextPayment) lines.push(`Próximo cobro esperado: ${finance.nextPayment.clientName} por ${currencyPEN.format(finance.nextPayment.amount)}.`)
    if (finance.cashBalance) lines.push(`Caja actual: ${currencyPEN.format(finance.cashBalance)}, proyectada a 30 días en ${currencyPEN.format(finance.projectedIn30)}.`)
    const financeSignal = signals.find((s) => s.topic === 'finanzas')
    lines.push('', financeSignal ? `${pick(['Un detalle a vigilar', 'Vale la pena notar'])}: ${financeSignal.text}.` : pick(['Nada preocupante en este frente.', 'Sin sobresaltos aquí.']))
    return lines.join('\n')
  }

  if (topic === 'objetivos') {
    if (followUp && wantsWhy) return whyFor('objetivos')
    if (objetivos.length === 0) {
      return followUp
        ? 'Como le comentaba: sigue sin haber objetivos definidos este trimestre. Ese es todo el detalle que hay por ahora.'
        : `No hay objetivos definidos todavía para ${quarterLabel(quarterKey)}. Quedan ${daysLeftInQuarter()} días de trimestre — yo empezaría por definir al menos la Métrica Norte.`
    }
    const lines = [followUp ? pick(['Mirándolo con más calma:', 'Para ampliar:']) : `Objetivos de ${quarterLabel(quarterKey)} (quedan ${daysLeftInQuarter()} días):`, ...objetivos.map(formatObjetivo)]
    const objSignal = signals.find((s) => s.topic === 'objetivos')
    lines.push('', objSignal ? `${pick(['Lo que destacaría', 'Dicho con franqueza'])}: ${objSignal.text}.` : pick(['Todos avanzando sin bandera roja.', 'Sin bloqueos que reportar por aquí.']))
    return lines.join('\n')
  }

  if (topic === 'workspace') {
    if (followUp && wantsWhy) return whyFor('workspace')
    const lines = [followUp ? pick(['Desglosando:', 'Con más detalle:']) : null]
    if (workload.length > 0) {
      const sorted = [...workload].sort((a, b) => b.openCount - a.openCount)
      lines.push(...sorted.map((w) => `- ${w.displayName}: ${w.openCount} tareas abiertas (${w.dueThisWeekCount} esta semana)`))
    }
    lines.push(`\n${tasksOpenCount} tareas abiertas en total, ${tasksOverdueCount} vencidas.`)
    const wsSignal = signals.find((s) => s.topic === 'workspace')
    if (wsSignal) lines.push(`${pick(['Le señalo', 'Vale la pena revisar'])}: ${wsSignal.text}.`)
    return lines.filter(Boolean).join('\n')
  }

  if (topic === 'clientes') {
    if (followUp && wantsWhy) return whyFor('clientes')
    const lines = [followUp ? pick(['Ampliando:', 'Con más detalle:']) : `${clientsPipeline} SPC en pipeline, ${clientsActive} SP activos con intervención en curso.`]
    lines.push(staleClients.length > 0 ? `Sin contacto hace más de 7 días: ${staleClients.map((c) => c.name).join(', ')}.` : 'Todos los SPC activos tienen contacto reciente — buen trabajo ahí.')
    return lines.join('\n')
  }

  return `No tengo ese dato a la mano${address} — puedo hablarle con precisión de ingresos y caja, objetivos del trimestre, carga del equipo, tareas vencidas o clientes sin contacto reciente. También puede preguntarme directamente "¿qué es prioridad hoy?" y le doy mi lectura del conjunto.`
}

// Zero-cost fallback: no LLM call, no API key, works identically in local
// dev and production. This is not a generic chatbot loop — it's a small
// rule-based synthesizer, same family as lib/weeklySummary.js's narrative
// builder, wearing ADOR IA's "trusted chief of staff" voice (formal, dry
// wit, opinionated but always anchored to the real numbers — see
// ADOR_IA_SYSTEM_PROMPT above, which still describes the intended persona
// even though it isn't fed to a model right now). It reasons across
// modules (computeSignals) rather than answering each question in
// isolation, so "cómo estamos" and "qué es prioridad" don't just recite
// numbers — they rank what actually deserves attention. Answers can't
// drift from what a future Gemini-backed version would say once
// GEMINI_API_KEY is added (see PROJECT_STATE.md — deferred by user
// choice), since both read the exact same data shape.
//
// `lastTopic` (the topic of the previous assistant reply, tracked by the
// caller) lets a short/pronoun-only follow-up resolve against what was just
// discussed instead of hitting the generic fallback — see isFollowUp().
// Returns { text, topic } so the caller can thread the topic into the next
// call and keep the thread going across multiple follow-ups in a row.
export function answerLocally(question, data, userName, lastTopic) {
  const q = question.toLowerCase()
  const name = firstOnly(userName)
  const address = name ? `, ${name}` : ''
  const signals = computeSignals(data)

  let topic = detectTopic(q)
  let followUp = false
  if (!topic && lastTopic && isFollowUp(q)) {
    topic = lastTopic
    followUp = true
  }

  const wantsWhy = hasAny(q, 'por qué', 'porque')
  const text = buildAnswer(topic || 'fallback', { data, name, address, signals, followUp, wantsWhy })

  // A greeting/thanks/fallback shouldn't overwrite what's actually being
  // discussed — keep the previous substantive topic alive for the next turn.
  const nextTopic = topic && topic !== 'saludo' && topic !== 'gracias' ? topic : lastTopic
  return { text, topic: nextTopic }
}
