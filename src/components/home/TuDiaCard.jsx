import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { toggleTaskComplete } from '../../lib/firestore'
import { withTimeout, isOverdue } from '../../lib/workspace'
import { useToast } from '../../hooks/useToast'
import { useDayData } from '../../hooks/useDayData'

// "Tu día" — the one calm, generous card Inicio opens with: the single most
// important thing right now, the next meeting, and what comes after. Meant to
// feel like being welcomed into the day rather than shown a dashboard: wide
// margins, light type, a hairline of gold, and a slow, staggered settle.
// (Surface: .ador-glass on a static element; all motion lives on children.)
const SLOW = [0.22, 1, 0.36, 1]
const GOLD = '#C9A24B'

const rise = (delay) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.9, delay, ease: SLOW },
})

const hhmm = (d) => d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false })

function relativeStart(start, inProgress, now) {
  if (inProgress) return 'En curso ahora'
  const mins = Math.round((start.getTime() - now) / 60000)
  if (mins < 1) return 'Empieza ahora'
  if (mins < 60) return `en ${mins} min`
  const sameDay = start.toDateString() === new Date(now).toDateString()
  if (sameDay) {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return m ? `en ${h} h ${m} min` : `en ${h} h`
  }
  const tomorrow = new Date(now + 86400000).toDateString() === start.toDateString()
  if (tomorrow) return 'mañana'
  const text = start.toLocaleDateString('es', { weekday: 'long', day: 'numeric' })
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function dueLabel(task) {
  const due = task.dueDate?.toDate?.()
  if (!due) return 'Sin fecha'
  const days = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(due).setHours(0, 0, 0, 0)) / 86400000)
  if (days > 0) return `Vencida hace ${days} ${days === 1 ? 'día' : 'días'}`
  if (days === 0) return 'Para hoy'
  return due.toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

function Meeting({ meeting, calendarStatus, onOpenCalendar, now }) {
  if (calendarStatus !== 'ready') {
    return (
      <button type="button" onClick={onOpenCalendar} className="text-left text-[13px] text-[#7A7A7A] transition-colors hover:text-[#C9C9C9]">
        Conecta tu Google Calendar para ver tu próxima reunión →
      </button>
    )
  }
  if (!meeting) return <p className="text-[13px] text-[#7A7A7A]">Sin reuniones próximas — el día es tuyo.</p>
  return (
    <button type="button" onClick={onOpenCalendar} className="group block w-full text-left">
      <span className="block font-extralight leading-none tabular-nums text-[#F5F5F5]" style={{ fontSize: 44, letterSpacing: '-0.03em' }}>
        {hhmm(meeting.start)}
      </span>
      <span className="mt-2.5 block truncate text-[14px] text-[#E4E4E4] transition-colors group-hover:text-white">{meeting.title}</span>
      <span className="mt-0.5 block text-[12.5px]" style={{ color: meeting.inProgress ? GOLD : '#7A7A7A' }}>
        {relativeStart(meeting.start, meeting.inProgress, now)}
      </span>
    </button>
  )
}

function UpNextRow({ task, workstream, onOpen, onComplete }) {
  const overdue = isOverdue(task)
  return (
    <motion.li layout exit={{ opacity: 0, x: 12, transition: { duration: 0.35 } }} className="flex items-center gap-3 py-2.5">
      <button
        type="button"
        onClick={onComplete}
        aria-label="Marcar como completada"
        className="flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full border border-white/[0.28] transition-colors hover:border-[#E8C15A]"
      />
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <span className="block truncate text-[13.5px] text-[#E4E4E4] transition-colors hover:text-white">{task.title}</span>
        <span className="block truncate text-[12px]" style={{ color: overdue ? '#D98A86' : '#767676' }}>
          {[workstream, dueLabel(task)].filter(Boolean).join(' · ')}
        </span>
      </button>
    </motion.li>
  )
}

