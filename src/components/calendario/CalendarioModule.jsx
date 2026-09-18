import { motion } from 'framer-motion'
import { useGoogleCalendar } from '../../hooks/useGoogleCalendar'
import { CalendarIcon, ArrowRightIcon, CloseIcon } from '../icons'

// A read-only "reflejo" of the signed-in founder's own Google Calendar —
// per direct user decision, not a combined team view (Google Calendar
// itself already merges invited events into each person's own calendar, so
// a per-person connection is enough) and not read/write (a lighter Google
// scope with a real path to a persistent connection later — see
// lib/googleCalendar.js's file header for the full reasoning). This is a
// functional first pass; a more elaborate visual design is a deliberate
// follow-up, not done here.

function formatDayLabel(date) {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  if (date.toDateString() === today.toDateString()) return 'Hoy'
  if (date.toDateString() === tomorrow.toDateString()) return 'Mañana'
  const label = date.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function formatTimeRange(event) {
  if (event.allDay) return 'Todo el día'
  const start = new Date(event.start)
  const end = new Date(event.end)
  const fmt = (d) => d.toLocaleTimeString('es', { hour: 'numeric', minute: '2-digit' })
  return `${fmt(start)} – ${fmt(end)}`
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

function EventRow({ event }) {
  return (
    <a
      href={event.htmlLink}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors duration-150 hover:bg-white/[0.035]"
    >
      <div className="min-w-0">
        <p className="truncate text-[13.5px] font-medium text-[#F5F5F5]">{event.title}</p>
        {event.location && <p className="mt-0.5 truncate text-[11px] text-[#666666]">{event.location}</p>}
      </div>
      <span className="flex-shrink-0 text-[12px] text-[#888888]">{formatTimeRange(event)}</span>
    </a>
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

export default function CalendarioModule({ user }) {
  const { configured, status, connectedEmail, events, error, connect, disconnect, refresh } = useGoogleCalendar(user?.uid)
  const days = groupByDay(events)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="mx-auto flex w-full max-w-[720px] flex-col gap-6 px-12 pb-16 pt-16"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-[#F5F5F5]">Calendario</h1>
          <p className="text-[13px] text-[#888888]">
            {connectedEmail ? `Reflejo de tu Google Calendar — conectado como ${connectedEmail}` : 'Un reflejo de solo lectura de tu Google Calendar.'}
          </p>
        </div>
        {status === 'ready' && (
          <button
            type="button"
            onClick={disconnect}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-white/[0.1] px-3 py-1.5 text-[11px] text-[#888888] transition-colors duration-150 hover:border-white/[0.2] hover:text-[#F5F5F5]"
          >
            <CloseIcon size={11} /> Desconectar
          </button>
        )}
      </div>

      {!configured ? (
        <ConnectCTA
          headline="Google Calendar todavía no está configurado"
          sublabel="Falta terminar la conexión en Google Cloud (una sola vez) antes de poder usarlo aquí."
        />
      ) : status === 'checking' ? (
        <Skeleton />
      ) : status === 'connecting' ? (
        <ConnectCTA headline="Conectando con Google…" sublabel="Un momento mientras confirmamos el acceso a tu calendario." />
      ) : status === 'disconnected' ? (
        <ConnectCTA
          onConnect={connect}
          headline="Conecta tu Google Calendar"
          sublabel="Solo lectura — ADOR OS nunca crea, edita ni borra nada en tu calendario real. Cada socio conecta su propia cuenta."
        />
      ) : status === 'needsReconnect' ? (
        <ConnectCTA
          onConnect={connect}
          headline="Tu conexión venció"
          sublabel="Mientras esté en modo de prueba, Google pide reconectar cada 7 días — es normal, no un error."
        />
      ) : status === 'error' ? (
        <ConnectCTA
          onConnect={refresh}
          headline="No se pudo cargar tu calendario"
          sublabel={error || 'Intenta de nuevo en un momento.'}
        />
      ) : status === 'loading' ? (
        <Skeleton />
      ) : days.length === 0 ? (
        <div className="ador-glass ador-grain flex items-center gap-2.5 rounded-2xl px-5 py-8">
          <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#4CAF50]" style={{ animation: 'ador-pulse 2.5s ease-in-out infinite' }} />
          <p className="text-[13px] text-[#888888]">Nada en tu calendario para los próximos 14 días.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {days.map(({ date, items }) => (
            <div key={date.toISOString()} className="ador-glass ador-grain overflow-hidden rounded-2xl">
              <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-3">
                <ArrowRightIcon size={11} className="text-[#444444]" />
                <span className="text-[13px] font-semibold text-[#F5F5F5]">{formatDayLabel(date)}</span>
              </div>
              <div className="flex flex-col divide-y divide-white/[0.04] px-3 py-2">
                {items.map((event) => (
                  <EventRow key={event.id} event={event} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
