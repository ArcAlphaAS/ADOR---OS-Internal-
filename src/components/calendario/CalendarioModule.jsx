import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useGoogleCalendar } from '../../hooks/useGoogleCalendar'
import { dailyQuote } from '../../lib/workspace'
import { eventColor, buildEventBody } from '../../lib/googleCalendar'
import { parseQuickEvent } from '../../lib/calendarQuickAdd'
import { registerUndo } from '../../lib/undo'
import { useToast } from '../../hooks/useToast'
import { SPRING } from '../../lib/motion'
import { subscribeTasksForUser } from '../../lib/firestore'
import { CalendarIcon, ArrowRightIcon, ArrowLeftIcon, CloseIcon, PlusIcon } from '../icons'
import CalendarioGrid from './CalendarioGrid'
import MonthGrid from './MonthGrid'
import { MiniMonthCalendar } from './CalendarioRightRail'
import DayAgenda from './DayAgenda'
import CalendarioGreeting from './CalendarioGreeting'
import EventDetailModal from './EventDetailModal'
import EventEditorModal from './EventEditorModal'
import PhoneCalendar from './PhoneCalendar'
import usePhone from '../../hooks/usePhone'

// A read-only "reflejo" of the signed-in founder's own Google Calendar —
// per direct user decision, not a combined team view (Google Calendar
// itself already merges invited events into each person's own calendar, so
// a per-person connection is enough) and not read/write (a lighter Google
// scope with a real path to a persistent connection later — see
// lib/googleCalendar.js's file header for the full reasoning).
//
// Redesigned 2026-09-17 from a reference image into a real Día/Semana/Mes/
// Agenda calendar (CalendarioGrid.jsx / MonthGrid.jsx) plus a right rail
// (mini month, today's events, today's real Workspace tasks). Two pieces
// from the reference were deliberately not built as real actions:
// "Nuevo evento" stays visible but disabled (creating events needs write
// access, which this app intentionally doesn't have — see above), and the
// reference's "Enlaces rápidos" grid (Programar reunión / Bloque de tiempo
// / Calendarios) was dropped rather than ship buttons with nothing behind
// them — this app's standing rule against decorative controls.

const VIEWS = [
  { id: 'dia', label: 'Día' },
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mes' },
  { id: 'agenda', label: 'Agenda' },
]

function startOfWeek(date) {
  const d = new Date(date)
  const diff = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}
function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}
function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function rangeFor(view, anchor) {
  if (view === 'dia') {
    const start = startOfDay(anchor)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    return { start, end }
  }
  if (view === 'mes') {
    const start = startOfMonth(anchor)
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1)
    return { start, end }
  }
  if (view === 'agenda') {
    const start = startOfDay(anchor)
    const end = new Date(start)
    end.setDate(end.getDate() + 30)
    return { start, end }
  }
  const start = startOfWeek(anchor)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return { start, end }
}

function rangeLabel(view, anchor) {
  if (view === 'dia') {
    const label = anchor.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })
    return label.charAt(0).toUpperCase() + label.slice(1)
  }
  if (view === 'mes') {
    const label = anchor.toLocaleDateString('es', { month: 'long', year: 'numeric' })
    return label.charAt(0).toUpperCase() + label.slice(1)
  }
  const { start, end } = rangeFor('semana', anchor)
  const last = new Date(end)
  last.setDate(last.getDate() - 1)
  return `${start.toLocaleDateString('es', { day: 'numeric', month: 'short' })} – ${last.toLocaleDateString('es', { day: 'numeric', month: 'short' })}`
}

function shiftAnchor(view, anchor, delta) {
  const d = new Date(anchor)
  if (view === 'dia') d.setDate(d.getDate() + delta)
  else if (view === 'mes') d.setMonth(d.getMonth() + delta)
  else d.setDate(d.getDate() + delta * 7)
  return d
}

