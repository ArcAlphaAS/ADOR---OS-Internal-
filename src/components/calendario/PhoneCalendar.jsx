import { useState } from 'react'
import { toggleTaskComplete } from '../../lib/firestore'
import { withTimeout, isPendingFor } from '../../lib/workspace'
import { useToast } from '../../hooks/useToast'
import { ArrowLeftIcon, ArrowRightIcon } from '../icons'

// Calendario en el teléfono (de una referencia): el mes arriba, una tira de la
// semana con puntos en los días que tienen algo, y debajo el día elegido en una
// sola tarjeta que mezcla tus reuniones de Google con tus tareas con fecha.
// Lo que lo hace apoyar y no solo mostrar: lo pasado se tacha, lo próximo dice
// "en 1 h 15 min", las tareas se completan desde aquí, y avisa de un hueco libre
// con la tarea que cabría en él.
export const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const sameDay = (a, b) => key(a) === key(b)
export const hhmm = (v) => new Date(v).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false })
const WD = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export function untilLabel(ms) {
  const min = Math.round(ms / 60000)
  if (min < 60) return `en ${Math.max(1, min)} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return `en ${h} h${m ? ` ${m} min` : ''}`
}

// Huecos entre reuniones de 9:00 a 19:00 (hoy, desde ahora), de ≥ 45 min.
export function freeGap(events, day, now) {
  const start = new Date(day); start.setHours(9, 0, 0, 0)
  const end = new Date(day); end.setHours(19, 0, 0, 0)
  let cursor = sameDay(day, now) ? new Date(Math.max(start.getTime(), now.getTime())) : start
  const busy = events.filter((e) => !e.allDay && e.end).map((e) => [new Date(e.start).getTime(), new Date(e.end).getTime()]).sort((a, b) => a[0] - b[0])
  for (const [s, e] of busy) {
    if (e <= cursor.getTime()) continue
    if (s - cursor.getTime() >= 45 * 60000) return { from: cursor, to: new Date(s) }
    cursor = new Date(Math.max(cursor.getTime(), e))
  }
  return end.getTime() - cursor.getTime() >= 45 * 60000 ? { from: cursor, to: end } : null
}

export const Tag = ({ children, tone }) => (
  <span className="rounded-md px-2 py-[3px] text-[11px] font-medium" style={{ background: tone === 'task' ? 'rgba(232,193,90,0.16)' : 'rgba(244,238,226,0.12)', color: tone === 'task' ? '#E8C15A' : '#E4DCCB' }}>{children}</span>
)

export default function PhoneCalendar({ uid, anchor, setAnchor, events, tasks, actorName, onOpenEvent, onMonth }) {
  const showToast = useToast()
  const [now] = useState(() => new Date())
  const monday = new Date(anchor)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d })

  const mine = tasks.filter((t) => t.dueDate?.toDate && !isPendingFor(t, uid))
  const eventsOn = (d) => events.filter((e) => e.start && sameDay(new Date(e.start), d))
  const dueOf = (t) => t.dueDate?.toDate?.() || null
  const tasksOn = (d) => mine.filter((t) => { const due = dueOf(t); return due && key(due) === key(d) })

  const dayEvents = eventsOn(anchor).sort((a, b) => (b.allDay ? 1 : 0) - (a.allDay ? 1 : 0) || new Date(a.start) - new Date(b.start))
  const dayTasks = tasksOn(anchor)
  const nowMs = Date.now()
  const isToday = sameDay(anchor, now)
  const gap = isToday || anchor > now ? freeGap(dayEvents, anchor, now) : null
  const suggestion = gap && dayTasks.find((t) => t.status !== 'completado')

  const shiftWeek = (n) => setAnchor((a) => { const d = new Date(a); d.setDate(d.getDate() + n * 7); return d })
  const complete = (t) => withTimeout(toggleTaskComplete(t, actorName)).catch((e) => showToast(`No se pudo actualizar: ${e.message}`))
  const month = anchor.toLocaleDateString('es', { month: 'long' })

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => shiftWeek(-1)} aria-label="Semana anterior" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1C1C1E] text-[#F5F5F5]"><ArrowLeftIcon size={15} /></button>
        <button type="button" onClick={onMonth} className="text-[20px] font-semibold capitalize text-[#F5F5F5]">
          {month} <span className="font-light text-[#8E8E93]">{anchor.getFullYear()}</span>
        </button>
        <button type="button" onClick={() => shiftWeek(1)} aria-label="Semana siguiente" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1C1C1E] text-[#F5F5F5]"><ArrowRightIcon size={15} /></button>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d, i) => {
          const sel = sameDay(d, anchor)
          const ev = eventsOn(d).length
          const tk = tasksOn(d).filter((t) => t.status !== 'completado').length
          return (
            <button key={i} type="button" onClick={() => setAnchor(d)} className="flex flex-col items-center gap-1 rounded-[16px] py-2.5" style={{ background: sel ? '#F5F5F5' : '#1C1C1E', color: sel ? '#0A0A0A' : '#F5F5F5' }}>
              <span className="flex h-[6px] gap-[3px]">
                {ev > 0 && <span className="h-[5px] w-[5px] rounded-full" style={{ background: sel ? '#0A0A0A' : '#F4EEE2' }} />}
                {tk > 0 && <span className="h-[5px] w-[5px] rounded-full" style={{ background: sel ? '#8A6D1C' : '#E8C15A' }} />}
              </span>
              <span className="text-[18px] font-semibold leading-none">{d.getDate()}</span>
              <span className="text-[11px]" style={{ color: sel ? '#555' : '#8E8E93' }}>{WD[i]}</span>
              {sameDay(d, now) && <span className="h-[3px] w-4 rounded-full" style={{ background: sel ? '#0A0A0A' : '#F4EEE2' }} />}
            </button>
          )
        })}
      </div>

      <p className="text-center text-[15px] font-medium text-[#8E8E93]">{isToday ? 'Hoy' : anchor.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}</p>

      {suggestion && (
        <div className="rounded-[22px] bg-[#1C1C1E] px-5 py-4">
          <p className="text-[13px] text-[#8E8E93]">Hueco libre · {hhmm(gap.from)} – {hhmm(gap.to)}</p>
          <p className="mt-1 text-[15px] text-[#F5F5F5]">Buen momento para <span className="font-medium">{suggestion.title}</span></p>
        </div>
      )}

      <div className="overflow-hidden rounded-[26px] bg-[#1C1C1E]">
        {dayEvents.length === 0 && dayTasks.length === 0 ? (
          <p className="px-5 py-8 text-center text-[14px] text-[#8E8E93]">Nada este día.</p>
        ) : (
          <ul className="divide-y divide-white/[0.07]">
            {dayEvents.map((e) => {
              const end = e.end ? new Date(e.end).getTime() : 0
              const past = !e.allDay && end && end <= nowMs
              const live = !e.allDay && new Date(e.start).getTime() <= nowMs && end > nowMs
              const startsIn = new Date(e.start).getTime() - nowMs
              return (
                <li key={e.id}>
                  <button type="button" onClick={() => onOpenEvent(e)} className="flex w-full items-start gap-3 px-5 py-4 text-left" style={{ opacity: past ? 0.5 : 1 }}>
                    <span className="min-w-0 flex-1">
                      <Tag>{e.isMeeting ? 'Reunión' : 'Evento'}</Tag>
                      <span className="mt-1.5 block truncate text-[16px] font-medium text-[#F5F5F5]" style={{ textDecoration: past ? 'line-through' : 'none' }}>{e.title}</span>
                      {e.location && <span className="block truncate text-[13px] text-[#8E8E93]">{e.location}</span>}
                    </span>
                    <span className="flex-shrink-0 text-right">
                      <span className="block text-[14px] tabular-nums text-[#F5F5F5]" style={{ textDecoration: past ? 'line-through' : 'none' }}>{e.allDay ? 'Todo el día' : `${hhmm(e.start)} – ${hhmm(e.end)}`}</span>
                      {live && <span className="block text-[12.5px] font-medium text-[#E8C15A]">Ahora</span>}
                      {!live && !past && !e.allDay && startsIn > 0 && startsIn < 6 * 3600000 && <span className="block text-[12.5px] font-medium text-[#F4EEE2]">{untilLabel(startsIn)}</span>}
                    </span>
                  </button>
                </li>
              )
            })}
            {dayTasks.map((t) => {
              const done = t.status === 'completado'
              return (
                <li key={t.id} className="flex items-center gap-3 px-5 py-4">
                  <button type="button" aria-label="Completar tarea" onClick={() => complete(t)} className="flex h-[24px] w-[24px] flex-shrink-0 items-center justify-center rounded-full border-[1.5px] text-[12px] font-bold text-[#0A0A0A]" style={{ borderColor: done ? '#F4EEE2' : 'rgba(255,255,255,0.32)', background: done ? '#F4EEE2' : 'transparent' }}>{done ? '✓' : ''}</button>
                  <span className="min-w-0 flex-1">
                    <Tag tone="task">Tarea</Tag>
                    <span className="mt-1.5 block truncate text-[16px] text-[#F5F5F5]" style={{ textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.5 : 1 }}>{t.title}</span>
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
