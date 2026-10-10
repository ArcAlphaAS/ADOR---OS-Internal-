import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useAdorIAContext } from '../../hooks/useAdorIAContext'
import { answerLocally } from '../../lib/adorIA'
import { parseAction, describeAction } from '../../lib/adorIAActions'
import { createTask, applyTaskUpdate, toggleTaskComplete, createDecision, findOrCreateGeneralProyecto } from '../../lib/firestore'
import { workstreamId as buildWorkstreamId, withTimeout } from '../../lib/workspace'
import { SparkleIcon } from '../icons'
import { firstName } from '../../lib/user'

const SUGGESTIONS = [
  '¿Cómo vamos este mes en ingresos?',
  '¿Qué objetivo necesita atención?',
  '¿Quién tiene más carga esta semana?',
  '¿Hay clientes sin contacto reciente?',
  'Crea una tarea para mí: revisar propuesta, mañana',
]

// Messages live only in memory for the life of this panel (never persisted,
// see lib/adorIA.js's header comment) — nothing stops a very long session
// from piling up hundreds of bubbles. Capping keeps render/memory bounded
// without anyone noticing, since no one scrolls back 50 messages in an
// internal chat anyway.
const MAX_MESSAGES = 50
function appendCapped(prev, message) {
  const next = [...prev, message]
  if (next.length <= MAX_MESSAGES) return { messages: next, trimmed: false }
  return { messages: next.slice(next.length - MAX_MESSAGES), trimmed: true }
}

