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
import { setThinking } from '../../lib/liveStatus'
import { haptic } from '../../lib/haptics'
import usePhone from '../../hooks/usePhone'
import ParticleCore from './ParticleCore'
import { listConversations, loadConversation, saveConversation, renameConversation, deleteConversation, togglePinConversation, clearHistory } from '../../lib/adorIAHistory'

// The four starting points on the empty screen: a short title and the full
// question each one sends.
const STARTERS = [
  { Icon: WalletIcon, title: 'Ingresos del mes', prompt: '¿Cómo vamos este mes en ingresos?' },
  { Icon: TargetIcon, title: 'Objetivos en riesgo', prompt: '¿Qué objetivo necesita atención?' },
  { Icon: UsersIcon, title: 'Carga del equipo', prompt: '¿Quién tiene más carga esta semana?' },
  { Icon: PlusIcon, title: 'Crear una tarea', prompt: 'Crea una tarea para mí: revisar propuesta, mañana' },
]

// Dos esferas de cristal que se superponen y flotan, con un resplandor suave detrás (lavanda
// y verde agua, muy tenue). Es la "presencia" de ADOR IA: respira en la pantalla de inicio y
// se acelera mientras piensa.
function GlassOrbs({ size = 40, busy = false }) {
  const d = size * 0.68
  const orb = { width: d, height: d, background: 'radial-gradient(circle at 34% 28%, rgba(255,255,255,0.82), rgba(255,255,255,0.10) 50%, rgba(255,255,255,0.02) 80%)', border: '1px solid rgba(255,255,255,0.38)', boxShadow: 'inset 0 0 12px rgba(255,255,255,0.18), 0 0 18px rgba(255,255,255,0.12)', backdropFilter: 'blur(2px)' }
  return (
    <span className="relative inline-flex flex-shrink-0 items-center justify-center" style={{ width: size * 1.5, height: size * 1.2 }} aria-hidden>
      <span className="absolute rounded-full" style={{ width: size * 1.5, height: size * 1.2, background: 'radial-gradient(ellipse at 45% 50%, rgba(170,150,255,0.62), rgba(110,220,205,0.34) 52%, transparent 74%)', filter: 'blur(14px)', animation: `ador-orb-glow ${busy ? 1.6 : 3.4}s ease-in-out infinite` }} />
      <span className="absolute rounded-full" style={{ ...orb, left: '12%', top: '8%', animation: `ador-orb-a ${busy ? 2.2 : 5.5}s ease-in-out infinite` }} />
      <span className="absolute rounded-full" style={{ ...orb, right: '12%', bottom: '8%', animation: `ador-orb-b ${busy ? 2.6 : 6.5}s ease-in-out infinite` }} />
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

// Órdenes rápidas al escribir "/" (solo atajos de frases que el motor ya entiende).
const SLASH = [
  { cmd: '/resumen', hint: 'Cómo está todo', text: '¿Cómo estamos?', send: true },
  { cmd: '/prioridades', hint: 'Qué atender primero', text: '¿Qué debería priorizar?', send: true },
  { cmd: '/ingresos', hint: 'Ingresos del mes', text: '¿Cómo vamos este mes en ingresos?', send: true },
  { cmd: '/objetivos', hint: 'Objetivos en riesgo', text: '¿Qué objetivo necesita atención?', send: true },
  { cmd: '/equipo', hint: 'Carga del equipo', text: '¿Quién tiene más carga esta semana?', send: true },
  { cmd: '/tarea', hint: 'Crear una tarea', text: 'Crea una tarea para mí: ', send: false },
  { cmd: '/decisión', hint: 'Registrar una decisión', text: 'Registra la decisión: ', send: false },
]

// Sugerencias de seguimiento bajo la última respuesta, según el tema de que se habló.
const FOLLOW_UPS = {
  finanzas: ['¿Por qué?', '¿Qué debería priorizar?', '¿Cómo estamos en general?'],
  objetivos: ['¿Por qué?', '¿Quién tiene más carga esta semana?', '¿Qué debería priorizar?'],
  workspace: ['¿Por qué?', '¿Cómo vamos este mes en ingresos?', '¿Qué objetivo necesita atención?'],
  clientes: ['¿Por qué?', '¿Cómo vamos este mes en ingresos?', '¿Qué debería priorizar?'],
  overview: ['¿Por qué?', '¿Qué debería priorizar?', '¿Cómo vamos este mes en ingresos?'],
  priority: ['¿Por qué?', '¿Qué objetivo necesita atención?', '¿Quién tiene más carga esta semana?'],
}
const chipsFor = (topic) => FOLLOW_UPS[topic] || ['¿Cómo estamos?', '¿Qué debería priorizar?', '¿Qué objetivo necesita atención?']

// Texto que aparece de a poco, como una respuesta que se va escribiendo. Solo la respuesta
// nueva; el historial se muestra completo. Sin animación si el sistema pide menos movimiento.
function Reveal({ text, onTick, onDone }) {
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const [n, setN] = useState(reduce ? text.length : 0)
  useEffect(() => {
    if (n >= text.length) { onDone?.(); return }
    const t = setTimeout(() => { setN((v) => Math.min(text.length, v + 4)); onTick?.() }, 14)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, text])
  return text.slice(0, n)
}

const IconBtn = ({ label, onClick, children }) => (
  <button type="button" title={label} aria-label={label} onClick={onClick} className="flex h-7 w-7 items-center justify-center rounded-lg text-[#767676] transition-colors hover:bg-white/[0.08] hover:text-[#F5F5F5]">{children}</button>
)
const svg = (d) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{d}</svg>

function MessageBubble({ role, content, action, status, actorId, onConfirm, onCancel, plain = false, revealing = false, onTick, onDone, onCopy, onRegenerate, onEdit, chips, onChip }) {
  const isUser = role === 'user'
  const card = action ? describeAction(action, actorId) : null
  const flat = plain && !isUser // escritorio: la respuesta va como texto, sin burbuja
  const desktop = plain
  return (
    <div className={`group/msg flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {desktop && isUser && onEdit && (
        <span className="mt-1 opacity-0 transition-opacity group-hover/msg:opacity-100"><IconBtn label="Editar y reenviar" onClick={onEdit}>{svg(<path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z" />)}</IconBtn></span>
      )}
      <div className={flat ? 'min-w-0 max-w-[88%]' : 'min-w-0 max-w-[86%] md:max-w-[80%]'}>
      <div
        className={flat ? 'ador-msg-in min-w-0 py-0.5 text-[15px] leading-[1.65]' : 'ador-msg-in rounded-[22px] px-4 py-2.5 text-[15.5px] leading-[1.4] md:text-[14px]'}
        style={{ color: '#F5F5F5', whiteSpace: 'pre-wrap', background: flat ? 'transparent' : isUser ? '#2C2C2E' : '#1C1C1E' }}
      >
        {flat && revealing ? <Reveal text={content} onTick={onTick} onDone={onDone} /> : content}
        {card && (
          <div className="mt-3 rounded-2xl bg-white/[0.07] p-3.5" style={{ whiteSpace: 'normal' }}>
            <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#E8C15A]">{card.heading}</p>
            <dl className="mt-2 flex flex-col gap-1">
              {card.rows.map(([k, v]) => (
                <div key={k} className="flex gap-2 text-[14px] md:text-[12.5px]">
                  <dt className="w-[72px] flex-shrink-0 text-[#888888]">{k}</dt>
                  <dd className="min-w-0 text-[#F0F0F0]">{v}</dd>
                </div>
              ))}
            </dl>
            {status === 'pending' && (
              <div className="mt-3 flex items-center gap-2">
                <button type="button" onClick={() => { haptic('success'); onConfirm() }} className="ador-btn-primary h-11 flex-1 rounded-full px-4 text-[15px] font-semibold md:h-auto md:flex-none md:rounded-lg md:px-3.5 md:py-1.5 md:text-[12px] md:font-medium">{card.cta}</button>
                <button type="button" onClick={onCancel} className="h-11 rounded-full px-4 text-[15px] text-[#8E8E93] hover:text-[#F5F5F5] md:h-auto md:rounded-lg md:px-3 md:py-1.5 md:text-[12px]">Cancelar</button>
              </div>
            )}
            {status === 'working' && <p className="mt-3 text-[12px] text-[#888888]">Un momento…</p>}
            {status === 'done' && <p className="mt-3 text-[12px] text-[#4CAF50]">✓ Hecho</p>}
            {status === 'cancelled' && <p className="mt-3 text-[12px] text-[#8A8A8A]">Cancelado — no cambié nada.</p>}
            {status === 'error' && <p className="mt-3 text-[12px] text-[#EF5350]">No se pudo completar. Inténtalo de nuevo.</p>}
          </div>
        )}
      </div>
      {flat && !revealing && (onCopy || onRegenerate) && (
        <div className="mt-1 flex items-center gap-0.5 opacity-0 transition-opacity group-hover/msg:opacity-100">
          {onCopy && <IconBtn label="Copiar" onClick={onCopy}>{svg(<><rect x="9" y="9" width="11" height="11" rx="2.5" /><path d="M5 15V6a2 2 0 0 1 2-2h9" /></>)}</IconBtn>}
          {onRegenerate && <IconBtn label="Responder de nuevo" onClick={onRegenerate}>{svg(<><path d="M20 11a8 8 0 1 0-2.3 5.7" /><path d="M20 5v6h-6" /></>)}</IconBtn>}
        </div>
      )}
      {flat && !revealing && chips && (
        <div className="mt-3 flex flex-wrap gap-2">
          {chips.map((c) => (
            <button key={c} type="button" onClick={() => onChip(c)} className="rounded-full bg-white/[0.06] px-3.5 py-1.5 text-[12.5px] text-[#C9C9C9] transition-colors hover:bg-white/[0.12] hover:text-[#F5F5F5]">{c}</button>
          ))}
        </div>
      )}
      </div>
    </div>
  )
}

// Escritorio: campo grande que crece, Enter envía y Mayús+Enter hace salto de línea.
function DesktopComposer({ value, onChange, onSend, onSendText, onRecall, busy, autoFocus }) {
  const ref = useRef(null)
  const [pick, setPick] = useState(0)
  const slash = value.startsWith('/') && !value.includes(' ') ? SLASH.filter((c) => c.cmd.startsWith(value.toLowerCase())) : []
  useEffect(() => setPick(0), [value])
  const choose = (c) => {
    if (c.send) { onChange(''); onSendText(c.text) } else onChange(c.text)
  }
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`
  }, [value])
  useEffect(() => { if (autoFocus) ref.current?.focus() }, [autoFocus])
  return (
    <div className="relative w-full">
      {slash.length > 0 && (
        <div className="absolute inset-x-0 bottom-[calc(100%+8px)] z-10 overflow-hidden rounded-2xl bg-[#1C1C1E] p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.5)] ring-1 ring-white/[0.1]">
          {slash.map((c, i) => (
            <button key={c.cmd} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => choose(c)} onMouseEnter={() => setPick(i)} className="flex w-full items-center justify-between rounded-xl px-3.5 py-2 text-left" style={{ background: i === pick ? 'rgba(255,255,255,0.09)' : 'transparent' }}>
              <span className="text-[13.5px] font-medium text-[#F5F5F5]">{c.cmd}</span>
              <span className="text-[12.5px] text-[#8A8A8A]">{c.hint}</span>
            </button>
          ))}
        </div>
      )}
    <div className="flex w-full items-end gap-3 rounded-[26px] bg-[#1C1C1E] py-3 pl-5 pr-3 ring-1 ring-white/[0.08] transition-shadow focus-within:ring-white/[0.22]">
      <textarea
        ref={ref}
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (slash.length) {
            if (e.key === 'ArrowDown') { e.preventDefault(); setPick((p) => (p + 1) % slash.length); return }
            if (e.key === 'ArrowUp') { e.preventDefault(); setPick((p) => (p - 1 + slash.length) % slash.length); return }
            if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); choose(slash[pick]); return }
            if (e.key === 'Escape') { onChange(''); return }
          }
          if (e.key === 'ArrowUp' && !value && onRecall) { e.preventDefault(); onRecall(); return }
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); onSend() }
        }}
        placeholder="Pregunta algo, escribe una orden o usa /  para atajos…"
        className="max-h-[180px] min-h-[28px] flex-1 resize-none bg-transparent py-1 text-[15px] leading-[1.5] text-[#F5F5F5] placeholder:text-[#767676] outline-none"
      />
      <button
        type="button"
        onClick={onSend}
        disabled={!value.trim() || busy}
        aria-label="Enviar"
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#F5F5F5] text-[#0A0A0A] transition-opacity disabled:opacity-25"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
      </button>
    </div>
    </div>
  )
}

