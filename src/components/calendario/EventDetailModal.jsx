import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { eventColor } from '../../lib/googleCalendar'
import { VideoIcon } from '../icons'
import { SPRING } from '../../lib/motion'
import { useEscape } from '../../hooks/useEscape'
import { useGoogleMeet } from '../../hooks/useGoogleMeet'
import usePhone from '../../hooks/usePhone'
import { useSheetDrag } from '../../hooks/useSheetDrag'
import { useToast } from '../../hooks/useToast'
import Avatar from '../shell/Avatar'

// Detalle de un evento de tu Google Calendar, pensado como la hoja de una app
// de calendario: título y hora, tres acciones rápidas, la información, los
// participantes con su respuesta y, abajo, un botón grande. Si la reunión ya
// trae su enlace de Google Meet, "Unirse a Meet" lo abre; si no, puedes
// crear una sala de Meet al momento (la misma conexión que usa Comunicación).
// Mismo patrón de portal + envoltorio con transform separado del vidrio de
// siempre (CLAUDE.md §11). En teléfono el CSS global lo vuelve hoja inferior.
const RESPONSE = {
  accepted: { label: 'Aceptó', color: '#4CAF50' },
  declined: { label: 'Rechazó', color: '#EF5350' },
  tentative: { label: 'Tal vez', color: '#E8C15A' },
  needsAction: { label: 'Sin responder', color: '#8E8E93' },
}

const sv = (d) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{d}</svg>

function Tile({ icon, label, sub, tint, onClick, href }) {
  const C = href ? 'a' : 'button'
  return (
    <C {...(href ? { href, target: '_blank', rel: 'noreferrer' } : { type: 'button', onClick })} className="flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-[18px] bg-white/[0.06] px-2 py-3.5 text-center" style={tint ? { background: `${tint}1f`, color: tint } : undefined}>
      <span className="flex h-6 items-center">{icon}</span>
      <span className="text-[12.5px] font-medium" style={{ color: tint || '#F5F5F5' }}>{label}</span>
      {sub && <span className="-mt-1 text-[11px] text-[#8E8E93]">{sub}</span>}
    </C>
  )
}

