import { useEffect, useRef } from 'react'
import { eventColor } from '../../lib/googleCalendar'

// Hour-row × day-column grid, shared by Día (1 column) and Semana (7
// columns) — same component, just a different `days` array. Positions
// timed events by pixel offset (startMinutes/60 * ROW_HEIGHT) rather than
// CSS grid rows, so a 30-minute event and a 90-minute event are visually
// proportional, matching how every real calendar app draws time.

const ROW_HEIGHT = 56
const START_HOUR = 0
const END_HOUR = 24
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)
const GUTTER_WIDTH = 56

function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes()
}

function formatHour(h) {
  if (h === 0) return '12 AM'
  if (h === 12) return '12 PM'
  return h < 12 ? `${h} AM` : `${h - 12} PM`
}

// Simple greedy column-packing for overlapping events on the same day —
// not pixel-perfect interval scheduling, but visually honest: overlapping
// events never sit on top of each other, non-overlapping ones still get
// nearly full width most of the time.
function layoutDay(events) {
  const timed = events
    .filter((e) => !e.allDay)
    .map((e) => ({ ...e, startMin: minutesSinceMidnight(new Date(e.start)), endMin: Math.max(minutesSinceMidnight(new Date(e.end)), minutesSinceMidnight(new Date(e.start)) + 20) }))
    .sort((a, b) => a.startMin - b.startMin)

  const columnEnds = []
  const placed = timed.map((e) => {
    let col = columnEnds.findIndex((end) => end <= e.startMin)
    if (col === -1) {
      col = columnEnds.length
      columnEnds.push(e.endMin)
    } else {
      columnEnds[col] = e.endMin
    }
    return { ...e, col }
  })
  const colCount = Math.max(columnEnds.length, 1)
  return placed.map((e) => ({ ...e, colCount }))
}

function eventsForDay(events, day) {
  return events.filter((e) => new Date(e.start).toDateString() === day.toDateString())
}

function DayHeader({ day, compact }) {
  const isToday = day.toDateString() === new Date().toDateString()
  return (
    <div className="flex flex-col items-center gap-1 border-l border-white/[0.05] py-2 first:border-l-0">
      <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[#666666]">
        {day.toLocaleDateString('es', { weekday: compact ? undefined : 'short' })}
      </span>
      <span
        className="flex h-7 w-7 items-center justify-center rounded-full text-[13px]"
        style={{ background: isToday ? '#1E5FAD' : 'transparent', color: isToday ? '#F5F5F5' : '#F5F5F5', fontWeight: isToday ? 600 : 400 }}
      >
        {day.getDate()}
      </span>
    </div>
  )
}

function AllDayStrip({ days, events }) {
  const allDayByDay = days.map((d) => eventsForDay(events, d).filter((e) => e.allDay))
  if (!allDayByDay.some((list) => list.length > 0)) return null
  return (
    <div className="grid border-b border-white/[0.06]" style={{ gridTemplateColumns: `${GUTTER_WIDTH}px repeat(${days.length}, 1fr)` }}>
      <div />
      {allDayByDay.map((list, i) => (
        <div key={i} className="flex flex-col gap-1 border-l border-white/[0.05] px-1.5 py-1.5 first:border-l-0">
          {list.map((e) => (
            <a
              key={e.id}
              href={e.htmlLink}
              target="_blank"
              rel="noreferrer"
              className="truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium text-white"
              style={{ background: eventColor(e) }}
            >
              {e.title}
            </a>
          ))}
        </div>
      ))}
    </div>
  )
}

export default function CalendarioGrid({ days, events, scrollRef }) {
  const now = new Date()
  const showNowLine = days.some((d) => d.toDateString() === now.toDateString())
  const nowTop = (minutesSinceMidnight(now) / 60) * ROW_HEIGHT

  const internalRef = useRef(null)
  const containerRef = scrollRef || internalRef
  const daysKey = days.map((d) => d.toDateString()).join(',')

  // Open scrolled to roughly the current time — same "don't make me scroll
  // from midnight" behavior Apple/Google Calendar both default to — rather
  // than always starting at 12 AM. Falls back to a reasonable 8 AM start
  // for a range that doesn't include today (e.g. paging to a future week).
  useEffect(() => {
    if (!containerRef.current) return
    const target = showNowLine ? Math.max(nowTop - ROW_HEIGHT * 2, 0) : 8 * ROW_HEIGHT
    containerRef.current.scrollTop = target
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daysKey])

  return (
    <div className="ador-glass ador-grain overflow-hidden rounded-2xl">
      <div className="grid" style={{ gridTemplateColumns: `${GUTTER_WIDTH}px repeat(${days.length}, 1fr)` }}>
        <div />
        {days.map((d) => (
          <DayHeader key={d.toISOString()} day={d} compact={days.length > 1} />
        ))}
      </div>

      <AllDayStrip days={days} events={events} />

      <div ref={containerRef} className="max-h-[640px] overflow-y-auto">
        <div className="relative grid" style={{ gridTemplateColumns: `${GUTTER_WIDTH}px repeat(${days.length}, 1fr)`, height: HOURS.length * ROW_HEIGHT }}>
          {/* Hour labels */}
          <div className="relative">
            {HOURS.map((h) => (
              <div key={h} className="absolute right-2 -translate-y-1/2 text-[10px] text-[#444444]" style={{ top: (h - START_HOUR) * ROW_HEIGHT }}>
                {formatHour(h)}
              </div>
            ))}
          </div>

          {days.map((day) => {
            const placed = layoutDay(eventsForDay(events, day))
            return (
              <div key={day.toISOString()} className="relative border-l border-white/[0.05]">
                {HOURS.map((h) => (
                  <div key={h} className="absolute w-full border-t border-white/[0.04]" style={{ top: (h - START_HOUR) * ROW_HEIGHT }} />
                ))}
                {placed.map((e) => {
                  const top = ((e.startMin - START_HOUR * 60) / 60) * ROW_HEIGHT
                  const height = Math.max(((e.endMin - e.startMin) / 60) * ROW_HEIGHT - 2, 18)
                  const width = 100 / e.colCount
                  return (
                    <a
                      key={e.id}
                      href={e.htmlLink}
                      target="_blank"
                      rel="noreferrer"
                      className="absolute overflow-hidden rounded-md px-1.5 py-1 text-[10.5px] font-medium leading-tight text-white shadow-sm transition-opacity duration-150 hover:opacity-90"
                      style={{
                        top,
                        height,
                        left: `${e.col * width}%`,
                        width: `calc(${width}% - 2px)`,
                        background: eventColor(e),
                      }}
                    >
                      <span className="block truncate">{e.title}</span>
                      {height > 32 && (
                        <span className="block truncate text-[9.5px] opacity-80">
                          {new Date(e.start).toLocaleTimeString('es', { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      )}
                    </a>
                  )
                })}
              </div>
            )
          })}

          {showNowLine && (
            <div className="pointer-events-none absolute flex items-center" style={{ top: nowTop, left: GUTTER_WIDTH, right: 0 }}>
              <span className="h-2 w-2 flex-shrink-0 rounded-full bg-[#EF5350]" style={{ marginLeft: -4 }} />
              <div className="h-px flex-1 bg-[#EF5350]" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
