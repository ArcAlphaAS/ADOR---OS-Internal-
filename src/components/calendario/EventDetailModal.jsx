import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { eventColor } from '../../lib/googleCalendar'
import { ArrowRightIcon } from '../icons'

// Quick-view for a Google Calendar event — clicking an event used to always
// open a new tab to Google Calendar, which yanked you out of ADOR OS for
// even a one-line glance. Shows everything the API already gives us
// (description, location, attendees), with "Abrir en Google Calendar" as
// an explicit secondary action instead of the default one. Same portal +
// transform-split modal pattern as every other centered modal in this app
// (CLAUDE.md §11 — never combine a transform-animated wrapper with the
// .ador-modal-surface element itself, or the backdrop blur silently breaks).
export default function EventDetailModal({ event, onClose }) {
  if (!event) return null
  const color = eventColor(event)
  const start = new Date(event.start)
  const end = new Date(event.end)
  const fmtTime = (d) => d.toLocaleTimeString('es', { hour: 'numeric', minute: '2-digit' })
  const fmtDate = (d) => {
    const label = d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })
    return label.charAt(0).toUpperCase() + label.slice(1)
  }
  const guests = (event.attendees || []).filter((a) => !a.self)

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[10px]"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ador-modal-surface ador-grain w-[420px] max-w-[90vw] rounded-[28px] p-7">
          <div className="flex items-start gap-3">
            <span className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: color }} />
            <div className="min-w-0">
              <h2 className="text-[16px] font-semibold leading-snug text-[#F5F5F5]">{event.title}</h2>
              <p className="mt-1 text-[13px] text-[#888888]">
                {fmtDate(start)}
                {!event.allDay && (
                  <>
                    {' · '}
                    {fmtTime(start)} – {fmtTime(end)}
                  </>
                )}
                {event.allDay && ' · Todo el día'}
              </p>
            </div>
          </div>

          {event.location && (
            <p className="mt-4 text-[13px] text-[#CCCCCC]">
              <span className="text-[#666666]">Ubicación — </span>
              {event.location}
            </p>
          )}

          {event.description && (
            <p className="mt-4 whitespace-pre-wrap text-[13px] leading-relaxed text-[#CCCCCC]">{event.description}</p>
          )}

          {guests.length > 0 && (
            <div className="mt-4">
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-[#666666]">
                Invitados ({guests.length})
              </p>
              <div className="flex flex-col gap-1">
                {guests.slice(0, 6).map((g) => (
                  <p key={g.email} className="truncate text-[12.5px] text-[#CCCCCC]">
                    {g.name}
                    {g.organizer && <span className="ml-1.5 text-[10px] text-[#666666]">organiza</span>}
                  </p>
                ))}
                {guests.length > 6 && <p className="text-[12px] text-[#666666]">+{guests.length - 6} más</p>}
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-[13px] text-[#888888] transition-colors hover:text-[#F5F5F5]">
              Cerrar
            </button>
            <a
              href={event.htmlLink}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-[13px] font-medium text-[#1E5FAD] transition-colors hover:bg-[#1E5FAD]/10"
            >
              Abrir en Google Calendar <ArrowRightIcon size={13} />
            </a>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}