function formatDayLabel(date) {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  if (date.toDateString() === today.toDateString()) return 'Hoy'
  if (date.toDateString() === tomorrow.toDateString()) return 'Mañana'
  const label = date.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function groupByDay(events) {
  const groups = new Map()
  for (const event of events) {
    const key = new Date(event.start).toDateString()
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(event)
  }
  return [...groups.entries()].map(([key, items]) => ({ date: new Date(key), items }))
}

function ConnectCTA({ onConnect, headline, sublabel }) {
  return (
    <div className="ador-glass ador-grain flex flex-col items-center gap-5 rounded-[24px] px-8 py-20 text-center">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full text-[#F4EEE2]"
        style={{ backgroundColor: 'rgba(244,238,226,0.1)', border: '1px solid rgba(244,238,226,0.25)', animation: 'ador-pulse 3s ease-in-out infinite' }}
      >
        <CalendarIcon size={24} />
      </div>
      <div>
        <p className="text-[16px] font-medium text-[#F5F5F5]">{headline}</p>
        <p className="mt-1.5 max-w-[380px] text-[13px] font-light text-[#888888]">{sublabel}</p>
      </div>
      {onConnect && (
        <button type="button" onClick={onConnect} className="ador-btn-primary rounded-full px-5 py-2.5 text-[13px] font-medium">
          Conectar con Google Calendar
        </button>
      )}
    </div>
  )
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="ador-skeleton h-16 rounded-2xl" />
      ))}
    </div>
  )
}

