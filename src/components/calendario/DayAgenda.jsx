import { useState } from 'react'
import { toggleTaskComplete } from '../../lib/firestore'
import { withTimeout, isPendingFor } from '../../lib/workspace'
import { useToast } from '../../hooks/useToast'
import { eventColor } from '../../lib/googleCalendar'
import { key, sameDay, hhmm, untilLabel, freeGap, Tag } from './PhoneCalendar'

// Agenda del día para escritorio: el mismo diseño que en el teléfono — reuniones de
// Google y tus tareas con fecha en una sola lista, lo pasado tachado, lo próximo con
// "en 1 h 15 min", y un aviso de hueco libre con la tarea que cabría — pero en la
// columna derecha, junto a la cuadrícula.
export default function DayAgenda({ uid, anchor, events, tasks, actorName, onOpenEvent }) {
  const showToast = useToast()
  const [now] = useState(() => new Date())
  const nowMs = Date.now()
  const mine = tasks.filter((t) => t.dueDate?.toDate && !isPendingFor(t, uid))
  const dayEvents = events
    .filter((e) => e.start && sameDay(new Date(e.start), anchor))
    .sort((a, b) => (b.allDay ? 1 : 0) - (a.allDay ? 1 : 0) || new Date(a.start) - new Date(b.start))
  const dayTasks = mine.filter((t) => key(t.dueDate.toDate()) === key(anchor))
  const isToday = sameDay(anchor, now)
  const gap = isToday || anchor > now ? freeGap(dayEvents, anchor, now) : null
  const suggestion = gap && dayTasks.find((t) => t.status !== 'completado')
  const complete = (t) => withTimeout(toggleTaskComplete(t, actorName)).catch((e) => showToast(`No se pudo actualizar: ${e.message}`))
  const title = isToday ? 'Hoy' : anchor.toLocaleDateString('es', { weekday: 'long' })

  return (
    <section className="ador-glass ador-grain overflow-hidden rounded-[22px]">
      <div className="px-5 pb-3 pt-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#8A8A8A]">Agenda</p>
        <h3 className="mt-1 text-[20px] font-semibold leading-tight first-letter:uppercase text-[#F5F5F5]">{title}</h3>
        <p className="text-[12.5px] text-[#8A8A8A]">{anchor.toLocaleDateString('es', { day: 'numeric', month: 'long' })}</p>
      </div>

      {suggestion && (
        <div className="mx-4 mb-3 rounded-2xl bg-white/[0.06] px-4 py-3">
          <p className="text-[11.5px] text-[#8A8A8A]">Hueco libre · {hhmm(gap.from)} – {hhmm(gap.to)}</p>
          <p className="mt-0.5 text-[13px] leading-snug text-[#F5F5F5]">Buen momento para <span className="font-medium">{suggestion.title}</span></p>
        </div>
      )}

      {dayEvents.length === 0 && dayTasks.length === 0 ? (
        <p className="px-5 pb-6 pt-1 text-[13px] text-[#8A8A8A]">Nada este día.</p>
      ) : (
        <ul className="divide-y divide-white/[0.06] border-t border-white/[0.06]">
          {dayEvents.map((e) => {
            const end = e.end ? new Date(e.end).getTime() : 0
            const past = !e.allDay && end && end <= nowMs
            const live = !e.allDay && new Date(e.start).getTime() <= nowMs && end > nowMs
            const startsIn = new Date(e.start).getTime() - nowMs
            return (
              <li key={e.id}>
                <button type="button" onClick={() => onOpenEvent(e)} className="flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors hover:bg-white/[0.04]" style={{ opacity: past ? 0.5 : 1 }}>
                  <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ background: eventColor(e) }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium text-[#F5F5F5]" style={{ textDecoration: past ? 'line-through' : 'none' }}>{e.title}</span>
                    <span className="block truncate text-[12px] tabular-nums text-[#8A8A8A]">
                      {e.allDay ? 'Todo el día' : `${hhmm(e.start)} – ${hhmm(e.end)}`}{e.location ? ` · ${e.location}` : ''}
                    </span>
                  </span>
                  <span className="flex-shrink-0 text-right">
                    {live && <span className="text-[11.5px] font-medium text-[#E8C15A]">Ahora</span>}
                    {!live && !past && !e.allDay && startsIn > 0 && startsIn < 6 * 3600000 && <span className="text-[11.5px] font-medium text-[#F4EEE2]">{untilLabel(startsIn)}</span>}
                  </span>
                </button>
              </li>
            )
          })}
          {dayTasks.map((t) => {
            const done = t.status === 'completado'
            return (
              <li key={t.id} className="flex items-center gap-3 px-5 py-3.5">
                <button type="button" aria-label="Completar tarea" onClick={() => complete(t)} className="flex h-[20px] w-[20px] flex-shrink-0 items-center justify-center rounded-full border-[1.5px] text-[10px] font-bold text-[#0A0A0A]" style={{ borderColor: done ? '#F4EEE2' : 'rgba(255,255,255,0.32)', background: done ? '#F4EEE2' : 'transparent' }}>{done ? '✓' : ''}</button>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] text-[#F5F5F5]" style={{ textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.5 : 1 }}>{t.title}</span>
                </span>
                <Tag tone="task">Tarea</Tag>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