export default function TuDiaCard({ user, nextMeeting, calendarStatus, onNavigate }) {
  const day = useDayData(user?.uid)
  const showToast = useToast()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(t)
  }, [])

  const actorName = user?.displayName || user?.email?.split('@')[0] || 'Usuario'
  const complete = (task) =>
    withTimeout(toggleTaskComplete(task, actorName)).catch((error) => showToast(`No se pudo actualizar: ${error.message}`))
  const openTask = (task) => onNavigate?.('workspace', { type: 'task', id: task.id })
  const { focus } = day
  const meta = focus?.priority ? day.priorityMeta(focus.priority) : null
  const pct = day.totalToday ? Math.round((day.completedToday / day.totalToday) * 100) : 0

  return (
    <div className="ador-glass ador-grain relative overflow-hidden rounded-[28px]">
      <div
        className="pointer-events-none absolute inset-x-10 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${GOLD}99, transparent)` }}
      />
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr]">
        {/* The one thing */}
        <div className="flex flex-col px-7 py-9 sm:px-10 lg:px-14 lg:py-12">
          <motion.p {...rise(0.15)} className="text-[11px] font-medium uppercase tracking-[0.16em]" style={{ color: GOLD }}>
            Tu día
          </motion.p>

          {focus ? (
            <>
              <motion.p {...rise(0.3)} className="mt-6 text-[13px] text-[#7A7A7A]">
                Lo más importante ahora
              </motion.p>
              <motion.h2
                {...rise(0.42)}
                className="ador-wrap mt-2 text-[28px] font-light leading-[1.15] tracking-[-0.02em] text-[#F5F5F5] sm:text-[34px] lg:text-[38px]"
              >
                {focus.title}
              </motion.h2>
              <motion.p {...rise(0.54)} className="mt-3 flex flex-wrap items-center gap-x-2 text-[13px] text-[#8A8A8A]">
                {day.workstreamName(focus) && <span>{day.workstreamName(focus)}</span>}
                {day.workstreamName(focus) && <span aria-hidden>·</span>}
                <span style={{ color: isOverdue(focus) ? '#D98A86' : undefined }}>{dueLabel(focus)}</span>
                {meta && (
                  <>
                    <span aria-hidden>·</span>
                    <span style={{ color: meta.color }}>Prioridad {meta.label.toLowerCase()}</span>
                  </>
                )}
              </motion.p>
              <motion.div {...rise(0.68)} className="mt-8 flex flex-wrap items-center gap-5">
                <button
                  type="button"
                  onClick={() => openTask(focus)}
                  className="rounded-full bg-[#F5F5F5] px-7 py-2.5 text-[13.5px] font-semibold text-[#0A0A0A] transition-opacity duration-200 hover:opacity-85"
                >
                  Empezar
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate?.('workspace')}
                  className="text-[13px] text-[#8A8A8A] transition-colors hover:text-[#F5F5F5]"
                >
                  Ver mi día →
                </button>
              </motion.div>
            </>
          ) : (
            <>
              <motion.h2 {...rise(0.35)} className="mt-6 text-[28px] font-light leading-[1.15] tracking-[-0.02em] text-[#F5F5F5] sm:text-[34px] lg:text-[38px]">
                Nada urgente por ahora.
              </motion.h2>
              <motion.p {...rise(0.5)} className="mt-3 text-[14px] text-[#8A8A8A]">
                Buen momento para avanzar algo importante.
              </motion.p>
              <motion.div {...rise(0.65)} className="mt-8">
                <button
                  type="button"
                  onClick={() => onNavigate?.('workspace')}
                  className="rounded-full bg-[#F5F5F5] px-7 py-2.5 text-[13.5px] font-semibold text-[#0A0A0A] transition-opacity duration-200 hover:opacity-85"
                >
                  Ver mis pendientes
                </button>
              </motion.div>
            </>
          )}

          {day.totalToday > 0 && (
            <motion.div {...rise(0.8)} className="mt-10 max-w-[360px]">
              <div className="h-[2px] w-full overflow-hidden rounded-full bg-white/[0.08]">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: GOLD }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 1.4, delay: 0.9, ease: SLOW }}
                />
              </div>
              <p className="mt-2 text-[12px] text-[#767676]">
                {day.completedToday} de {day.totalToday} {day.totalToday === 1 ? 'hecha' : 'hechas'} hoy
              </p>
            </motion.div>
          )}
        </div>

        {/* Next meeting + what follows */}
        <div className="border-t border-white/[0.07] px-7 py-9 sm:px-10 lg:border-l lg:border-t-0 lg:px-12 lg:py-12">
          <motion.div {...rise(0.4)}>
            <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.16em] text-[#767676]">Próxima reunión</p>
            <Meeting meeting={nextMeeting} calendarStatus={calendarStatus} onOpenCalendar={() => onNavigate?.('calendario')} now={now} />
          </motion.div>

          {day.upNext.length > 0 && (
            <motion.div {...rise(0.6)} className="mt-9">
              <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[#767676]">Después</p>
              <ul className="divide-y divide-white/[0.06]">
                <AnimatePresence initial={false}>
                  {day.upNext.map((task) => (
                    <UpNextRow
                      key={task.id}
                      task={task}
                      workstream={day.workstreamName(task)}
                      onOpen={() => openTask(task)}
                      onComplete={() => complete(task)}
                    />
                  ))}
                </AnimatePresence>
              </ul>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
