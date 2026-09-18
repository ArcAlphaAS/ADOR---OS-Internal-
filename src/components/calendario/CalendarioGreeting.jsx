import { isDueToday } from '../../lib/workspace'

// A landing greeting for Calendario, iOS-Home-Screen-widget-ish — per
// direct reference image. Deliberately real, no fabricated pieces: the
// reference's weather ("6° Krakow") and mood pills ("Great/Typical/Good")
// have no data source anywhere in this app (no weather API, no health/
// sleep integration), so both were dropped rather than faked — same rule
// already applied when the Día view's energy curve was scoped down to a
// clearly-labeled generic pattern. Everything shown here is a real count.

function getGreeting(hour, name) {
  if (hour >= 6 && hour < 13) return `Buenos días, ${name}.`
  if (hour >= 13 && hour < 19) return `Buenas tardes, ${name}.`
  return `Buenas noches, ${name}.`
}

export default function CalendarioGreeting({ user, events, tasks }) {
  const name = (user?.displayName || user?.email?.split('@')[0] || 'ahí').trim().split(' ')[0]
  const hour = new Date().getHours()

  const today = new Date()
  const todaysEvents = events.filter((e) => new Date(e.start).toDateString() === today.toDateString())
  const meetingCount = todaysEvents.filter((e) => e.isMeeting).length
  const taskCount = tasks.filter((t) => t.status !== 'completado' && isDueToday(t)).length

  const parts = []
  if (todaysEvents.length > 0) parts.push(`${todaysEvents.length} evento${todaysEvents.length === 1 ? '' : 's'}`)
  if (meetingCount > 0) parts.push(`${meetingCount} reunión${meetingCount === 1 ? '' : 'es'}`)
  if (taskCount > 0) parts.push(`${taskCount} tarea${taskCount === 1 ? '' : 's'}`)

  return (
    <div
      className="ador-glass ador-grain overflow-hidden rounded-[20px] px-5 py-4"
      style={{ backgroundImage: 'radial-gradient(ellipse at 20% 0%, rgba(30,95,173,0.12) 0%, transparent 60%)' }}
    >
      <p className="text-[19px] font-semibold tracking-[-0.01em] text-[#F5F5F5]">{getGreeting(hour, name)}</p>
      <p className="mt-0.5 text-[13px] text-[#888888]">
        {parts.length === 0 ? 'Nada agendado por ahora — día libre.' : <>Tienes {parts.join(', ')} hoy.</>}
      </p>
    </div>
  )
}
