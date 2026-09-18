import { eventColor } from '../../lib/googleCalendar'
import { energyAt, ENERGY_PEAKS } from '../../lib/energyCurve'

// Hour-row × day-column grid, shared by Día (1 column) and Semana (7
// columns) — same component, just a different `days` array. Positions
// timed events by pixel offset (startMinutes/60 * ROW_HEIGHT) rather than
// CSS grid rows, so a 30-minute event and a 90-minute event are visually
// proportional, matching how every real calendar app draws time.

const ROW_HEIGHT = 56
const START_HOUR = 0
const END_HOUR = 24
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)

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

function AllDayStrip({ days, events, gutterWidth }) {
  const allDayByDay = days.map((d) => eventsForDay(events, d).filter((e) => e.allDay))
  if (!allDayByDay.some((list) => list.length > 0)) return null
  return (
    <div className="grid border-b border-white/[0.06]" style={{ gridTemplateColumns: `${gutterWidth}px repeat(${days.length}, 1fr)` }}>
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

// A smooth-ish path through the typical-energy curve, sampled every 20
// minutes so the line has enough points to read as a curve rather than a
// jagged polyline. Purely decorative/informational — see lib/energyCurve.js
// for why this is a generic pattern, never personal data.
function energyPathD(totalHeight, gutterWidth) {
  const step = 1 / 3 // hours
  const points = []
  for (let h = 0; h <= 24; h += step) {
    const v = energyAt(h)
    const x = 6 + (v / 100) * (gutterWidth - 34)
    const y = (h / 24) * totalHeight
    points.push([x, y])
  }
  return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
}

export default function CalendarioGrid({ days, events, scrollRef, energyCurve }) {
  const now = new Date()
  const showNowLine = days.some((d) => d.toDateString() === now.toDateString())
  const nowTop = (minutesSinceMidnight(now) / 60) * ROW_HEIGHT
  const totalHeight = HOURS.length * ROW_HEIGHT
  const gutterWidth = energyCurve ? 88 : 56

  return (
    <div className="ador-glass ador-grain overflow-hidden rounded-2xl">
      {energyCurve && (
        <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-4 py-2">
          <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#4CAF50]" />
          <p className="text-[11px] text-[#666666]">
            Patrón típico de energía — general, no es tu dato personal. Los picos son buen momento para tu trabajo más exigente.
          </p>
        </div>
      )}
      <div className="grid" style={{ gridTemplateColumns: `${gutterWidth}px repeat(${days.length}, 1fr)` }}>
        <div />
        {days.map((d) => (
          <DayHeader key={d.toISOString()} day={d} compact={days.length > 1} />
        ))}
      </div>

      <AllDayStrip days={days} events={events} gutterWidth={gutterWidth} />

      <div ref={scrollRef} className="max-h-[640px] overflow-y-auto">
        <div className="relative grid" style={{ gridTemplateColumns: `${gutterWidth}px repeat(${days.length}, 1fr)`, height: totalHeight }}>
          {/* Hour labels (+ the typical-energy curve, Día view only) */}
          <div className="relative">
            {energyCurve && (
              <svg className="absolute left-0 top-0" width={gutterWidth} height={totalHeight} viewBox={`0 0 ${gutterWidth} ${totalHeight}`}>
                <path d={energyPathD(totalHeight, gutterWidth)} fill="none" stroke="#4CAF50" strokeWidth="1.5" strokeLinecap="round" opacity="0.55" />
              </svg>
            )}
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
                {energyCurve &&
                  ENERGY_PEAKS.map((peak, i) => (
                    <div
                      key={i}
                      className="absolute w-full"
                      style={{ top: peak.start * ROW_HEIGHT, height: (peak.end - peak.start) * ROW_HEIGHT, background: 'rgba(76,175,80,0.06)' }}
                    >
                      <span
                        className="absolute left-1.5 top-1 rounded-full px-2 py-0.5 text-[9.5px] font-medium text-[#4CAF50]"
                        style={{ background: 'rgba(76,175,80,0.14)' }}
                      >
                        Pico de energía
                      </span>
                    </div>
                  ))}
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
            <div className="pointer-events-none absolute flex items-center" style={{ top: nowTop, left: gutterWidth, right: 0 }}>
              <span className="h-2 w-2 flex-shrink-0 rounded-full bg-[#EF5350]" style={{ marginLeft: -4 }} />
              <div className="h-px flex-1 bg-[#EF5350]" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
