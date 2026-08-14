import { useEffect, useRef, useState } from 'react'
import { priorityMeta, statusMeta } from '../../lib/workspace'

const DAY_MS = 86400000

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}
function addDays(date, n) {
  return new Date(date.getTime() + n * DAY_MS)
}
function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}
function addMonths(date, n) {
  return new Date(date.getFullYear(), date.getMonth() + n, 1)
}
function startOfQuarter(date) {
  return new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3, 1)
}
function quarterLabel(date) {
  return `T${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`
}
function shortDate(date) {
  return date.toLocaleDateString('es', { day: 'numeric', month: 'short' }).replace('.', '')
}
function monthLabel(date) {
  const label = date.toLocaleDateString('es', { month: 'short' }).replace('.', '')
  return date.getMonth() === 0 ? `${label} ${date.getFullYear()}` : label
}

// Each granularity controls three independent things: how zoomed-in the
// pixel scale is (pxPerDay), how far the default window reaches before/after
// today (real task dates always extend this if they fall outside it — see
// below), and how the axis ticks are generated/labeled. Day and week tick by
// calendar day; month/quarter/year tick by calendar unit so labels land on
// real month/quarter/year boundaries instead of arbitrary N-day offsets.
const RANGES = {
  dia: {
    label: 'Día',
    pxPerDay: 72,
    padBefore: 2,
    padAfter: 12,
    minBarWidth: 110,
    ticks(min, max) {
      const out = []
      for (let d = startOfDay(min); d <= max; d = addDays(d, 1)) out.push(d)
      return out
    },
    format: shortDate,
  },
  semana: {
    label: 'Semana',
    pxPerDay: 22,
    padBefore: 7,
    padAfter: 35,
    minBarWidth: 90,
    ticks(min, max) {
      const out = []
      for (let d = startOfDay(min); d <= max; d = addDays(d, 7)) out.push(d)
      return out
    },
    format: shortDate,
  },
  mes: {
    label: 'Mes',
    pxPerDay: 8,
    padBefore: 14,
    padAfter: 120,
    minBarWidth: 70,
    ticks(min, max) {
      const out = []
      for (let d = startOfMonth(min); d <= max; d = addMonths(d, 1)) out.push(d)
      return out
    },
    format: monthLabel,
  },
  trimestre: {
    label: 'Trimestre',
    pxPerDay: 3,
    padBefore: 20,
    padAfter: 270,
    minBarWidth: 56,
    ticks(min, max) {
      const out = []
      for (let d = startOfQuarter(min); d <= max; d = addMonths(d, 3)) out.push(d)
      return out
    },
    format: quarterLabel,
  },
  año: {
    label: 'Año',
    pxPerDay: 1.4,
    padBefore: 30,
    padAfter: 420,
    minBarWidth: 44,
    ticks(min, max) {
      const out = []
      for (let d = startOfMonth(min); d <= max; d = addMonths(d, 1)) out.push(d)
      return out
    },
    format: monthLabel,
  },
}

const RANGE_ORDER = ['dia', 'semana', 'mes', 'trimestre', 'año']