function MessageBubble({ role, content, action, status, actorId, onConfirm, onCancel }) {
  const isUser = role === 'user'
  const card = action ? describeAction(action, actorId) : null
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${isUser ? 'ador-btn-primary' : 'ador-glass ador-grain'}`}
        style={{ color: '#F5F5F5', whiteSpace: 'pre-wrap' }}
      >
        {content}
        {card && (
          <div className="mt-3 rounded-xl border border-white/[0.1] bg-white/[0.03] p-3" style={{ whiteSpace: 'normal' }}>
            <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#E8C15A]">{card.heading}</p>
            <dl className="mt-2 flex flex-col gap-1">
              {card.rows.map(([k, v]) => (
                <div key={k} className="flex gap-2 text-[12.5px]">
                  <dt className="w-[72px] flex-shrink-0 text-[#888888]">{k}</dt>
                  <dd className="min-w-0 text-[#F0F0F0]">{v}</dd>
                </div>
              ))}
            </dl>
            {status === 'pending' && (
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={onConfirm} className="ador-btn-primary rounded-lg px-3.5 py-1.5 text-[12px] font-medium">{card.cta}</button>
                <button type="button" onClick={onCancel} className="rounded-lg px-3 py-1.5 text-[12px] text-[#888888] hover:text-[#F5F5F5]">Cancelar</button>
              </div>
            )}
            {status === 'working' && <p className="mt-3 text-[12px] text-[#888888]">Un momento…</p>}
            {status === 'done' && <p className="mt-3 text-[12px] text-[#4CAF50]">✓ Hecho</p>}
            {status === 'cancelled' && <p className="mt-3 text-[12px] text-[#777777]">Cancelado — no cambié nada.</p>}
            {status === 'error' && <p className="mt-3 text-[12px] text-[#EF5350]">No se pudo completar. Inténtalo de nuevo.</p>}
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdorIAModule({ user }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [trimmedOnce, setTrimmedOnce] = useState(false)
  const context = useAdorIAContext()
  const scrollRef = useRef(null)
  const lastTopicRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  const send = async (text) => {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setError('')
    setMessages((prev) => {
      const { messages: next, trimmed: didTrim } = appendCapped(prev, { role: 'user', content: trimmed })
      if (didTrim) setTrimmedOnce(true)
      return next
    })
    setInput('')
    setSending(true)

    // Answered locally from live data — no Gemini call, no API key needed.
    // See PROJECT_STATE.md: GEMINI_API_KEY setup deferred by user choice.
    // Small artificial delay so the reply doesn't feel instant/robotic.
    await new Promise((resolve) => setTimeout(resolve, 350))
    // Commands ("crea una tarea…", "completa la tarea…", "registra la
    // decisión…") never run straight from a sentence: they come back as a
    // card showing what was understood, with Confirmar / Cancelar.
    const actor = { id: user?.uid, displayName: user?.displayName || user?.email }
    const action = parseAction(trimmed, { ...context.actionCtx, actor })
    let assistant
    if (action?.type === 'clarify') assistant = { role: 'assistant', content: action.message }
    else if (action) assistant = { role: 'assistant', content: 'Esto entendí — dime si lo hago:', action, status: 'pending' }
    else {
      const reply = answerLocally(trimmed, context.data, firstName(user), lastTopicRef.current)
      lastTopicRef.current = reply.topic
      assistant = { role: 'assistant', content: reply.text }
    }
    setMessages((prev) => {
      const { messages: next, trimmed: didTrim } = appendCapped(prev, assistant)
      if (didTrim) setTrimmedOnce(true)
      return next
    })
    setSending(false)
  }

  const setStatus = (index, status) => setMessages((prev) => prev.map((m, i) => (i === index ? { ...m, status } : m)))

  const runAction = async (a) => {
    const actorName = user?.displayName || user?.email?.split('@')[0] || 'Usuario'
    if (!user?.uid || user.uid === 'preview') throw new Error('Sin sesión real')
    if (a.type === 'createTask') {
      const workstreamId = a.workstream?.id || (await findOrCreateGeneralProyecto(actorName).then((pid) => buildWorkstreamId('proyecto', pid)))
      await createTask(
        { title: a.title, description: '', workstreamId, priority: a.priority, assignedTo: [a.assignee?.id || user.uid], startDate: null, endDate: null, dueDate: a.dueDate || null },
        actorName,
        user.uid
      )
    } else if (a.type === 'completeTask') {
      if (a.task.status !== 'completado') await toggleTaskComplete(a.task, actorName)
    } else if (a.type === 'moveTask') {
      await applyTaskUpdate(a.task, { dueDate: a.dueDate }, user.uid, actorName)
    } else if (a.type === 'decision') {
      await createDecision({ title: a.title, context: '', clientId: null, proyectoId: null, linkedName: null }, actorName)
    }
  }

  const confirm = async (index) => {
    const a = messages[index]?.action
    if (!a) return
    setStatus(index, 'working')
    try {
      await withTimeout(runAction(a))
      setStatus(index, 'done')
    } catch {
      setStatus(index, 'error')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="mx-auto flex h-full w-full max-w-[820px] flex-col px-4 pb-8 pt-6 md:px-8 lg:px-12 lg:pt-10"
    >
      <div className="flex items-center gap-2.5">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full text-[#F4EEE2]"
          style={{ backgroundColor: 'rgba(244,238,226,0.12)', border: '1px solid rgba(244,238,226,0.25)' }}
        >
          <SparkleIcon size={17} />
        </div>
        <div>
          <h1 className="ador-title">ADOR IA</h1>
          <p className="text-[12px] text-[#888888]">Responde con los datos reales de la empresa y ejecuta órdenes sencillas — siempre pide confirmación.</p>
        </div>
      </div>

      <div ref={scrollRef} className="mt-6 flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-6 pb-16 text-center">
            <p className="text-[14px] font-light text-[#888888]">
              {firstName(user) ? `¿En qué te ayudo, ${firstName(user)}?` : '¿En qué te ayudo?'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-white/[0.1] px-3.5 py-2 text-[12px] text-[#888888] transition-colors duration-150 hover:border-white/[0.2] hover:text-[#F5F5F5]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {trimmedOnce && (
              <p className="pb-1 text-center text-[11px] text-[#444444]">
                Mostrando los últimos {MAX_MESSAGES} mensajes — la conversación sigue igual, solo se liberó espacio.
              </p>
            )}
            {messages.map((m, i) => (
              <MessageBubble key={i} role={m.role} content={m.content} action={m.action} status={m.status} actorId={user?.uid} onConfirm={() => confirm(i)} onCancel={() => setStatus(i, 'cancelled')} />
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="ador-glass ador-grain flex items-center gap-1.5 rounded-2xl px-4 py-3">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-[#888888]"
                      style={{ animation: `ador-pulse 1.2s ease-in-out ${i * 0.15}s infinite` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {error && <p className="mt-2 text-[12px] text-[#E05252]">{error}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
        className="ador-glass ador-grain mt-4 flex items-center gap-2 rounded-full px-2 py-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pregúntale a ADOR IA sobre tu empresa..."
          className="flex-1 bg-transparent px-3 text-[13px] text-[#F5F5F5] placeholder:text-[#444444] outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="ador-btn-primary rounded-full px-4 py-2 text-[13px] font-medium disabled:opacity-40"
        >
          Enviar
        </button>
      </form>
    </motion.div>
  )
}
