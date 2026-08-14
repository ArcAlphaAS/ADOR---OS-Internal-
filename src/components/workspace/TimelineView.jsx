import { useState } from 'react'
import { priorityMeta, statusMeta } from '../../lib/workspace'

const PX_PER_DAY = 30
const MIN_BAR_WIDTH = 90
const DAY_MS = 86400000

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function pickTickStepDays(spanDays) {
  if (spanDays <= 14) return 1
  if (spanDays <= 40) return 5
  if (spanDays <= 90) return 10
  return 15
}

function formatShort(date) {
  return date.toLocaleDateString('es', { day: 'numeric', month: 'short' }).replace('.', '')
}

export default function TimelineView({ workstreams, tasksByWorkstream, onOpenTask }) {
  const [hoverTaskId, setHoverTaskId] = useState(null)

  const now = startOfDay(new Date())
  const datedByWorkstream = workstreams
    .map((w) => ({ workstream: w, tasks: (tasksByWorkstream.get(w.id) || []).filter((t) => t.dueDate?.toDate) }))
    .filter((g) => g.tasks.length > 0)

  const allDates = [now]
  for (const group of datedByWorkstream) {
    for (const task of group.tasks) {
      const due = startOfDay(task.dueDate.toDate())
      const start = task.startDate?.toDate?.() ? startOfDay(task.startDate.toDate()) : due
      allDates.push(start, due)
    }
  }

  if (datedByWorkstream.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-24">
        <div className="ador-skeleton h-[2px] w-1/3 rounded-full" />
        <p className="text-[14px] font-light text-[#444444]">
          Sin tareas con fecha límite todavía — el Timeline se dibuja solo cuando las tareas tienen fechas.
        </p>
      </div>
    )
  }

  const rawMin = new Date(Math.min(...allDates.map((d) => d.getTime())))
  const rawMax = new Date(Math.max(...allDates.map((d) => d.getTime())))
  const minDate = new Date(rawMin.getTime() - 3 * DAY_MS)
  const maxDate = new Date(rawMax.getTime() + 5 * DAY_MS)
  const spanDays = Math.max(1, Math.round((maxDate - minDate) / DAY_MS))
  const trackWidth = spanDays * PX_PER_DAY

  const dateToX = (date) => ((date.getTime() - minDate.getTime()) / DAY_MS) * PX_PER_DAY

  const tickStep = pickTickStepDays(spanDays)
  const ticks = []
  for (let d = 0; d <= spanDays; d += tickStep) {
    ticks.push(new Date(minDate.getTime() + d * DAY_MS))
  }

  const nowX = dateToX(now)
  const totalMonths = (spanDays / 30).toFixed(1).replace('.0', '')

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[12px] text-[#888888]">Duración visible: {totalMonths} meses</span>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="relative" style={{ width: trackWidth, minWidth: '100%' }}>
          {/* Date axis */}
          <div className="relative flex h-8 items-center border-b border-white/[0.06]">
            {ticks.map((tick) => (
              <span
                key={tick.getTime()}
                className="absolute text-[11px] text-[#444444]"
                style={{ left: dateToX(tick), transform: 'translateX(-50%)' }}
              >
                {formatShort(tick)}
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
                      const width = Math.max(MIN_BAR_WIDTH, dateToX(due) - dateToX(start))
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
                              <span
                                className="flex-shrink-0 rounded-full px-2 py-0.5 font-medium"
                                style={{ fontSize: 10, background: 'rgba(255,255,255,0.12)', color: '#F5F5F5' }}
                              >
                                {days}d
                              </span>
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
                              <div className="text-[11px] text-[#444444]">Vence {formatShort(due)}</div>
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