export default function TimelineView({ workstreams, tasksByWorkstream, onOpenTask }) {
  const [hoverTaskId, setHoverTaskId] = useState(null)
  const [range, setRange] = useState('semana')
  const config = RANGES[range]
  const scrollRef = useRef(null)

  const now = startOfDay(new Date())
  const datedByWorkstream = workstreams
    .map((w) => ({ workstream: w, tasks: (tasksByWorkstream.get(w.id) || []).filter((t) => t.dueDate?.toDate) }))
    .filter((g) => g.tasks.length > 0)
  const hasDatedTasks = datedByWorkstream.length > 0

  const allDates = [now]
  for (const group of datedByWorkstream) {
    for (const task of group.tasks) {
      const due = startOfDay(task.dueDate.toDate())
      const start = task.startDate?.toDate?.() ? startOfDay(task.startDate.toDate()) : due
      allDates.push(start, due)
    }
  }

  const rawMin = new Date(Math.min(...allDates.map((d) => d.getTime())))
  const rawMax = new Date(Math.max(...allDates.map((d) => d.getTime())))
  // Real task dates always win over the granularity's default window — a
  // task due in 4 months still shows up in "Día" view, just far down the
  // (scrollable) track, rather than being silently clipped.
  const minDate = new Date(Math.min(rawMin.getTime(), now.getTime()) - config.padBefore * DAY_MS)
  const maxDate = new Date(Math.max(rawMax.getTime(), now.getTime()) + config.padAfter * DAY_MS)
  const spanDays = Math.max(1, Math.round((maxDate - minDate) / DAY_MS))
  const trackWidth = Math.max(600, spanDays * config.pxPerDay)

  const dateToX = (date) => ((date.getTime() - minDate.getTime()) / DAY_MS) * config.pxPerDay

  const ticks = config.ticks(minDate, maxDate)
  const nowX = dateToX(now)
  const spanLabel = spanDays >= 60 ? `${(spanDays / 30).toFixed(1).replace('.0', '')} meses` : `${spanDays} días`

  // Center the scroll on "Hoy" whenever the range/track changes — without
  // this, a track that extends far into the future (a real task due in
  // months) leaves the viewport parked at the far-left edge by default,
  // showing mostly empty space instead of what's actually relevant now.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollLeft = Math.max(0, nowX - el.clientWidth / 2)
  }, [range, nowX])

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[12px] text-[#888888]">Rango visible: {spanLabel}</span>
        <div className="ador-glass flex items-center gap-1 rounded-full p-1">
          {RANGE_ORDER.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setRange(id)}
              className="rounded-full px-3 py-1 text-[12px] font-medium transition-colors duration-150"
              style={{ background: range === id ? '#1E5FAD' : 'transparent', color: range === id ? '#F5F5F5' : '#888888' }}
            >
              {RANGES[id].label}
            </button>
          ))}
        </div>
      </div>

      <div ref={scrollRef} className="overflow-x-auto pb-4">
        <div className="relative" style={{ width: trackWidth, minWidth: '100%' }}>
          {/* Date axis */}
          <div className="relative flex h-8 items-center border-b border-white/[0.06]">
            {ticks.map((tick) => (
              <span
                key={tick.getTime()}
                className="absolute whitespace-nowrap text-[11px] text-[#444444]"
                style={{ left: dateToX(tick), transform: 'translateX(-50%)' }}
              >
                {config.format(tick)}
              </span>
            ))}
            <span
              className="absolute rounded-full px-2 py-0.5 font-medium"
              style={{ left: nowX, transform: 'translateX(-50%)', fontSize: 10, background: 'rgba(30,95,173,0.2)', color: '#1E5FAD' }}
            >
              Hoy
            </span>
          </div>

          {/* Now line spans the whole board */}
          <div className="pointer-events-none absolute bottom-0 top-8 w-px" style={{ left: nowX, background: 'rgba(30,95,173,0.5)' }} />

          {!hasDatedTasks && (
            <div className="flex flex-col items-center gap-3 py-16">
              <div className="ador-skeleton h-[2px] w-1/3 rounded-full" />
              <p className="text-[14px] font-light text-[#444444]">
                Sin tareas con fecha límite todavía — ponle fecha a una tarea desde su panel de detalle para que aparezca aquí.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-6 pt-5">
            {datedByWorkstream.map(({ workstream, tasks }) => {
              const accent = workstream.kind === 'intervencion' ? '#1E5FAD' : '#B8860B'
              return (
                <div key={workstream.id}>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: accent }} />
                    <span className="text-[12px] font-medium text-[#888888]">{workstream.name}</span>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    {tasks.map((task) => {
                      const due = startOfDay(task.dueDate.toDate())
                      const hasStart = Boolean(task.startDate?.toDate)
                      const start = hasStart ? startOfDay(task.startDate.toDate()) : due
                      const isMilestone = !hasStart || start.getTime() === due.getTime()
                      const status = statusMeta(task.status)
                      const priority = priorityMeta(task.priority)
                      const days = Math.max(1, Math.round((due - start) / DAY_MS))
                      const left = dateToX(start)
                      const width = Math.max(config.minBarWidth, dateToX(due) - dateToX(start))
                      const hovering = hoverTaskId === task.id

                      return (
                        <div key={task.id} className="relative h-9">
                          {isMilestone ? (
                            <div
                              className="absolute flex cursor-pointer items-center gap-2"
                              style={{ left, top: '50%', transform: 'translateY(-50%)' }}
                              onClick={() => onOpenTask(task)}
                              onMouseEnter={() => setHoverTaskId(task.id)}
                              onMouseLeave={() => setHoverTaskId(null)}
                            >
                              <span
                                className="h-3 w-3 flex-shrink-0"
                                style={{ background: status.color, transform: 'rotate(45deg)', borderRadius: 2 }}
                              />
                              <span className="whitespace-nowrap text-[13px] text-[#F5F5F5]">{task.title}</span>
                            </div>
                          ) : (
                            <div
                              className="absolute flex h-9 cursor-pointer items-center justify-between gap-2 overflow-hidden rounded-full border px-3.5"
                              style={{
                                left,
                                width,
                                borderColor: `${status.color}55`,
                                background: `${status.color}22`,
                              }}
                              onClick={() => onOpenTask(task)}
                              onMouseEnter={() => setHoverTaskId(task.id)}
                              onMouseLeave={() => setHoverTaskId(null)}
                            >
                              <span className="truncate text-[13px] font-medium text-[#F5F5F5]">{task.title}</span>
                              {width >= 60 && (
                                <span
                                  className="flex-shrink-0 rounded-full px-2 py-0.5 font-medium"
                                  style={{ fontSize: 10, background: 'rgba(255,255,255,0.12)', color: '#F5F5F5' }}
                                >
                                  {days}d
                                </span>
                              )}
                            </div>
                          )}

                          {hovering && (
                            <div
                              className="ador-modal-surface pointer-events-none absolute z-10 rounded-xl px-3.5 py-2.5"
                              style={{ left, bottom: '100%', marginBottom: 8, whiteSpace: 'nowrap' }}
                            >
                              <div className="text-[13px] font-medium text-[#F5F5F5]">{task.title}</div>
                              <div className="mt-1 flex items-center gap-2 text-[11px]">
                                <span style={{ color: status.color }}>{status.label}</span>
                                <span style={{ color: priority.color }}>· Prioridad {priority.label}</span>
                              </div>
                              <div className="text-[11px] text-[#444444]">Vence {shortDate(due)}</div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
