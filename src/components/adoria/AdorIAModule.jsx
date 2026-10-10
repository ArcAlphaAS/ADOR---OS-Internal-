import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useAdorIAContext } from '../../hooks/useAdorIAContext'
import { answerLocally } from '../../lib/adorIA'
import { parseAction, describeAction } from '../../lib/adorIAActions'
import { createTask, applyTaskUpdate, toggleTaskComplete, createDecision, findOrCreateGeneralProyecto } from '../../lib/firestore'
import { workstreamId as buildWorkstreamId, withTimeout } from '../../lib/workspace'
import { SparkleIcon, WalletIcon, TargetIcon, UsersIcon, PlusIcon } from '../icons'
import { SERIF } from '../news/NewsLayout'
import { firstName } from '../../lib/user'

// The four starting points on the empty screen: a short title and the full
// question each one sends.
const STARTERS = [
  { Icon: WalletIcon, title: 'Ingresos del mes', prompt: '¿Cómo vamos este mes en ingresos?' },
  { Icon: TargetIcon, title: 'Objetivos en riesgo', prompt: '¿Qué objetivo necesita atención?' },
  { Icon: UsersIcon, title: 'Carga del equipo', prompt: '¿Quién tiene más carga esta semana?' },
  { Icon: PlusIcon, title: 'Crear una tarea', prompt: 'Crea una tarea para mí: revisar propuesta, mañana' },
]

// A soft light that breathes — ADOR IA's "presence" in the input bar.
function Orb({ size = 34 }) {
  return (
    <span className="relative flex flex-shrink-0 items-center justify-center" style={{ width: size, height: size }} aria-hidden>
      <span
        className="absolute inset-0 rounded-full blur-[10px]"
        style={{ background: 'radial-gradient(circle, rgba(232,193,90,0.75), rgba(244,238,226,0.25) 60%, transparent 75%)', animation: 'ador-pulse 3.2s ease-in-out infinite' }}
      />
      <span className="relative h-[60%] w-[60%] rounded-full" style={{ background: 'radial-gradient(circle at 35% 30%, #FFFFFF, #F4EEE2 35%, #E8C15A 80%)' }} />
    </span>
  )
}

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
      initial={false}
      className="mx-auto flex h-full w-full max-w-[820px] flex-col px-4 pb-8 pt-6 md:px-8 lg:px-12 lg:pt-10"
    >
      {messages.length > 0 && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Orb size={30} />
            <h1 className="text-[18px] font-semibold tracking-tight text-[#F5F5F5]">ADOR IA</h1>
          </div>
          <button
            type="button"
            onClick={() => {
              setMessages([])
              lastTopicRef.current = null
              setTrimmedOnce(false)
            }}
            className="rounded-full border border-white/[0.12] px-3.5 py-1.5 text-[12.5px] text-[#B5B5B5] transition-colors hover:border-white/[0.24] hover:text-[#F5F5F5]"
          >
            Nueva conversación
          </button>
        </div>
      )}

      <div ref={scrollRef} className={`flex-1 overflow-y-auto ${messages.length > 0 ? 'mt-6' : ''}`}>
        {messages.length === 0 ? (
          <div className="flex h-full flex-col justify-end pb-6">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="mb-auto mt-10 sm:mt-16"
            >
              <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-[#767676]">ADOR IA</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <h1 className="text-[40px] leading-[1.05] tracking-[-0.02em] sm:text-[52px]" style={SERIF}>
                <span className="text-[#F5F5F5]">Hola</span>
                {firstName(user) && <span className="bg-gradient-to-r from-[#BDBDBD] to-[#5A5A5A] bg-clip-text text-transparent">, {firstName(user)}</span>}
              </h1>
              <h2 className="mt-1 text-[40px] leading-[1.05] tracking-[-0.02em] text-[#F5F5F5] sm:text-[52px]" style={SERIF}>
                ¿En qué te ayudo hoy?
              </h2>
              <p className="mt-5 max-w-[460px] text-[14.5px] leading-relaxed text-[#8A8A8A]">
                Respondo con los datos reales de la empresa y ejecuto órdenes sencillas. Antes de cambiar algo, siempre te pido confirmación.
              </p>
            </motion.div>
            <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {STARTERS.map(({ Icon, title, prompt }, i) => (
                <motion.button
                  key={title}
                  type="button"
                  onClick={() => send(prompt)}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.3 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-center gap-4 rounded-[22px] bg-white/[0.045] p-2.5 pr-5 text-left transition-colors duration-150 hover:bg-white/[0.08]"
                >
                  <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-white/[0.08] text-[#F4EEE2]">
                    <Icon size={20} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14.5px] font-medium text-[#F0F0F0]">{title}</span>
                    <span className="block truncate text-[12px] text-[#767676]">{prompt}</span>
                  </span>
                </motion.button>
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
        className="mt-4 flex items-center gap-2 rounded-full bg-white/[0.06] py-2 pl-3 pr-2 transition-colors focus-within:bg-white/[0.09]"
      >
        <Orb />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pregunta o escribe una orden…"
          className="flex-1 bg-transparent px-2 text-[14px] text-[#F5F5F5] placeholder:text-[#6A6A6A] outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          aria-label="Enviar"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F5F5F5] text-[#0A0A0A] transition-opacity disabled:opacity-30"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
        </button>
      </form>
    </motion.div>
  )
}
