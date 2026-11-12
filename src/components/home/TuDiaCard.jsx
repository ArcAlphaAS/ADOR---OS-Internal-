import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { toggleTaskComplete, applyTaskUpdate, subscribeUsers } from '../../lib/firestore'
import ExpandableTaskCard from '../common/ExpandableTaskCard'
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
  if (calendarStatus === 'checking' || calendarStatus === 'connecting') {
    return (
      <div aria-hidden>
        <div className="ador-skeleton h-10 w-28 rounded-xl" />
        <div className="ador-skeleton mt-3 h-3 w-40 rounded-full" />
        <div className="ador-skeleton mt-2 h-3 w-24 rounded-full" />
      </div>
    )
  }
  if (calendarStatus !== 'ready') {
    return (
      <button type="button" onClick={onOpenCalendar} className="text-left text-[13px] text-[#8A8A8A] transition-colors hover:text-[#C9C9C9]">
        Conecta tu Google Calendar para ver tu próxima reunión →
      </button>
    )
  }
  if (!meeting) return <p className="text-[13px] text-[#8A8A8A]">Sin reuniones próximas — el día es tuyo.</p>
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

// Línea de tiempo vertical (de las referencias de Hoy): un punto por tarea
// unido por un conector punteado; la primera ("lo siguiente") va resaltada en
// una tarjeta suave. Al completar se tacha un instante antes de salir.
function UpNextRow({ task, workstream, first, last, onOpen, onComplete }) {
  const overdue = isOverdue(task)
  const [done, setDone] = useState(false)
  const ring = overdue ? '#D98A86' : task.priority === 'alta' ? '#E8C15A' : 'rgba(255,255,255,0.3)'
  return (
    <motion.li layout exit={{ opacity: 0, x: 12, transition: { duration: 0.35 } }} className="relative">
      {!last && <span aria-hidden className="absolute left-[10px] top-[34px] bottom-[-6px] w-px border-l border-dashed border-white/[0.16]" />}
      <div className={`flex items-start gap-3 rounded-xl py-2.5 ${first ? 'bg-white/[0.045] px-2.5 -mx-2.5' : ''}`}>
        <button
          type="button"
          onClick={() => {
            setDone(true)
            setTimeout(onComplete, 350)
          }}
          aria-label="Marcar como completada"
          className="mt-[1px] flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-[1.5px] bg-black transition-colors hover:border-[#F4EEE2]"
          style={{ borderColor: done ? '#F4EEE2' : ring, background: done ? '#F4EEE2' : undefined }}
        >
          {done && <span className="text-[11px] font-bold leading-none text-[#0A0A0A]">✓</span>}
        </button>
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <span
            className="block truncate text-[13.5px] transition-colors hover:text-white"
            style={{ color: done ? '#767676' : '#E4E4E4', textDecoration: done ? 'line-through' : 'none' }}
          >
            {task.title}
          </span>
          <span className="block truncate text-[12px]" style={{ color: overdue ? '#D98A86' : '#767676' }}>
            {[first ? 'Lo siguiente' : null, workstream, dueLabel(task)].filter(Boolean).join(' · ')}
          </span>
        </button>
      </div>
    </motion.li>
  )
}

