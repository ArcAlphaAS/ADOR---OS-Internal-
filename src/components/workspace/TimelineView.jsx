import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { priorityMeta, statusMeta, timelineEnd } from '../../lib/workspace'
import { applyTaskUpdate } from '../../lib/firestore'
import { useToast } from '../../hooks/useToast'

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

export default function TimelineView({ workstreams, tasksByWorkstream, onOpenTask, actorUserId, actorName }) {
  const showToast = useToast()
  const [hoverTaskId, setHoverTaskId] = useState(null)
  // Dragging a bar (move it, or pull either end) reschedules the task. Mouse
  // only: on touch a horizontal drag has to keep scrolling the board.
  const canDrag = typeof window !== 'undefined' && window.matchMedia?.('(pointer: fine)').matches
  const [drag, setDrag] = useState(null) // { task, mode, startX, origStart, origEnd, deltaDays, moved }
  const [links, setLinks] = useState([]) // dependency arrows, measured from the DOM
  const trackRef = useRef(null)
  const dragRef = useRef(null)
  const [range, setRange] = useState('semana')
  const config = RANGES[range]
  const scrollRef = useRef(null)

  const now = startOfDay(new Date())
  const datedByWorkstream = workstreams
    .map((w) => ({ workstream: w, tasks: (tasksByWorkstream.get(w.id) || []).filter((t) => timelineEnd(t)) }))
    .filter((g) => g.tasks.length > 0)
  const hasDatedTasks = datedByWorkstream.length > 0

  const allDates = [now]
  for (const group of datedByWorkstream) {
    for (const task of group.tasks) {
      const due = startOfDay(timelineEnd(task))
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

  dragRef.current = drag
  const clampDelta = (d, mode, origStart, origEnd) => {
    const len = Math.round((origEnd - origStart) / DAY_MS)
    if (mode === 'start') return Math.min(d, len)
    if (mode === 'end') return Math.max(d, -len)
    return d
  }

  useEffect(() => {
    if (!drag) return
    const onMove = (e) => {
      const raw = Math.round((e.clientX - drag.startX) / config.pxPerDay)
      const d = clampDelta(raw, drag.mode, drag.origStart, drag.origEnd)
      setDrag((cur) => (cur ? { ...cur, deltaDays: d, moved: cur.moved || Math.abs(e.clientX - drag.startX) > 4 } : cur))
    }
    const onUp = () => {
      // Read the drag from a ref, not inside a state updater — updaters can
      // run twice (StrictMode) and this must write to Firestore only once.
      const cur = dragRef.current
      setDrag(null)
      if (!cur) return
      if (!cur.moved) onOpenTask(cur.task)
      else if (cur.deltaDays !== 0) {
        const { task, mode, origStart, origEnd, deltaDays: d, milestone } = cur
        const newStart = mode === 'end' ? origStart : addDays(origStart, d)
        const newEnd = mode === 'start' ? origEnd : addDays(origEnd, d)
        const patch = milestone ? { dueDate: newEnd, ...(task.endDate ? { endDate: newEnd } : {}) } : { startDate: newStart, endDate: newEnd }
        applyTaskUpdate(task, patch, actorUserId, actorName).catch((err) => showToast(`No se pudo reprogramar: ${err.message}`))
      }
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [drag?.task?.id, drag?.mode, config.pxPerDay])

  // What a task looks like right now: its saved dates, shifted by an
  // in-progress drag.
  const geometry = (task) => {
    const end = startOfDay(timelineEnd(task))
    const hasStart = Boolean(task.startDate?.toDate)
    const start = hasStart ? startOfDay(task.startDate.toDate()) : end
    const milestone = !hasStart || start.getTime() === end.getTime()
    if (drag && drag.task.id === task.id && drag.deltaDays) {
      const d = drag.deltaDays
      return { milestone, start: drag.mode === 'end' ? start : addDays(start, d), end: drag.mode === 'start' ? end : addDays(end, d), base: { start, end } }
    }
    return { milestone, start, end, base: { start, end } }
  }

  // Dependency arrows ("blockedBy") — measured after layout so they follow
  // whatever the rows' real positions are.
  const allDated = datedByWorkstream.flatMap((g) => g.tasks)
  useLayoutEffect(() => {
    const track = trackRef.current
    if (!track) return
    const box = track.getBoundingClientRect()
    const rowY = (id) => {
      const el = track.querySelector(`[data-task-row="${id}"]`)
      if (!el) return null
      const r = el.getBoundingClientRect()
      return r.top - box.top + r.height / 2
    }
    const next = []
    for (const task of allDated) {
      for (const depId of task.blockedBy || []) {
        const dep = allDated.find((t) => t.id === depId)
        if (!dep) continue
        const y1 = rowY(dep.id)
        const y2 = rowY(task.id)
        if (y1 === null || y2 === null) continue
        const a = geometry(dep)
        const b = geometry(task)
        const x1 = dateToX(a.end) + (a.milestone ? 8 : 0)
        const x2 = dateToX(b.start)
        next.push({ id: `${dep.id}>${task.id}`, x1, y1, x2, y2, conflict: b.start < a.end, from: dep.title, to: task.title })
      }
    }
    setLinks((cur) => (JSON.stringify(cur) === JSON.stringify(next) ? cur : next))
  })

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
        <div ref={trackRef} className="relative" style={{ width: trackWidth, minWidth: '100%' }}>
          {/* Date axis */}
          <div className="relative flex h-8 items-center border-b border-white/[0.06]">
            {ticks
              .filter((tick) => Math.abs(dateToX(tick) - nowX) > 26)
              .map((tick) => (
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

          {links.length > 0 && (
            <svg className="pointer-events-none absolute inset-0 z-[5]" width="100%" height="100%" style={{ overflow: 'visible' }}>
              <defs>
                <marker id="dep-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M0 0L8 4L0 8z" fill="#999999" />
                </marker>
                <marker id="dep-arrow-bad" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M0 0L8 4L0 8z" fill="#EF5350" />
                </marker>
              </defs>
              {links.map((l) => (
                <path
                  key={l.id}
                  d={`M ${l.x1} ${l.y1} C ${l.x1 + 36} ${l.y1}, ${l.x2 - 36} ${l.y2}, ${l.x2} ${l.y2}`}
                  fill="none"
                  stroke={l.conflict ? '#EF5350' : '#999999'}
                  strokeWidth="1.4"
                  strokeDasharray={l.conflict ? '4 3' : undefined}
                  markerEnd={`url(#${l.conflict ? 'dep-arrow-bad' : 'dep-arrow'})`}
                >
                  <title>{l.conflict ? `“${l.to}” empieza antes de que termine “${l.from}”` : `“${l.to}” espera a “${l.from}”`}</title>
                </path>
              ))}
            </svg>
          )}

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
                      const { milestone: isMilestone, start, end: due } = geometry(task)
                      const status = statusMeta(task.status)
                      const priority = priorityMeta(task.priority)
                      const days = Math.max(1, Math.round((due - start) / DAY_MS))
                      const left = dateToX(start)
                      const width = Math.max(config.minBarWidth, dateToX(due) - dateToX(start))
                      const hovering = hoverTaskId === task.id && !drag
                      const dragging = drag?.task.id === task.id
                      const begin = (mode) => (e) => {
                        if (!canDrag || e.button !== 0) return
                        e.preventDefault()
                        e.stopPropagation()
                        const g = geometry(task)
                        setDrag({ task, mode, startX: e.clientX, origStart: g.base.start, origEnd: g.base.end, deltaDays: 0, moved: false, milestone: g.milestone })
                      }
                      const dated = (task.subtasks || []).filter((x) => x.dueDate)

                      return (
                        <div key={task.id} data-task-row={task.id} className="relative h-9">
                          {isMilestone ? (
                            <div
                              className={`absolute flex items-center gap-2 ${canDrag ? 'cursor-grab' : 'cursor-pointer'} ${dragging ? 'cursor-grabbing' : ''}`}
                              style={{ left, top: '50%', transform: 'translateY(-50%)', touchAction: 'pan-y' }}
                              onPointerDown={begin('move')}
                              onClick={() => !canDrag && onOpenTask(task)}
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
                              className={`absolute flex h-9 items-center justify-between gap-2 overflow-hidden rounded-full border px-3.5 ${canDrag ? 'cursor-grab' : 'cursor-pointer'} ${dragging ? 'cursor-grabbing' : ''}`}
                              style={{
                                left,
                                width,
                                borderColor: `${status.color}55`,
                                background: `${status.color}22`,
                                touchAction: 'pan-y',
                                boxShadow: dragging ? `0 0 0 1px ${status.color}` : undefined,
                              }}
                              onPointerDown={begin('move')}
                              onClick={() => !canDrag && onOpenTask(task)}
                              onMouseEnter={() => setHoverTaskId(task.id)}
                              onMouseLeave={() => setHoverTaskId(null)}
                            >
                              {canDrag && <span className="absolute inset-y-0 left-0 w-2.5 cursor-ew-resize" onPointerDown={begin('start')} />}
                              <span className="truncate text-[13px] font-medium text-[#F5F5F5]">{task.title}</span>
                              {width >= 60 && (
                                <span
                                  className="flex-shrink-0 rounded-full px-2 py-0.5 font-medium"
                                  style={{ fontSize: 10, background: 'rgba(255,255,255,0.12)', color: '#F5F5F5' }}
                                >
                                  {days}d
                                </span>
                              )}
                              {canDrag && <span className="absolute inset-y-0 right-0 w-2.5 cursor-ew-resize" onPointerDown={begin('end')} />}
                            </div>
                          )}

                          {/* Dated subtasks: thin capsules along the bar's lower
                              edge, green once done. */}
                          {dated.map((sub) => {
                            const sEnd = startOfDay(new Date(`${sub.dueDate}T00:00:00`))
                            const sStart = sub.startDate ? startOfDay(new Date(`${sub.startDate}T00:00:00`)) : sEnd
                            const sl = dateToX(sStart)
                            const sw = Math.max(8, dateToX(sEnd) - dateToX(sStart))
                            return (
                              <span
                                key={sub.id}
                                title={`${sub.title} · ${shortDate(sEnd)}`}
                                className="pointer-events-none absolute bottom-[3px] h-[4px] rounded-full"
                                style={{ left: sl, width: sw, background: sub.done ? '#4CAF50' : '#E8C15A', opacity: 0.9 }}
                              />
                            )
                          })}

                          {(hovering || dragging) && (
                            <div
                              className="ador-modal-surface pointer-events-none absolute z-10 rounded-xl px-3.5 py-2.5"
                              style={{ left, bottom: '100%', marginBottom: 8, whiteSpace: 'nowrap' }}
                            >
                              <div className="text-[13px] font-medium text-[#F5F5F5]">{task.title}</div>
                              <div className="mt-1 flex items-center gap-2 text-[11px]">
                                <span style={{ color: status.color }}>{status.label}</span>
                                <span style={{ color: priority.color }}>· Prioridad {priority.label}</span>
                              </div>
                              <div className="text-[11px] text-[#888888]">{isMilestone ? `Fecha ${shortDate(due)}` : `${shortDate(start)} → ${shortDate(due)}`}</div>
                              {canDrag && !dragging && <div className="text-[10.5px] text-[#555555]">Arrastra para mover · estira los bordes para cambiar la duración</div>}
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
