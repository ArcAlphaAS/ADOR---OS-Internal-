import { isDueToday } from '../../lib/workspace'
import { eventColor } from '../../lib/googleCalendar'
import { hhmm, untilLabel } from './PhoneCalendar'

// Saludo de Calendario: a la izquierda quién eres y cómo viene el día, con lo siguiente
// que te toca; a la derecha tres cifras reales (eventos, reuniones, tareas). Nada inventado:
// el clima y los estados de ánimo de la referencia original no tienen de dónde salir aquí.

function getGreeting(hour, name) {
  if (hour >= 6 && hour < 12) return `Buenos días, ${name}`
  if (hour >= 12 && hour < 19) return `Buenas tardes, ${name}`
  return `Buenas noches, ${name}`
}

function Stat({ n, label }) {
  return (
    <div className="flex min-w-[72px] flex-col items-center px-5">
      <span className="text-[30px] font-light leading-none tabular-nums tracking-[-0.02em] text-[#F5F5F5]">{n}</span>
      <span className="mt-1.5 text-[11.5px] text-[#8A8A8A]">{label}</span>
    </div>
  )
}

export default function CalendarioGreeting({ user, events, tasks }) {
  const name = (user?.displayName || user?.email?.split('@')[0] || 'ahí').trim().split(' ')[0]
  const now = new Date()
  const nowMs = now.getTime()

  const todaysEvents = events.filter((e) => new Date(e.start).toDateString() === now.toDateString())
  const meetingCount = todaysEvents.filter((e) => e.isMeeting).length
  const taskCount = tasks.filter((t) => t.status !== 'completado' && isDueToday(t)).length

  const timed = todaysEvents.filter((e) => !e.allDay && e.end).sort((a, b) => new Date(a.start) - new Date(b.start))
  const live = timed.find((e) => new Date(e.start).getTime() <= nowMs && new Date(e.end).getTime() > nowMs)
  const next = live || timed.find((e) => new Date(e.start).getTime() > nowMs)

  return (
    <div className="ador-glass flex flex-wrap items-center justify-between gap-x-10 gap-y-5 rounded-[22px] px-7 py-5">
      <div className="min-w-0">
        <p className="text-[22px] font-semibold tracking-[-0.015em] text-[#F5F5F5]">{getGreeting(now.getHours(), name)}</p>
        {next ? (
          <p className="mt-1.5 flex min-w-0 items-center gap-2 text-[13.5px] text-[#9A9A9A]">
            <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: eventColor(next) }} />
            <span className="flex-shrink-0 font-medium" style={{ color: live ? '#E8C15A' : '#F4EEE2' }}>
              {live ? 'Ahora' : untilLabel(new Date(next.start).getTime() - nowMs).replace(/^en /, 'En ')}
            </span>
            <span className="truncate text-[#D0D0D0]">{next.title}</span>
            <span className="flex-shrink-0 tabular-nums">· {hhmm(next.start)}</span>
          </p>
        ) : (
          <p className="mt-1.5 text-[13.5px] text-[#9A9A9A]">
            {todaysEvents.length === 0 && taskCount === 0 ? 'Nada agendado por ahora — día libre.' : 'Ya no te quedan reuniones hoy.'}
          </p>
        )}
      </div>
      <div className="flex items-center divide-x divide-white/[0.08]">
        <Stat n={todaysEvents.length} label={todaysEvents.length === 1 ? 'Evento' : 'Eventos'} />
        <Stat n={meetingCount} label={meetingCount === 1 ? 'Reunión' : 'Reuniones'} />
        <Stat n={taskCount} label={taskCount === 1 ? 'Tarea' : 'Tareas'} />
      </div>
    </div>
  )
}