function AgendaView({ events, onOpenEvent }) {
  const days = groupByDay(events)
  if (days.length === 0) {
    return (
      <div className="ador-glass ador-grain flex items-center gap-2.5 rounded-2xl px-5 py-8">
        <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#4CAF50]" style={{ animation: 'ador-pulse 2.5s ease-in-out infinite' }} />
        <p className="text-[13px] text-[#888888]">Nada en tu calendario para los próximos 30 días.</p>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-4">
      {days.map(({ date, items }) => (
        <div key={date.toISOString()} className="ador-glass ador-grain overflow-hidden rounded-2xl">
          <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-3">
            <ArrowRightIcon size={11} className="text-[#8A8A8A]" />
            <span className="text-[13px] font-semibold text-[#F5F5F5]">{formatDayLabel(date)}</span>
          </div>
          <div className="flex flex-col divide-y divide-white/[0.04] px-3 py-2">
            {items.map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => onOpenEvent(event)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-150 hover:bg-white/[0.035]"
              >
                <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: eventColor(event) }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium text-[#F5F5F5]">{event.title}</p>
                  {event.location && <p className="mt-0.5 truncate text-[11px] text-[#8A8A8A]">{event.location}</p>}
                </div>
                <span className="flex-shrink-0 text-[12px] text-[#888888]">
                  {event.allDay ? 'Todo el día' : `${new Date(event.start).toLocaleTimeString('es', { hour: 'numeric', minute: '2-digit' })} – ${new Date(event.end).toLocaleTimeString('es', { hour: 'numeric', minute: '2-digit' })}`}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function actorNameFor(user) {
  return user?.displayName || user?.email?.split('@')[0] || 'Usuario'
}

function PermissionPrompt({ onConnect, onClose }) {
  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-6 backdrop-blur-[10px]" onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={SPRING} onClick={(e) => e.stopPropagation()} className="w-full max-w-[420px]">
        <div className="ador-modal-surface ador-grain rounded-[28px] p-7">
          <h2 className="text-[17px] font-semibold text-[#F5F5F5]">Permiso para crear y editar</h2>
          <p className="mt-2.5 text-[13.5px] leading-relaxed text-[#9A9A9A]">
            Hasta ahora ADOR OS solo podía ver tu calendario. Para crear, mover y borrar eventos desde aquí, Google necesita que lo autorices una vez más.
            Solo toca los <span className="text-[#D0D0D0]">eventos</span> de tu calendario, nada más, y no se envía ni cambia nada sin que lo pidas.
          </p>
          <p className="mt-3 text-[12px] leading-relaxed text-[#8A8A8A]">En la pantalla de Google verás "no ha verificado esta app": pulsa <span className="text-[#D0D0D0]">Avanzado</span> y continúa, y deja marcado el permiso de ver y editar eventos.</p>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-[13px] text-[#888888] hover:text-[#F5F5F5]">Ahora no</button>
            <button type="button" onClick={onConnect} className="ador-btn-primary rounded-xl px-5 py-2.5 text-[13px] font-semibold">Dar permiso con Google</button>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}

const nextRoundHour = () => { const d = new Date(); d.setMinutes(0, 0, 0); d.setHours(d.getHours() + 1); return d }

export default function CalendarioModule({ user }) {
  const { configured, status, connectedEmail, events, error, connect, disconnect, refresh, loadRange, canWrite, createEvent, updateEvent, deleteEvent } = useGoogleCalendar(user?.uid)
  const showToast = useToast()
  const [editor, setEditor] = useState(null) // { event } | { draft }
  const [saving, setSaving] = useState(false)
  const [needPermission, setNeedPermission] = useState(false)
  const [quick, setQuick] = useState('')
  const quickRef = useRef(null)
  const [view, setView] = useState('semana')
  const [anchor, setAnchor] = useState(new Date())
  const [tasks, setTasks] = useState([])
  const [openEvent, setOpenEvent] = useState(null)
  const actorName = actorNameFor(user)
  const phone = usePhone()
  const [phoneMonth, setPhoneMonth] = useState(false)

  useEffect(() => {
    if (status === 'ready' || status === 'loading') loadRange(rangeFor(view, anchor))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, anchor])

  // Owned here, not inside each rail card, so both the grid (tasks shown
  // alongside events by due date) and the right rail's "Tareas de hoy"
  // read the exact same live subscription instead of opening two.
  useEffect(() => {
    if (!user?.uid || user.uid === 'preview') return
    return subscribeTasksForUser(user.uid, setTasks)
  }, [user?.uid])

  // Atajos (escritorio): T hoy · D/S/M/A vista · ← → anterior/siguiente.
  useEffect(() => {
    if (phone) return
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable) return
      const k = e.key.toLowerCase()
      if (k === 'c') { e.preventDefault(); openCreate() }
      else if (k === '/') { e.preventDefault(); quickRef.current?.focus() }
      else if (k === 't') setAnchor(new Date())
      else if (k === 'd') setView('dia')
      else if (k === 's') setView('semana')
      else if (k === 'm') setView('mes')
      else if (k === 'a') setView('agenda')
      else if (k === 'arrowleft') setAnchor((a) => shiftAnchor(view, a, -1))
      else if (k === 'arrowright') setAnchor((a) => shiftAnchor(view, a, 1))
      else return
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phone, view, canWrite])

  const goToday = () => setAnchor(new Date())
  const goPrev = () => setAnchor((a) => shiftAnchor(view, a, -1))
  const goNext = () => setAnchor((a) => shiftAnchor(view, a, 1))
  const openDay = (day) => {
    setAnchor(day)
    setView('dia')
  }

  // Mantiene abierto el detalle al día con los cambios (p. ej. tu respuesta a una invitación).
  useEffect(() => {
    if (!openEvent) return
    const fresh = events.find((e) => e.id === openEvent.id)
    if (fresh && fresh !== openEvent) setOpenEvent(fresh)
  }, [events])

  const requireWrite = (fn) => (canWrite ? fn() : setNeedPermission(true))
  const openCreate = (draft = {}) => requireWrite(() => { setOpenEvent(null); setEditor({ draft: { start: nextRoundHour(), end: new Date(nextRoundHour().getTime() + 3600000), ...draft } }) })
  const openEdit = (event) => requireWrite(() => { setOpenEvent(null); setEditor({ event }) })
  const fail = (e) => showToast(`No se pudo guardar en Google Calendar: ${e.message}`, { tone: 'error' })

  const saveEditor = async (payload) => {
    setSaving(true)
    try {
      const body = buildEventBody(payload)
      if (editor.event) {
        if (!payload.meet) delete body.conferenceData
        await updateEvent(editor.event.id, body, { notify: payload.notify })
        showToast('Cambios guardados en tu calendario.')
      } else {
        const created = await createEvent(body, { notify: payload.notify })
        showToast(payload.notify ? 'Evento creado e invitaciones enviadas.' : 'Evento creado.')
        if (created?.id) registerUndo('Evento creado', () => deleteEvent(created.id, { notify: payload.notify }))
      }
      setEditor(null)
    } catch (e) {
      fail(e)
    } finally {
      setSaving(false)
    }
  }

  const removeEvent = async (event) => {
    const others = (event.attendees || []).some((a) => !a.self)
    try {
      await deleteEvent(event.id, { notify: others })
      setEditor(null)
      setOpenEvent(null)
      registerUndo(`Evento «${event.title}» eliminado`, () =>
        createEvent(buildEventBody({ title: event.title, allDay: event.allDay, start: new Date(event.start), end: event.allDay ? new Date(new Date(event.end).getTime() - 86400000) : new Date(event.end), location: event.location, description: event.description, colorId: event.colorId, guests: (event.attendees || []).filter((a) => !a.self).map((a) => ({ email: a.email })) }), { notify: false })
      )
    } catch (e) {
      fail(e)
    }
  }

  // Arrastrar un evento (mover) o su borde inferior (cambiar duración) en la cuadrícula.
  const moveEvent = async (event, start, end) => {
    const oldStart = new Date(event.start), oldEnd = new Date(event.end)
    const patch = { start: { dateTime: start.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }, end: { dateTime: end.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone } }
    const guests = (event.attendees || []).some((a) => !a.self)
    try {
      await updateEvent(event.id, patch, { notify: false })
      registerUndo(guests ? 'Evento movido (no se avisó a los invitados)' : 'Evento movido', () =>
        updateEvent(event.id, { start: { dateTime: oldStart.toISOString() }, end: { dateTime: oldEnd.toISOString() } }, { notify: false })
      )
    } catch (e) {
      fail(e)
    }
  }

  const respond = async (event, status) => {
    const attendees = (event.attendees || []).map((a) => (a.self ? { email: a.email, self: true, responseStatus: status } : { email: a.email, responseStatus: a.status }))
    try {
      await updateEvent(event.id, { attendees }, { notify: true })
      showToast(status === 'accepted' ? 'Respondiste que vas.' : status === 'declined' ? 'Respondiste que no vas.' : 'Respondiste «tal vez».')
    } catch (e) {
      fail(e)
    }
  }

  const submitQuick = (e) => {
    e.preventDefault()
    if (!quick.trim()) return
    const r = parseQuickEvent(quick)
    setQuick('')
    openCreate({ title: r.title, start: r.start, end: r.end, guests: r.guests, meet: r.meet })
  }

  const connected = status === 'ready' || status === 'loading'
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = startOfWeek(anchor)
    d.setDate(d.getDate() + i)
    return d
  })

  if (phone && (status === 'ready' || status === 'loading')) {
    return (
      <div className="mx-auto w-full max-w-[640px] px-4 pb-16 pt-6">
        <h1 className="ador-title mb-5">Calendario</h1>
        {phoneMonth ? (
          <div className="flex flex-col gap-4">
            <button type="button" onClick={() => setPhoneMonth(false)} className="self-start rounded-full bg-[#1C1C1E] px-4 py-2 text-[13.5px] text-[#F5F5F5]">← Volver a la semana</button>
            <MonthGrid monthDate={anchor} events={events} tasks={tasks} onSelectDay={(d) => { setAnchor(d); setView('semana'); setPhoneMonth(false) }} onOpenEvent={setOpenEvent} />
          </div>
        ) : (
          <PhoneCalendar uid={user?.uid} anchor={anchor} setAnchor={setAnchor} events={events} tasks={tasks} actorName={actorName} onOpenEvent={setOpenEvent} onMonth={() => { setView('mes'); setPhoneMonth(true) }} />
        )}
        <AnimatePresence>{openEvent && <EventDetailModal event={openEvent} uid={user?.uid} onClose={() => setOpenEvent(null)} />}</AnimatePresence>
      </div>
    )
  }

  return (
    <motion.div
      initial={false}
      className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-4 pb-16 pt-6 md:px-8 lg:px-12 lg:pt-10"
    >
      <div className="flex items-start justify-between gap-6">
        <div>
          <span className="block text-[11px] font-medium tracking-[0.04em] text-[#8A8A8A] first-letter:uppercase">{new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          <h1 className="ador-title">Calendario</h1>
          <p className="mt-0.5 text-[13px] text-[#888888]">
            {connectedEmail ? `Reflejo de tu Google Calendar — conectado como ${connectedEmail}` : 'Tu tiempo también es una decisión.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p className="hidden max-w-[220px] text-right text-[12px] italic leading-relaxed text-[#8A8A8A] lg:block">
            "{dailyQuote()}"
            <span className="mt-1 block text-[11px] not-italic text-[#8A8A8A]">— ADOR OS</span>
          </p>
          <button
            type="button"
            onClick={() => openCreate()}
            title="Crear un evento (C)"
            className="ador-btn-primary flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-5 py-2.5 text-[13px] font-semibold"
          >
            <PlusIcon size={14} /> Nuevo evento
          </button>
        </div>
      </div>

      {connected && <CalendarioGreeting user={user} events={events} tasks={tasks} />}

      {connected && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button type="button" onClick={goPrev} aria-label="Anterior" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.07] text-[#F5F5F5] transition-colors duration-150 hover:bg-white/[0.13]">
              <ArrowLeftIcon size={13} />
            </button>
            <button type="button" onClick={goNext} aria-label="Siguiente" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.07] text-[#F5F5F5] transition-colors duration-150 hover:bg-white/[0.13]">
              <ArrowRightIcon size={13} />
            </button>
            <span className="mx-2 text-[24px] font-semibold capitalize leading-none tracking-[-0.02em] text-[#F5F5F5]">{rangeLabel(view, anchor)}</span>
            <button type="button" title="Ir a hoy (T)" onClick={goToday} className="rounded-full bg-white/[0.07] px-4 py-2 text-[12.5px] font-medium text-[#F5F5F5] transition-colors duration-150 hover:bg-white/[0.13]">
              Hoy
            </button>
            {connected && (
              <form onSubmit={submitQuick} className="ml-3 hidden items-center lg:flex">
                <input
                  ref={quickRef}
                  value={quick}
                  onChange={(e) => setQuick(e.target.value)}
                  placeholder="Crear: «Cena con Leo viernes 8pm»  ( / )"
                  title="Escribe el evento tal como lo dirías y pulsa Enter: se abre listo para confirmar"
                  className="w-[300px] rounded-full bg-white/[0.06] px-4 py-2 text-[12.5px] text-[#F5F5F5] placeholder:text-[#767676] outline-none ring-1 ring-transparent transition focus:bg-white/[0.09] focus:ring-white/[0.18]"
                />
              </form>
            )}
          </div>

          <div className="flex items-center gap-1">
            <div className="ador-glass flex items-center gap-1 rounded-full p-1">
              {VIEWS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  title={`${v.label} (${{ dia: 'D', semana: 'S', mes: 'M', agenda: 'A' }[v.id]})`}
                  onClick={() => setView(v.id)}
                  className="relative rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors duration-150"
                  style={{ color: view === v.id ? '#0A0A0A' : '#888888' }}
                >
                  {view === v.id && (
                    <motion.div
                      layoutId="calendario-view-indicator"
                      className="absolute inset-0 rounded-full"
                      style={{ background: '#F5F5F5' }}
                      transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                    />
                  )}
                  <span className="relative">{v.label}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={disconnect}
              className="ml-2 flex flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] text-[#767676] transition-colors duration-150 hover:text-[#F5F5F5]"
            >
              <CloseIcon size={11} /> Desconectar
            </button>
          </div>
        </div>
      )}

      {!configured ? (
        <ConnectCTA headline="Google Calendar todavía no está configurado" sublabel="Falta terminar la conexión en Google Cloud (una sola vez) antes de poder usarlo aquí." />
      ) : status === 'checking' ? (
        <Skeleton />
      ) : status === 'connecting' ? (
        <ConnectCTA headline="Conectando con Google…" sublabel="Un momento mientras confirmamos el acceso a tu calendario." />
      ) : status === 'disconnected' ? (
        <ConnectCTA onConnect={connect} headline="Conecta tu Google Calendar" sublabel="Solo lectura — ADOR OS nunca crea, edita ni borra nada en tu calendario real. Cada socio conecta su propia cuenta." />
      ) : status === 'needsReconnect' ? (
        <ConnectCTA onConnect={connect} headline="Tu conexión venció" sublabel="Mientras esté en modo de prueba, Google pide reconectar cada 7 días — es normal, no un error." />
      ) : status === 'error' ? (
        <ConnectCTA onConnect={() => refresh(rangeFor(view, anchor))} headline="No se pudo cargar tu calendario" sublabel={error || 'Intenta de nuevo en un momento.'} />
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_300px]">
          <div className="min-w-0">
            {status === 'loading' ? (
              <Skeleton />
            ) : view === 'semana' ? (
              <CalendarioGrid days={weekDays} events={events} tasks={tasks} actorName={actorName} onOpenEvent={setOpenEvent} canWrite={canWrite} onCreateRange={(st, en) => openCreate({ start: st, end: en })} onMoveEvent={moveEvent} onNeedPermission={() => setNeedPermission(true)} />
            ) : view === 'dia' ? (
              <CalendarioGrid days={[anchor]} events={events} tasks={tasks} actorName={actorName} onOpenEvent={setOpenEvent} canWrite={canWrite} onCreateRange={(st, en) => openCreate({ start: st, end: en })} onMoveEvent={moveEvent} onNeedPermission={() => setNeedPermission(true)} />
            ) : view === 'mes' ? (
              <MonthGrid monthDate={anchor} events={events} tasks={tasks} onSelectDay={openDay} onOpenEvent={setOpenEvent} />
            ) : (
              <AgendaView events={events} onOpenEvent={setOpenEvent} />
            )}
          </div>
          <div className="flex flex-col gap-4">
            <MiniMonthCalendar anchorDate={anchor} onSelectDay={openDay} events={events} />
            <DayAgenda uid={user?.uid} anchor={anchor} events={events} tasks={tasks} actorName={actorName} onOpenEvent={setOpenEvent} />
          </div>
        </div>
      )}

      <AnimatePresence>{openEvent && <EventDetailModal event={openEvent} uid={user?.uid} onClose={() => setOpenEvent(null)} onEdit={openEdit} onRespond={canWrite ? respond : null} />}</AnimatePresence>
      <AnimatePresence>{editor && <EventEditorModal event={editor.event} draft={editor.draft} busy={saving} onSave={saveEditor} onDelete={removeEvent} onClose={() => setEditor(null)} />}</AnimatePresence>
      <AnimatePresence>{needPermission && <PermissionPrompt onConnect={connect} onClose={() => setNeedPermission(false)} />}</AnimatePresence>
    </motion.div>
  )
}