export default function EventDetailModal({ event, uid, onClose, onEdit, onRespond }) {
  useEscape(onClose)
  const phone = usePhone()
  const sheet = useSheetDrag(onClose, phone)
  const showToast = useToast()
  const meet = useGoogleMeet(uid)
  const [room, setRoom] = useState(null)
  const [creating, setCreating] = useState(false)
  if (!event) return null

  const color = eventColor(event)
  const start = new Date(event.start)
  const end = new Date(event.end)
  const fmtTime = (d) => d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false })
  const fmtDate = (d) => {
    const label = d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })
    return label.charAt(0).toUpperCase() + label.slice(1)
  }
  const everyone = event.attendees || []
  const me = everyone.find((a) => a.self)
  const mine = RESPONSE[me?.status] || null
  const link = event.meetLink || room
  const startsIn = start.getTime() - Date.now()
  const soon = !event.allDay && startsIn > 0 && startsIn < 6 * 3600000 ? (startsIn < 3600000 ? `en ${Math.max(1, Math.round(startsIn / 60000))} min` : `en ${Math.floor(startsIn / 3600000)} h ${Math.round((startsIn % 3600000) / 60000)} min`) : null
  const live = !event.allDay && start.getTime() <= Date.now() && end.getTime() > Date.now()

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link || event.htmlLink)
      showToast(link ? 'Enlace de Meet copiado' : 'Enlace del evento copiado')
    } catch {
      showToast('No se pudo copiar')
    }
  }
  const create = async () => {
    setCreating(true)
    try {
      setRoom(await meet.createRoom())
    } catch (error) {
      showToast(error.message || 'No se pudo crear la sala')
    } finally {
      setCreating(false)
    }
  }

  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-[10px]" style={{ opacity: sheet.backdrop }} />
      <motion.div initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }} transition={SPRING} onClick={(e) => e.stopPropagation()} className="relative">
        <motion.div ref={sheet.sheetRef} style={{ y: sheet.y }}>
        <div ref={sheet.scrollRef} className="ador-modal-surface ador-grain w-[440px] max-w-[92vw] rounded-[28px] p-7">
          <div className="flex items-start gap-3">
            <span className="mt-2 h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: color }} />
            <div className="min-w-0">
              <h2 className="text-[22px] font-semibold leading-tight tracking-[-0.01em] text-[#F5F5F5]">{event.title}</h2>
              <p className="mt-1 text-[14px] text-[#8E8E93]">
                {fmtDate(start)}{event.allDay ? ' · Todo el día' : ` · ${fmtTime(start)} – ${fmtTime(end)}`}
              </p>
              {(live || soon) && <p className="mt-1 text-[13px] font-medium" style={{ color: live ? '#E8C15A' : '#F4EEE2' }}>{live ? 'En curso ahora' : `Empieza ${soon}`}</p>}
            </div>
          </div>

          <div className="mt-5 flex gap-2.5">
            {mine ? (
              <Tile icon={sv(<path d="m5 12.5 4.5 4.5L19 7.5" />)} label={me.status === 'accepted' ? 'Aceptaste' : mine.label} sub="tu respuesta" tint={mine.color} onClick={() => {}} />
            ) : (
              <Tile icon={sv(<><circle cx="12" cy="12" r="8.5" /><path d="M12 8v4l2.5 1.5" /></>)} label={event.allDay ? 'Todo el día' : `${Math.max(1, Math.round((end - start) / 60000))} min`} sub="duración" onClick={() => {}} />
            )}
            <Tile icon={sv(<><rect x="8" y="8" width="12" height="12" rx="2.5" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>)} label="Copiar enlace" sub={link ? 'de Meet' : 'del evento'} onClick={copy} />
            <Tile icon={sv(<><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" /></>)} label="Calendar" sub="abrir en Google" href={event.htmlLink} />
          </div>

          {(event.location || event.description) && (
            <div className="mt-4 rounded-[20px] bg-white/[0.045] px-4 py-3.5">
              {event.location && (
                <p className="flex items-start gap-3 text-[14px] text-[#E4E4E4]">
                  <span className="mt-0.5 text-[#8E8E93]">{sv(<><path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></>)}</span>
                  {(() => {
                    const loc = event.location
                    const href = /^https?:\/\//i.test(loc) ? loc : /^discord\b/i.test(loc) ? null : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc)}`
                    return href
                      ? <a href={href} target="_blank" rel="noreferrer" className="min-w-0 [overflow-wrap:anywhere] underline-offset-2 hover:underline">{loc}</a>
                      : <span className="min-w-0 [overflow-wrap:anywhere]">{loc}</span>
                  })()}
                </p>
              )}
              {event.description && <p className={`whitespace-pre-wrap [overflow-wrap:anywhere] text-[13.5px] leading-relaxed text-[#B8B8B8] ${event.location ? 'mt-3 border-t border-white/[0.07] pt-3' : ''}`}>{event.description}</p>}
            </div>
          )}

          {me && !me.organizer && onRespond && (
            <div className="mt-4 flex items-center gap-2">
              <span className="mr-1 text-[12.5px] text-[#8E8E93]">¿Vas?</span>
              {[['accepted', 'Sí'], ['tentative', 'Tal vez'], ['declined', 'No']].map(([st, lbl]) => (
                <button key={st} type="button" onClick={() => onRespond(event, st)} className="rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors" style={{ background: me.status === st ? RESPONSE[st].color : 'rgba(255,255,255,0.07)', color: me.status === st ? '#0A0A0A' : '#F5F5F5' }}>{lbl}</button>
              ))}
            </div>
          )}

          {everyone.length > 0 && (
            <div className="mt-4 rounded-[20px] bg-white/[0.045] px-4 py-3.5">
              <p className="mb-2 text-[12.5px] font-medium text-[#8E8E93]">Participantes · {everyone.length}</p>
              <ul className="flex flex-col gap-2.5">
                {everyone.slice(0, 8).map((g) => {
                  const r = RESPONSE[g.status] || RESPONSE.needsAction
                  return (
                    <li key={g.email} className="flex items-center gap-3">
                      <Avatar displayName={g.name} email={g.email} size={32} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] text-[#F0F0F0]">{g.self ? 'Tú' : g.name}</span>
                        {g.organizer && <span className="block text-[11.5px] text-[#8E8E93]">Organizador</span>}
                      </span>
                      <span className="flex-shrink-0 text-[12px] font-medium" style={{ color: r.color }}>{r.label}</span>
                    </li>
                  )
                })}
                {everyone.length > 8 && <li className="text-[12.5px] text-[#8E8E93]">+{everyone.length - 8} más</li>}
              </ul>
            </div>
          )}

          <div className="sticky bottom-0 -mb-1 mt-6 flex items-center gap-2.5 bg-[#1C1C1E] pb-1 pt-2 md:bg-transparent">
            <button type="button" onClick={onClose} className="rounded-full px-4 py-3.5 text-[14px] text-[#8E8E93]">Cerrar</button>
            {event.canEdit && onEdit && (
              <button type="button" onClick={() => onEdit(event)} className="rounded-full bg-white/[0.08] px-5 py-3.5 text-[14px] font-medium text-[#F5F5F5] hover:bg-white/[0.14]">Editar</button>
            )}
            {link ? (
              <a href={link} target="_blank" rel="noreferrer" className="ador-btn-primary flex flex-1 items-center justify-center gap-2 rounded-full py-3.5 text-[15px] font-semibold">
                <VideoIcon size={18} /> Unirse a Meet
              </a>
            ) : meet.status === 'ready' && !event.allDay ? (
              <button type="button" onClick={create} disabled={creating} className="ador-btn-primary flex flex-1 items-center justify-center gap-2 rounded-full py-3.5 text-[15px] font-semibold disabled:opacity-60">
                <VideoIcon size={18} /> {creating ? 'Creando sala…' : 'Crear sala de Meet'}
              </button>
            ) : meet.status === 'needsConnect' && !event.allDay ? (
              <button type="button" onClick={meet.connect} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-white/[0.08] py-3.5 text-[14px] font-medium text-[#F4EEE2]">
                Conectar Google para usar Meet
              </button>
            ) : null}
          </div>
        </div>
        </motion.div>
      </motion.div>
    </motion.div>,
    document.body
  )
}
