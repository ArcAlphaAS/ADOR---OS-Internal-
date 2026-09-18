import { eventColor } from '../../lib/googleCalendar'

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const MAX_VISIBLE = 3

function buildMonthCells(monthDate) {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const startWeekday = (first.getDay() + 6) % 7
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), d))
  return cells
}

export default function MonthGrid({ monthDate, events, onSelectDay }) {
  const cells = buildMonthCells(monthDate)
  const today = new Date()

  const eventsOn = (day) => events.filter((e) => new Date(e.start).toDateString() === day.toDateString())

  return (
    <div className="ador-glass ador-grain overflow-hidden rounded-2xl">
      <div className="grid grid-cols-7 border-b border-white/[0.06]">
        {WEEKDAYS.map((w, i) => (
          <div key={i} className="py-2.5 text-center text-[10px] font-medium uppercase tracking-[0.06em] text-[#666666]">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="min-h-[104px] border-b border-l border-white/[0.04] first:border-l-0" />
          const isToday = day.toDateString() === today.toDateString()
          const dayEvents = eventsOn(day)
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelectDay(day)}
              className="flex min-h-[104px] flex-col gap-1 border-b border-l border-white/[0.04] p-1.5 text-left transition-colors duration-150 first:border-l-0 hover:bg-white/[0.03]"
            >
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full text-[11px]"
                style={{ background: isToday ? '#1E5FAD' : 'transparent', color: '#F5F5F5', fontWeight: isToday ? 600 : 400 }}
              >
                {day.getDate()}
              </span>
              <div className="flex flex-col gap-0.5">
                {dayEvents.slice(0, MAX_VISIBLE).map((e) => {
                  const color = eventColor(e)
                  return (
                    <span
                      key={e.id}
                      className="flex items-center gap-1 truncate rounded px-1 py-[1px] text-[9.5px] font-medium"
                      style={{ background: `${color}1F`, color }}
                    >
                      <span className="h-1 w-1 flex-shrink-0 rounded-full" style={{ background: color }} />
                      <span className="truncate">{e.title}</span>
                    </span>
                  )
                })}
                {dayEvents.length > MAX_VISIBLE && <span className="px-1 text-[9.5px] text-[#666666]">+{dayEvents.length - MAX_VISIBLE} más</span>}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