export default function AdorIAModule({ user, onNavigate }) {
  const phone = usePhone()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [trimmedOnce, setTrimmedOnce] = useState(false)
  const context = useAdorIAContext()
  const scrollRef = useRef(null)
  // Teléfono: ADOR IA ocupa toda la pantalla (como Siri o Mensajes): se van la barra de arriba
  // y la de abajo, y el campo de escribir queda pegado al borde.
  useEffect(() => {
    document.documentElement.classList.toggle('ador-chat-open', phone)
    return () => document.documentElement.classList.remove('ador-chat-open')
  }, [phone])
  const lastTopicRef = useRef(null)

  // ---- Historial (solo en este navegador, ver lib/adorIAHistory.js) ----
  const uid = user?.uid
  const [convId, setConvId] = useState(null)
  const [history, setHistory] = useState(() => listConversations(uid))
  const [sidebarOpen, setSidebarOpen] = useState(() => { try { return localStorage.getItem('ador_ia_sidebar') !== '0' } catch { return true } })
  const [historyQuery, setHistoryQuery] = useState('')
  const [renaming, setRenaming] = useState(null) // { id, value }
  const [confirmDel, setConfirmDel] = useState(null)
  const skipSave = useRef(false)
  const toggleSidebar = () => setSidebarOpen((v) => { try { localStorage.setItem('ador_ia_sidebar', v ? '0' : '1') } catch { /* nada */ } return !v })

  useEffect(() => {
    if (sending || messages.length === 0) return
    if (skipSave.current) { skipSave.current = false; return }
    let id = convId
    if (!id) { id = `c${Date.now().toString(36)}`; setConvId(id) }
    const t = setTimeout(() => { saveConversation(uid, id, messages); setHistory(listConversations(uid)) }, 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, sending])

  const topicOf = (list) => [...list].reverse().find((m) => m.role === 'assistant' && m.topic)?.topic || null
  const newChat = () => { setMessages([]); setConvId(null); lastTopicRef.current = null; setTrimmedOnce(false); setInput('') }
  const openConv = (id) => {
    const loaded = loadConversation(uid, id)
    skipSave.current = true
    setMessages(loaded)
    setConvId(id)
    lastTopicRef.current = topicOf(loaded)
    setTrimmedOnce(false)
  }
  const removeConv = (id) => {
    deleteConversation(uid, id)
    setHistory(listConversations(uid))
    if (id === convId) newChat()
    setConfirmDel(null)
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  const send = async (text) => {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    haptic()
    setError('')
    setMessages((prev) => {
      const { messages: next, trimmed: didTrim } = appendCapped(prev, { role: 'user', content: trimmed })
      if (didTrim) setTrimmedOnce(true)
      return next
    })
    setInput('')
    setSending(true)
    setThinking(true)

    // Answered locally from live data — no Gemini call, no API key needed.
    // See PROJECT_STATE.md: GEMINI_API_KEY setup deferred by user choice.
    // Small artificial delay so the reply doesn't feel instant/robotic.
    await new Promise((resolve) => setTimeout(resolve, 800))
    // Commands ("crea una tarea…", "completa la tarea…", "registra la
    // decisión…") never run straight from a sentence: they come back as a
    // card showing what was understood, with Confirmar / Cancelar.
    const actor = { id: user?.uid, displayName: user?.displayName || user?.email }
    const action = parseAction(trimmed, { ...context.actionCtx, actor })
    let assistant
    if (action?.type === 'clarify') assistant = { role: 'assistant', content: action.message }
    else if (action) assistant = { role: 'assistant', content: 'Esto entendí — dime si lo hago:', action, status: 'pending' }
    else {
      const prevTopic = lastTopicRef.current
      const reply = answerLocally(trimmed, context.data, firstName(user), prevTopic)
      lastTopicRef.current = reply.topic
      assistant = { role: 'assistant', content: reply.text, topic: reply.topic || 'fallback', prevTopic, fresh: true }
    }
    setMessages((prev) => {
      const { messages: next, trimmed: didTrim } = appendCapped(prev, assistant)
      if (didTrim) setTrimmedOnce(true)
      return next
    })
    setSending(false)
    setThinking(false)
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

  const regenerate = (index) => {
    const a = messages[index]
    const q = messages[index - 1]
    if (!a || a.topic === undefined || q?.role !== 'user') return
    const reply = answerLocally(q.content, context.data, firstName(user), a.prevTopic ?? null)
    lastTopicRef.current = reply.topic
    setMessages((prev) => prev.map((m, i) => (i === index ? { role: 'assistant', content: reply.text, topic: reply.topic || 'fallback', prevTopic: a.prevTopic, fresh: true } : m)))
  }
  const editFrom = (index) => {
    const m = messages[index]
    if (!m) return
    const rest = messages.slice(0, index)
    setMessages(rest)
    lastTopicRef.current = topicOf(rest)
    setInput(m.content)
  }
  const copyText = (t) => navigator.clipboard?.writeText(t).catch(() => {})
  const recallLast = () => { const last = [...messages].reverse().find((m) => m.role === 'user'); if (last) setInput(last.content) }
  const scrollDown = () => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })

  if (!phone) {
    const reset = newChat
    const name = firstName(user)
    // Historial agrupado por antigüedad (solo títulos; cada conversación se lee al abrirla).
    const q = historyQuery.trim().toLowerCase()
    const shown = history.filter((c) => !q || c.title.toLowerCase().includes(q))
    const startToday = new Date(); startToday.setHours(0, 0, 0, 0)
    const bucketOf = (c) => {
      if (c.pinned) return 'Fijadas'
      const d = startToday.getTime() - c.updatedAt
      return d <= 0 ? 'Hoy' : d <= 86400000 ? 'Ayer' : d <= 7 * 86400000 ? 'Esta semana' : 'Anteriores'
    }
    const groups = ['Fijadas', 'Hoy', 'Ayer', 'Esta semana', 'Anteriores'].map((g) => [g, shown.filter((c) => bucketOf(c) === g)]).filter(([, l]) => l.length)
    const lastIdx = messages.length - 1

    return (
      <motion.div initial={false} className="flex h-full w-full">
        {sidebarOpen && (
          <aside className="flex w-[268px] flex-shrink-0 flex-col gap-3 pb-8 pl-8 pr-2 pt-8">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-[#F5F5F5]">Historial</span>
              <IconBtn label="Ocultar historial" onClick={toggleSidebar}>{svg(<><rect x="3.5" y="4.5" width="17" height="15" rx="3" /><path d="M9.5 4.5v15" /></>)}</IconBtn>
            </div>
            <button type="button" onClick={newChat} className="flex items-center gap-2 rounded-xl bg-white/[0.07] px-3.5 py-2.5 text-[13px] font-medium text-[#F5F5F5] transition-colors hover:bg-white/[0.12]">
              <PlusIcon size={13} /> Nueva conversación
            </button>
            {history.length > 4 && (
              <input value={historyQuery} onChange={(e) => setHistoryQuery(e.target.value)} placeholder="Buscar…" className="rounded-xl bg-white/[0.05] px-3.5 py-2 text-[12.5px] text-[#F5F5F5] placeholder:text-[#767676] outline-none focus:bg-white/[0.08]" />
            )}
            <div className="-mr-2 flex-1 overflow-y-auto pr-2">
              {history.length === 0 ? (
                <p className="px-1 pt-2 text-[12.5px] leading-relaxed text-[#767676]">Tus conversaciones aparecerán aquí. Se guardan solo en este navegador.</p>
              ) : shown.length === 0 ? (
                <p className="px-1 pt-2 text-[12.5px] text-[#767676]">Nada coincide.</p>
              ) : (
                groups.map(([g, list]) => (
                  <div key={g} className="mb-3">
                    <p className="px-2 pb-1 text-[11px] font-medium text-[#767676]">{g}</p>
                    {list.map((c) => (
                      <div key={c.id} className="group/row relative">
                        {renaming?.id === c.id ? (
                          <input
                            autoFocus
                            value={renaming.value}
                            onChange={(e) => setRenaming({ id: c.id, value: e.target.value })}
                            onBlur={() => { renameConversation(uid, c.id, renaming.value); setHistory(listConversations(uid)); setRenaming(null) }}
                            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); else if (e.key === 'Escape') setRenaming(null) }}
                            className="w-full rounded-lg bg-white/[0.1] px-2.5 py-1.5 text-[13px] text-[#F5F5F5] outline-none ring-1 ring-white/[0.2]"
                          />
                        ) : (
                          <button type="button" onClick={() => openConv(c.id)} className="block w-full truncate rounded-lg px-2.5 py-2 pr-[72px] text-left text-[13px] transition-colors" style={{ background: c.id === convId ? 'rgba(255,255,255,0.09)' : 'transparent', color: c.id === convId ? '#F5F5F5' : '#B5B5B5' }}>
                            {c.pinned && <span className="mr-1 text-[#E8C15A]">•</span>}{c.title}
                          </button>
                        )}
                        {renaming?.id !== c.id && (
                          <span className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center opacity-0 transition-opacity group-hover/row:opacity-100">
                            <IconBtn label={c.pinned ? 'Desfijar' : 'Fijar'} onClick={() => { togglePinConversation(uid, c.id); setHistory(listConversations(uid)) }}>{svg(<path d="M12 17v5M9 3h6l-1 6 3 3v2H7v-2l3-3-1-6Z" />)}</IconBtn>
                            <IconBtn label="Renombrar" onClick={() => setRenaming({ id: c.id, value: c.title })}>{svg(<path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z" />)}</IconBtn>
                            <IconBtn label={confirmDel === c.id ? 'Pulsa otra vez para borrar' : 'Borrar'} onClick={() => (confirmDel === c.id ? removeConv(c.id) : setConfirmDel(c.id))}>
                              <span style={{ color: confirmDel === c.id ? '#EF5350' : undefined }}>{svg(<path d="M5 7h14M10 11v6M14 11v6M7 7l1 12h8l1-12M9 7V4h6v3" />)}</span>
                            </IconBtn>
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
            {history.length > 0 && (
              <button type="button" onClick={() => { if (confirmDel === 'all') { clearHistory(uid); setHistory([]); newChat(); setConfirmDel(null) } else setConfirmDel('all') }} className="self-start px-1 text-[11.5px] transition-colors hover:text-[#EF5350]" style={{ color: confirmDel === 'all' ? '#EF5350' : '#767676' }}>
                {confirmDel === 'all' ? 'Pulsa otra vez para borrar todo' : 'Borrar todo el historial'}
              </button>
            )}
          </aside>
        )}

        <div className="relative mx-auto flex h-full min-w-0 max-w-[940px] flex-1 flex-col px-10 pb-8 pt-8">
          {!sidebarOpen && (
            <div className="absolute left-3 top-8 z-10 flex flex-col gap-1">
              <IconBtn label="Mostrar historial" onClick={toggleSidebar}>{svg(<><rect x="3.5" y="4.5" width="17" height="15" rx="3" /><path d="M9.5 4.5v15" /></>)}</IconBtn>
              <IconBtn label="Nueva conversación" onClick={newChat}>{svg(<path d="M12 5v14M5 12h14" />)}</IconBtn>
            </div>
          )}
          {messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center pb-10 text-center">
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 18 }}>
                <ParticleCore size={150} />
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }} className="mt-6">
                <h1 className="text-[48px] leading-[1.08] tracking-[-0.02em]" style={SERIF}>
                  <span className="text-[#F5F5F5]">Hola</span>
                  {name && <span className="bg-gradient-to-r from-[#BDBDBD] to-[#5A5A5A] bg-clip-text text-transparent">, {name}</span>}
                </h1>
                <h2 className="mt-1 text-[48px] leading-[1.08] tracking-[-0.02em] text-[#F5F5F5]" style={SERIF}>¿En qué te ayudo hoy?</h2>
                <p className="mx-auto mt-4 max-w-[480px] text-[14px] leading-relaxed text-[#8A8A8A]">Respondo con los datos reales de la empresa y ejecuto órdenes sencillas. Antes de cambiar algo, siempre te pido confirmación.</p>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }} className="mt-9 w-full max-w-[680px]">
                <DesktopComposer value={input} onChange={setInput} onSend={() => send(input)} onSendText={send} busy={sending} autoFocus />
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {STARTERS.map(({ Icon, title, prompt }) => (
                    <button key={title} type="button" onClick={() => send(prompt)} className="flex items-center gap-2 rounded-full bg-white/[0.05] px-4 py-2 text-[13px] text-[#D0D0D0] transition-colors hover:bg-white/[0.1] hover:text-[#F5F5F5]">
                      <Icon size={14} className="text-[#F4EEE2]" /> {title}
                    </button>
                  ))}
                </div>
                <p className="mt-5 text-[11.5px] text-[#767676]">Enter envía · Mayús + Enter salto de línea · «/» atajos · ↑ recupera tu último mensaje</p>
              </motion.div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 pb-4" style={{ paddingLeft: sidebarOpen ? 0 : 36 }}>
                <h1 className="min-w-0 truncate text-[16px] font-semibold tracking-tight text-[#F5F5F5]">{history.find((c) => c.id === convId)?.title || 'Nueva conversación'}</h1>
                <button type="button" onClick={newChat} className="flex flex-shrink-0 items-center gap-1.5 rounded-full bg-white/[0.06] px-4 py-2 text-[12.5px] font-medium text-[#F4EEE2] transition-colors hover:bg-white/[0.12]">
                  <PlusIcon size={12} /> Nueva
                </button>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto">
                <div className="mx-auto flex w-full max-w-[740px] flex-col gap-6 pb-6">
                  {trimmedOnce && <p className="text-center text-[11px] text-[#8A8A8A]">Mostrando los últimos {MAX_MESSAGES} mensajes — la conversación sigue igual, solo se liberó espacio.</p>}
                  {messages.map((m, i) => {
                    const isAssistantAnswer = m.role === 'assistant' && m.topic !== undefined
                    const last = i === lastIdx
                    return (
                      <MessageBubble
                        key={i}
                        plain
                        role={m.role}
                        content={m.content}
                        action={m.action}
                        status={m.status}
                        actorId={user?.uid}
                        onConfirm={() => confirm(i)}
                        onCancel={() => setStatus(i, 'cancelled')}
                        revealing={Boolean(m.fresh) && last && !sending}
                        onTick={scrollDown}
                        onDone={() => setMessages((prev) => prev.map((mm, k) => (k === i && mm.fresh ? { ...mm, fresh: false } : mm)))}
                        onCopy={m.role === 'assistant' ? () => copyText(m.content) : undefined}
                        onRegenerate={isAssistantAnswer && last && !sending ? () => regenerate(i) : undefined}
                        onEdit={m.role === 'user' && !sending ? () => editFrom(i) : undefined}
                        chips={isAssistantAnswer && last && !sending ? chipsFor(m.topic) : undefined}
                        onChip={send}
                      />
                    )
                  })}
                  {sending && (
                    <div className="flex items-center gap-3">
                      <ParticleCore size={34} busy />
                      <span className="ador-shimmer-text text-[14px] font-medium">Pensando…</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="mx-auto w-full max-w-[740px] pt-3">
                <DesktopComposer value={input} onChange={setInput} onSend={() => send(input)} onSendText={send} onRecall={recallLast} busy={sending} autoFocus />
              </div>
            </>
          )}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={false}
      className="mx-auto flex h-full w-full max-w-[820px] flex-col px-4 pt-[calc(env(safe-area-inset-top,0px)+8px)] pb-[calc(env(safe-area-inset-bottom,0px)+10px)] md:px-8 md:pb-8 md:pt-6 lg:px-12 lg:pt-10"
    >
      <div className="flex items-center justify-between gap-3 md:hidden">
        <button type="button" onClick={() => { haptic(); onNavigate?.('inicio') }} aria-label="Cerrar ADOR IA" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.07] text-[#F5F5F5] active:bg-white/[0.12]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        </button>
        <span className="text-[16px] font-semibold text-[#F5F5F5]">ADOR IA</span>
        {messages.length > 0 ? (
          <button type="button" aria-label="Nueva conversación" onClick={() => { haptic(); setMessages([]); lastTopicRef.current = null; setTrimmedOnce(false) }} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.07] text-[#F5F5F5] active:bg-white/[0.12]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z" /></svg>
          </button>
        ) : <span className="h-11 w-11" />}
      </div>
      {messages.length > 0 && (
        <div className="hidden items-center justify-between gap-3 md:flex">
          <h1 className="text-[18px] font-semibold tracking-tight text-[#F5F5F5]">ADOR IA</h1>
          <button
            type="button"
            onClick={() => {
              setMessages([])
              lastTopicRef.current = null
              setTrimmedOnce(false)
            }}
            className="rounded-full bg-[#1C1C1E] px-4 py-2 text-[14px] font-medium text-[#F4EEE2] transition-colors active:bg-[#2C2C2E] md:text-[12.5px]"
          >
            Nueva conversación
          </button>
        </div>
      )}

      <div ref={scrollRef} className={`flex-1 overflow-y-auto ${messages.length > 0 ? 'mt-6' : ''}`}>
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center pb-4 text-center md:items-stretch md:justify-end md:pb-6 md:text-left">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="mb-auto mt-10 hidden sm:mt-16 md:block"
            >
              <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-[#8A8A8A]">ADOR IA</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 16 }} className="mb-7 md:mb-6">
              <ParticleCore size={phone ? 190 : 170} />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <h1 className="text-[42px] leading-[1.05] tracking-[-0.02em] sm:text-[52px]" style={SERIF}>
                <span className="text-[#F5F5F5]">Hola</span>
                {firstName(user) && <span className="bg-gradient-to-r from-[#BDBDBD] to-[#5A5A5A] bg-clip-text text-transparent">, {firstName(user)}</span>}
              </h1>
              <h2 className="mt-1 text-[34px] leading-[1.08] tracking-[-0.02em] text-[#F5F5F5] sm:text-[52px]" style={SERIF}>
                ¿En qué te ayudo hoy?
              </h2>
              <p className="mt-5 hidden max-w-[460px] text-[14.5px] leading-relaxed text-[#8A8A8A] md:block">
                Respondo con los datos reales de la empresa y ejecuto órdenes sencillas. Antes de cambiar algo, siempre te pido confirmación.
              </p>
            </motion.div>
            <div className="mt-9 flex flex-wrap justify-center gap-2.5 md:mt-10 md:grid md:grid-cols-2 md:justify-start md:gap-3">
              {STARTERS.map(({ Icon, title, prompt }, i) => (
                <motion.button
                  key={title}
                  type="button"
                  onClick={() => { haptic(); send(prompt) }}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.3 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-center gap-2.5 rounded-full bg-[#1C1C1E] p-1.5 pr-4 text-left transition-colors duration-150 active:bg-[#2C2C2E] md:gap-4 md:rounded-[22px] md:p-2.5 md:pr-5 md:hover:bg-white/[0.08]"
                >
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-[#F4EEE2] md:h-12 md:w-12 md:rounded-2xl">
                    <Icon size={20} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14.5px] font-medium text-[#F0F0F0]">{title}</span>
                    <span className="hidden truncate text-[12px] text-[#8A8A8A] md:block">{prompt}</span>
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {trimmedOnce && (
              <p className="pb-1 text-center text-[11px] text-[#8A8A8A]">
                Mostrando los últimos {MAX_MESSAGES} mensajes — la conversación sigue igual, solo se liberó espacio.
              </p>
            )}
            {messages.map((m, i) => (
              <MessageBubble key={i} role={m.role} content={m.content} action={m.action} status={m.status} actorId={user?.uid} onConfirm={() => confirm(i)} onCancel={() => setStatus(i, 'cancelled')} />
            ))}
            {sending && (
              <div className="flex items-center gap-3 pl-1 pt-1">
                <ParticleCore size={44} busy />
                <span className="ador-shimmer-text text-[17px] font-medium">Pensando…</span>
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
        className="relative mt-4 flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.05] py-2 pl-3 pr-2 backdrop-blur-xl transition-colors focus-within:border-white/[0.2] focus-within:bg-white/[0.08]"
      >
        <span className="-ml-1 flex w-9 justify-center"><ParticleCore size={30} busy={sending} /></span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pregunta o escribe una orden…"
          className="min-w-0 flex-1 bg-transparent px-2 text-[16px] text-[#F5F5F5] placeholder:text-[#8E8E93] outline-none md:text-[14px]" enterKeyHint="send"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          aria-label="Enviar"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F5F5F5] text-[#0A0A0A] transition-opacity disabled:opacity-30 md:h-9 md:w-9"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
        </button>
      </form>
    </motion.div>
  )
}