const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// Tira de la semana (lunes a domingo): hoy en un disco blanco, y debajo de cada
// día un punto marfil si hay reuniones y uno dorado si vencen tareas.
function WeekStrip({ events, dueByDay, onOpen }) {
  const today = new Date()
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7))
  const days = Array.from({ length: 7 }, (_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i))
  const evCount = {}
  for (const e of events) {
    if (!e.start) continue
    const k = dayKey(new Date(e.start))
    evCount[k] = (evCount[k] || 0) + 1
  }
  return (
    <div className="grid grid-cols-7 gap-1 border-t border-white/[0.07] px-4 py-3 sm:px-8 lg:px-12">
      {days.map((d) => {
        const k = dayKey(d)
        const isToday = k === dayKey(today)
        const label = d.toLocaleDateString('es', { weekday: 'short' }).replace('.', '')
        return (
          <button key={k} type="button" onClick={onOpen} className="flex flex-col items-center gap-1.5 rounded-xl py-1.5 transition-colors hover:bg-white/[0.04]">
            <span className="text-[11px] capitalize text-[#8A8A8A]">{label}</span>
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full text-[14px] font-medium tabular-nums"
              style={{ background: isToday ? '#F5F5F5' : 'transparent', color: isToday ? '#0A0A0A' : '#E4E4E4' }}
            >
              {d.getDate()}
            </span>
            <span className="flex h-1.5 items-center gap-1">
              {evCount[k] > 0 && <span className="h-1.5 w-1.5 rounded-full bg-[#F4EEE2]" />}
              {dueByDay[k] > 0 && <span className="h-1.5 w-1.5 rounded-full" style={{ background: GOLD }} />}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function AgendaEventRow({ event, first, last, now, onOpen }) {
  const start = new Date(event.start).getTime()
  const end = new Date(event.end || event.start).getTime()
  const live = start <= now && end > now
  const past = end <= now
  return (
    <li className="relative" style={{ opacity: past ? 0.5 : 1 }}>
      {!last && <span aria-hidden className="absolute left-[10px] top-[34px] bottom-[-6px] w-px border-l border-dashed border-white/[0.16]" />}
      <button type="button" onClick={onOpen} className={`flex w-full items-start gap-3 rounded-xl py-2.5 text-left ${first ? 'bg-white/[0.045] px-2.5 -mx-2.5' : ''}`}>
        <span className="mt-[1px] flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-[1.5px]" style={{ borderColor: live ? GOLD : 'rgba(255,255,255,0.3)' }}>
          <span className="h-[7px] w-[7px] rounded-full" style={{ background: live ? GOLD : 'rgba(255,255,255,0.3)' }} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] text-[#E4E4E4]">{event.title}</span>
          <span className="block truncate text-[12px]" style={{ color: live ? GOLD : '#767676' }}>
            {live ? 'En curso · ' : ''}{hhmm(new Date(event.start))}{event.end ? ` – ${hhmm(new Date(event.end))}` : ''}
          </span>
        </span>
      </button>
    </li>
  )
}

export default function TuDiaCard({ user, events = [], nextMeeting, calendarStatus, onNavigate }) {
  const day = useDayData(user?.uid)
  const showToast = useToast()
  const [now, setNow] = useState(() => Date.now())
  const [users, setUsers] = useState([])
  useEffect(() => subscribeUsers(setUsers), [])
  const userById = Object.fromEntries(users.map((u) => [u.id, u]))
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(t)
  }, [])

  const actorName = user?.displayName || user?.email?.split('@')[0] || 'Usuario'
  const complete = (task) =>
    withTimeout(toggleTaskComplete(task, actorName)).catch((error) => showToast(`No se pudo actualizar: ${error.message}`))
  const [acting, setActing] = useState(false)
  const act = (fn, done) => {
    if (acting) return
    setActing(true)
    Promise.resolve(fn())
      .then(() => showToast(done))
      .catch((error) => showToast(`No se pudo actualizar: ${error.message}`))
      .finally(() => setActing(false))
  }
  const postpone = (task) => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    d.setHours(12, 0, 0, 0)
    return withTimeout(applyTaskUpdate(task, { dueDate: d }, user?.uid, actorName))
  }
  const openTask = (task) => onNavigate?.('workspace', { type: 'task', id: task.id })
  const { focus } = day
  const todayKey = dayKey(new Date())
  const todayEvents = events.filter((e) => !e.allDay && e.start && dayKey(new Date(e.start)) === todayKey && new Date(e.end || e.start).getTime() > now - 3600000).sort((a, b) => new Date(a.start) - new Date(b.start))
  const isNext = (e) => nextMeeting && e.title === nextMeeting.title && new Date(e.start).getTime() === nextMeeting.start.getTime()
  const agenda = [
    ...todayEvents.filter((e) => !isNext(e)).slice(0, 4).map((e) => ({ type: 'event', key: `e${e.id}`, event: e })),
    ...day.upNext.map((t) => ({ type: 'task', key: `t${t.id}`, task: t })),
  ]
  const pct = day.totalToday ? Math.round((day.completedToday / day.totalToday) * 100) : 0

  return (
    <div className="ador-glass ador-glow ador-grain relative flex h-full flex-col overflow-hidden rounded-[28px]">
      <div
        className="pointer-events-none absolute inset-x-10 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${GOLD}99, transparent)` }}
      />
      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[1.4fr_1fr]">
        {/* The one thing */}
        <div className="flex flex-col px-7 py-9 sm:px-10 lg:px-14 lg:py-10">
          <div className="flex h-8 items-center justify-between gap-4">
            <motion.p {...rise(0.15)} className="text-[11px] font-medium uppercase tracking-[0.16em]" style={{ color: GOLD }}>
              Tu día
            </motion.p>
            {day.totalToday > 0 && (
              <motion.div {...rise(0.3)} className="flex items-center gap-2.5" title={`${day.completedToday} de ${day.totalToday} hechas hoy`}>
                <svg width="30" height="30" viewBox="0 0 56 56" className="-rotate-90" aria-hidden>
                  <circle cx="28" cy="28" r="23" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
                  <motion.circle
                    cx="28" cy="28" r="23" fill="none" strokeWidth="6" strokeLinecap="round"
                    stroke={pct >= 100 ? GOLD : '#F4EEE2'}
                    strokeDasharray={2 * Math.PI * 23}
                    initial={{ strokeDashoffset: 2 * Math.PI * 23 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 23 * (1 - pct / 100) }}
                    transition={{ duration: 1.4, delay: 0.6, ease: SLOW }}
                  />
                </svg>
                <span className="text-[12.5px] tabular-nums text-[#A8A8A8]">
                  {pct >= 100 ? 'Día despejado' : `${day.completedToday} de ${day.totalToday} hechas hoy`}
                </span>
              </motion.div>
            )}
          </div>

          {!day.loaded ? (
            <div className="mt-6" aria-hidden>
              <div className="ador-skeleton h-3 w-36 rounded-full" />
              <div className="ador-skeleton mt-4 h-8 w-4/5 rounded-xl" />
              <div className="ador-skeleton mt-3 h-8 w-3/5 rounded-xl" />
              <div className="ador-skeleton mt-5 h-3 w-28 rounded-full" />
              <div className="ador-skeleton mt-8 h-11 w-40 rounded-full" />
            </div>
          ) : focus ? (
            <>
              <motion.p {...rise(0.3)} className="mt-6 text-[13px] text-[#8A8A8A]">
                Lo más importante ahora
              </motion.p>
              <motion.h2
                {...rise(0.42)}
                className="ador-wrap mt-2 text-[28px] font-light leading-[1.15] tracking-[-0.02em] text-[#F5F5F5] sm:text-[34px] lg:text-[38px]"
              >
                {focus.title}
              </motion.h2>
              <motion.p {...rise(0.54)} className="mt-3 text-[13px]" style={{ color: isOverdue(focus) ? '#D98A86' : '#8A8A8A' }}>
                {dueLabel(focus)}
              </motion.p>
              <motion.div {...rise(0.6)} className="mt-4">
                <ExpandableTaskCard task={focus} label={day.workstreamName(focus) || 'Tarea'} userById={userById} actorUserId={user?.uid} actorName={actorName} onOpen={() => openTask(focus)} />
              </motion.div>
              <motion.div {...rise(0.68)} className="mt-7 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => openTask(focus)}
                  className="rounded-full bg-[#F5F5F5] px-7 py-2.5 text-[13.5px] font-semibold text-[#0A0A0A] transition-opacity duration-200 hover:opacity-85"
                >
                  Empezar
                </button>
                <button
                  type="button"
                  disabled={acting}
                  onClick={() => act(() => complete(focus), 'Tarea completada')}
                  className="flex items-center gap-2 rounded-full border border-white/[0.16] px-5 py-2.5 text-[13.5px] font-medium text-[#E4E4E4] transition-colors hover:border-[#F4EEE2] hover:text-white disabled:opacity-50"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                  Hecha
                </button>
                <button
                  type="button"
                  disabled={acting}
                  onClick={() => act(() => postpone(focus), 'Pasó a mañana')}
                  className="rounded-full px-3 py-2.5 text-[13.5px] text-[#A8A8A8] transition-colors hover:bg-white/[0.06] hover:text-[#F5F5F5] disabled:opacity-50"
                >
                  Mañana
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
                {day.nextPending ? <>Buen momento para adelantar <button type="button" onClick={() => openTask(day.nextPending)} className="font-medium text-[#F4EEE2] hover:underline">«{day.nextPending.title}»</button>.</> : 'Buen momento para avanzar algo importante.'}
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

        </div>

        {/* Next meeting + what follows */}
        <div className="border-t border-white/[0.07] px-7 py-9 sm:px-10 lg:border-l lg:border-t-0 lg:px-12 lg:py-10">
          <motion.div {...rise(0.4)}>
            <p className="mb-3 flex h-8 items-center text-[11px] font-medium uppercase tracking-[0.16em] text-[#8A8A8A]">Próxima reunión</p>
            <Meeting meeting={nextMeeting} calendarStatus={calendarStatus} onOpenCalendar={() => onNavigate?.('calendario')} now={now} />
          </motion.div>

          {agenda.length > 0 && (
            <motion.div {...rise(0.6)} className="mt-9">
              <p className="mb-1 text-[13px] font-medium text-[#A8A8A8]">Agenda de hoy</p>
              <ul className="mt-3">
                <AnimatePresence initial={false}>
                  {agenda.map((item, i) =>
                    item.type === 'event' ? (
                      <AgendaEventRow key={item.key} event={item.event} first={i === 0} last={i === agenda.length - 1} now={now} onOpen={() => onNavigate?.('calendario')} />
                    ) : (
                      <UpNextRow
                        key={item.key}
                        task={item.task}
                        first={i === 0}
                        last={i === agenda.length - 1}
                        workstream={day.workstreamName(item.task)}
                        onOpen={() => openTask(item.task)}
                        onComplete={() => complete(item.task)}
                      />
                    )
                  )}
                </AnimatePresence>
              </ul>
            </motion.div>
          )}
        </div>
      </div>
      <WeekStrip events={events} dueByDay={day.dueByDay} onOpen={() => onNavigate?.('calendario')} />
    </div>
  )
}
