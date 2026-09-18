import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useGoogleCalendar } from '../../hooks/useGoogleCalendar'
import { dailyQuote } from '../../lib/workspace'
import { eventColor } from '../../lib/googleCalendar'
import { CalendarIcon, ArrowRightIcon, ArrowLeftIcon, CloseIcon, PlusIcon } from '../icons'
import CalendarioGrid from './CalendarioGrid'
import MonthGrid from './MonthGrid'
import { MiniMonthCalendar, TodayCard, TasksTodayCard } from './CalendarioRightRail'
import CalendarioGreeting from './CalendarioGreeting'

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
        className="flex h-14 w-14 items-center justify-center rounded-full text-[#1E5FAD]"
        style={{ backgroundColor: 'rgba(30,95,173,0.1)', border: '1px solid rgba(30,95,173,0.25)', animation: 'ador-pulse 3s ease-in-out infinite' }}
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

function AgendaView({ events }) {
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
            <ArrowRightIcon size={11} className="text-[#444444]" />
            <span className="text-[13px] font-semibold text-[#F5F5F5]">{formatDayLabel(date)}</span>
          </div>
          <div className="flex flex-col divide-y divide-white/[0.04] px-3 py-2">
            {items.map((event) => (
              <a
                key={event.id}
                href={event.htmlLink}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-150 hover:bg-white/[0.035]"
              >
                <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: eventColor(event) }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium text-[#F5F5F5]">{event.title}</p>
                  {event.location && <p className="mt-0.5 truncate text-[11px] text-[#666666]">{event.location}</p>}
                </div>
                <span className="flex-shrink-0 text-[12px] text-[#888888]">
                  {event.allDay ? 'Todo el día' : `${new Date(event.start).toLocaleTimeString('es', { hour: 'numeric', minute: '2-digit' })} – ${new Date(event.end).toLocaleTimeString('es', { hour: 'numeric', minute: '2-digit' })}`}
                </span>
              </a>
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

export default function CalendarioModule({ user }) {
  const { configured, status, connectedEmail, events, error, connect, disconnect, refresh, loadRange } = useGoogleCalendar(user?.uid)
  const [view, setView] = useState('semana')
  const [anchor, setAnchor] = useState(new Date())

  useEffect(() => {
    if (status === 'ready' || status === 'loading') loadRange(rangeFor(view, anchor))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, anchor])

  const goToday = () => setAnchor(new Date())
  const goPrev = () => setAnchor((a) => shiftAnchor(view, a, -1))
  const goNext = () => setAnchor((a) => shiftAnchor(view, a, 1))
  const openDay = (day) => {
    setAnchor(day)
    setView('dia')
  }

  const connected = status === 'ready' || status === 'loading'
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = startOfWeek(anchor)
    d.setDate(d.getDate() + i)
    return d
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-10 pb-16 pt-12"
    >
      <div className="flex items-start justify-between gap-6">
        <div>
          <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#444444]">Calendario</span>
          <h1 className="text-[30px] font-semibold tracking-[-0.02em] text-[#F5F5F5]">Calendario</h1>
          <p className="mt-0.5 text-[13px] text-[#888888]">
            {connectedEmail ? `Reflejo de tu Google Calendar — conectado como ${connectedEmail}` : 'Tu tiempo también es una decisión.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p className="hidden max-w-[220px] text-right text-[12px] italic leading-relaxed text-[#666666] lg:block">
            "{dailyQuote()}"
            <span className="mt-1 block text-[11px] not-italic text-[#444444]">— ADOR OS</span>
          </p>
          <button
            type="button"
            disabled
            title="Solo lectura por ahora — crear eventos necesita un permiso de Google distinto, todavía no habilitado"
            className="ador-btn-primary flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2.5 text-[13px] font-medium opacity-40"
          >
            <PlusIcon size={14} /> Nuevo evento
          </button>
        </div>
      </div>

      {connected && <CalendarioGreeting user={user} events={events} />}

      {connected && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button type="button" onClick={goToday} className="rounded-full border border-white/[0.1] px-3 py-1.5 text-[12px] font-medium text-[#F5F5F5] transition-colors duration-150 hover:border-white/[0.2]">
              Hoy
            </button>
            <button type="button" onClick={goPrev} className="flex h-8 w-8 items-center justify-center rounded-full text-[#888888] transition-colors duration-150 hover:bg-white/[0.08] hover:text-[#F5F5F5]">
              <ArrowLeftIcon size={13} />
            </button>
            <button type="button" onClick={goNext} className="flex h-8 w-8 items-center justify-center rounded-full text-[#888888] transition-colors duration-150 hover:bg-white/[0.08] hover:text-[#F5F5F5]">
              <ArrowRightIcon size={13} />
            </button>
            <span className="ml-1 text-[14px] font-medium capitalize text-[#F5F5F5]">{rangeLabel(view, anchor)}</span>
          </div>

          <div className="flex items-center gap-1">
            <div className="ador-glass flex items-center gap-1 rounded-full p-1">
              {VIEWS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setView(v.id)}
                  className="relative rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors duration-150"
                  style={{ color: view === v.id ? '#F5F5F5' : '#888888' }}
                >
                  {view === v.id && (
                    <motion.div
                      layoutId="calendario-view-indicator"
                      className="absolute inset-0 rounded-full"
                      style={{ background: '#1E5FAD' }}
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
              className="ml-2 flex flex-shrink-0 items-center gap-1.5 rounded-full border border-white/[0.1] px-3 py-1.5 text-[11px] text-[#888888] transition-colors duration-150 hover:border-white/[0.2] hover:text-[#F5F5F5]"
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
              <CalendarioGrid days={weekDays} events={events} />
            ) : view === 'dia' ? (
              <CalendarioGrid days={[anchor]} events={events} />
            ) : view === 'mes' ? (
              <MonthGrid monthDate={anchor} events={events} onSelectDay={openDay} />
            ) : (
              <AgendaView events={events} />
            )}
          </div>
          <div className="flex flex-col gap-4">
            <MiniMonthCalendar anchorDate={anchor} onSelectDay={openDay} />
            <TodayCard events={events} onOpenDay={openDay} />
            <TasksTodayCard userId={user?.uid} actorName={actorNameFor(user)} />
          </div>
        </div>
      )}
    </motion.div>
  )
}
