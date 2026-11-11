import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { eventColor } from '../../lib/googleCalendar'
import { toggleTaskComplete } from '../../lib/firestore'
import { withTimeout } from '../../lib/workspace'
import { useToast } from '../../hooks/useToast'
import { CheckCircleIcon } from '../icons'

// Hour-row × day-column grid, shared by Día (1 column) and Semana (7
// columns) — same component, just a different `days` array. Positions
// timed events by pixel offset (startMinutes/60 * ROW_HEIGHT) rather than
// CSS grid rows, so a 30-minute event and a 90-minute event are visually
// proportional, matching how every real calendar app draws time.

const ROW_HEIGHT = 56
const GUTTER_WIDTH = 56
// Rango visible por defecto: la jornada (7:00–22:00). Se amplía solo si hay algo fuera,
// y "24 h" muestra el día completo.
const DEFAULT_START = 7
const DEFAULT_END = 22
const hhmm24 = (v) => new Date(v).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false })

// Huecos libres de ≥ 90 min entre 9:00 y 19:00 (desde ahora si es hoy), solo en días que ya
// tienen reuniones con hora: un día vacío entero no necesita decir "libre".
function freeGapsOf(timedEvents, day, now) {
  if (timedEvents.length === 0) return []
  const dayStart = new Date(day); dayStart.setHours(9, 0, 0, 0)
  const dayEnd = new Date(day); dayEnd.setHours(19, 0, 0, 0)
  const isToday = day.toDateString() === now.toDateString()
  if (dayEnd < now) return []
  let cursor = isToday ? new Date(Math.max(dayStart.getTime(), now.getTime())) : dayStart
  const busy = timedEvents.map((e) => [new Date(e.start).getTime(), new Date(e.end).getTime()]).sort((a, b) => a[0] - b[0])
  const gaps = []
  for (const [st, en] of busy) {
    if (en <= cursor.getTime()) continue
    if (st - cursor.getTime() >= 90 * 60000) gaps.push([cursor, new Date(st)])
    cursor = new Date(Math.max(cursor.getTime(), en))
  }
  if (dayEnd.getTime() - cursor.getTime() >= 90 * 60000) gaps.push([cursor, dayEnd])
  return gaps
}

// Vista previa al pasar el cursor sobre un evento: lo esencial sin abrir nada.
function EventHoverCard({ hover, onEnter, onLeave, onOpen }) {
  const { event: e, rect } = hover
  const color = eventColor(e)
  const W = 300
  const left = Math.min(Math.max(12, rect.right + 10 + W > window.innerWidth ? rect.left - W - 10 : rect.right + 10), window.innerWidth - W - 12)
  const top = Math.min(Math.max(12, rect.top), window.innerHeight - 260)
  const guests = (e.attendees || []).filter((a) => !a.self)
  const joinable = e.meetLink && new Date(e.end).getTime() > Date.now()
  return createPortal(
    <div onMouseEnter={onEnter} onMouseLeave={onLeave} className="fixed z-[70]" style={{ left, top, width: W }}>
      <div className="ador-modal-surface rounded-2xl p-4 shadow-[0_16px_48px_rgba(0,0,0,0.55)]">
        <div className="flex items-start gap-2.5">
          <span className="mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: color }} />
          <div className="min-w-0">
            <p className="text-[14.5px] font-semibold leading-snug text-[#F5F5F5]">{e.title}</p>
            <p className="mt-0.5 text-[12.5px] tabular-nums text-[#9A9A9A]">
              {new Date(e.start).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })} · {e.allDay ? 'Todo el día' : `${hhmm24(e.start)} – ${hhmm24(e.end)}`}
            </p>
          </div>
        </div>
        {e.location && <p className="mt-2.5 truncate text-[12.5px] text-[#B5B5B5]">📍 {e.location}</p>}
        {guests.length > 0 && (
          <p className="mt-2 text-[12.5px] leading-snug text-[#B5B5B5]">
            👥 {guests.slice(0, 4).map((g) => g.name.split(' ')[0]).join(', ')}{guests.length > 4 ? ` y ${guests.length - 4} más` : ''}
          </p>
        )}
        <div className="mt-3.5 flex gap-2">
          {joinable && (
            <a href={e.meetLink} target="_blank" rel="noreferrer" className="ador-btn-primary flex-1 rounded-full py-2 text-center text-[12.5px] font-semibold">Unirse a Meet</a>
          )}
          <button type="button" onClick={onOpen} className="flex-1 rounded-full bg-white/[0.08] py-2 text-[12.5px] font-medium text-[#F5F5F5] hover:bg-white/[0.14]">Ver detalle</button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes()
}

function formatHour(h) {
  return `${String(h).padStart(2, '0')}:00`
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

function DayHeader({ day, nEvents = 0, nTasks = 0 }) {
  const isToday = day.toDateString() === new Date().toDateString()
  return (
    <div className="flex flex-col items-center gap-1 border-l border-white/[0.05] pb-2 pt-3 first:border-l-0">
      <span className="text-[11px] font-medium text-[#8A8A8A] first-letter:uppercase">
        {day.toLocaleDateString('es', { weekday: 'short' }).replace('.', '')}
      </span>
      <span
        className="flex h-9 w-9 items-center justify-center rounded-full text-[18px] leading-none"
        style={{ background: isToday ? '#F5F5F5' : 'transparent', color: isToday ? '#0A0A0A' : '#F5F5F5', fontWeight: isToday ? 600 : 500 }}
      >
        {day.getDate()}
      </span>
      <span className="flex h-[5px] gap-[3px]" aria-hidden>
        {nEvents > 0 && <span className="h-[5px] w-[5px] rounded-full bg-[#F4EEE2]" />}
        {nTasks > 0 && <span className="h-[5px] w-[5px] rounded-full bg-[#E8C15A]" />}
      </span>
    </div>
  )
}

function AllDayStrip({ days, events, onOpenEvent }) {
  const allDayByDay = days.map((d) => eventsForDay(events, d).filter((e) => e.allDay))
  if (!allDayByDay.some((list) => list.length > 0)) return null
  return (
    <div className="grid border-b border-white/[0.06]" style={{ gridTemplateColumns: `${GUTTER_WIDTH}px repeat(${days.length}, minmax(0, 1fr))` }}>
      <div />
      {allDayByDay.map((list, i) => (
        <div key={i} className="flex flex-col gap-1 border-l border-white/[0.05] px-1.5 py-1.5 first:border-l-0">
          {list.map((e) => {
            const color = eventColor(e)
            return (
              <button
                key={e.id}
                type="button"
                onClick={() => onOpenEvent(e)}
                className="truncate rounded-md px-1.5 py-0.5 text-left text-[10px] font-medium"
                style={{ background: `${color}22`, borderLeft: `2px solid ${color}`, color }}
              >
                {e.title}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function tasksForDay(tasks, day) {
  return tasks.filter((t) => t.status !== 'completado' && t.dueDate?.toDate?.() && t.dueDate.toDate().toDateString() === day.toDateString())
}

// Workspace tasks have no real time-of-day (Estimación is date-only), so
// they're never placed at a fabricated hour in the timed grid below —
// shown instead as a compact strip, honest about being "due this day," not
// "at this hour." Visually distinct from Google events (dashed border,
// checkbox) so it never reads as a real calendar entry.
function TasksStrip({ days, tasks, actorName }) {
  const showToast = useToast()
  const byDay = days.map((d) => tasksForDay(tasks, d))
  if (!byDay.some((list) => list.length > 0)) return null

  const toggle = (task) => {
    withTimeout(toggleTaskComplete(task, actorName)).catch((error) => showToast(`No se pudo actualizar: ${error.message}`))
  }

  return (
    <div className="grid border-b border-white/[0.06]" style={{ gridTemplateColumns: `${GUTTER_WIDTH}px repeat(${days.length}, minmax(0, 1fr))` }}>
      <div className="flex items-center justify-end pr-2 text-[9px] text-[#8A8A8A]">Tareas</div>
      {byDay.map((list, i) => (
        <div key={i} className="flex flex-col gap-1 border-l border-white/[0.05] px-1.5 py-1.5 first:border-l-0">
          {list.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => toggle(t)}
              className="flex w-full items-center gap-1 truncate rounded-md border border-dashed border-white/[0.18] px-1.5 py-0.5 text-left text-[10px] font-medium text-[#CCCCCC] transition-colors duration-150 hover:border-white/[0.3]"
            >
              <CheckCircleIcon size={9} className="flex-shrink-0 text-[#8A8A8A]" />
              <span className="truncate">{t.title}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}

export default function CalendarioGrid({ days, events, scrollRef, tasks = [], actorName, onOpenEvent, canWrite = false, onCreateRange, onMoveEvent }) {
  const now = new Date()
  const showNowLine = days.some((d) => d.toDateString() === now.toDateString())
  const [full, setFull] = useState(false)
  const timedAll = days.flatMap((d) => eventsForDay(events, d).filter((e) => !e.allDay && e.end))
  const earliest = timedAll.reduce((m, e) => Math.min(m, new Date(e.start).getHours()), 24)
  const latest = timedAll.reduce((m, e) => Math.max(m, new Date(e.end).getHours() + (new Date(e.end).getMinutes() ? 1 : 0)), 0)
  const START_HOUR = full ? 0 : Math.min(DEFAULT_START, earliest)
  const END_HOUR = full ? 24 : Math.max(DEFAULT_END, Math.min(24, latest))
  const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)
  const nowTop = ((minutesSinceMidnight(now) - START_HOUR * 60) / 60) * ROW_HEIGHT

  const [hover, setHover] = useState(null)
  const hoverTimer = useRef(null)
  const showHover = (event, el) => {
    clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(() => setHover({ event, rect: el.getBoundingClientRect() }), 350)
  }
  const hideHover = () => {
    clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(() => setHover(null), 160)
  }
  useEffect(() => () => clearTimeout(hoverTimer.current), [])

  // ---- Gestos con el mouse: arrastrar en vacío = crear · arrastrar un evento = moverlo ·
  // arrastrar su borde inferior = cambiar la duración. Cada 15 min; solo si hay permiso de edición.
  const [drag, setDrag] = useState(null) // { kind, event?, dayKey, startMin, endMin }
  const dragRef = useRef(null)
  const justDragged = useRef(false)
  const snap = (min) => Math.round(min / 15) * 15
  const columnAt = (clientX) => {
    const cols = [...(containerRef.current?.querySelectorAll('[data-day]') || [])]
    return cols.find((c) => { const r = c.getBoundingClientRect(); return clientX >= r.left && clientX < r.right }) || null
  }
  const minuteAt = (col, clientY) => START_HOUR * 60 + ((clientY - col.getBoundingClientRect().top) / ROW_HEIGHT) * 60
  const atMinute = (dayKey, min) => { const d = new Date(dayKey); d.setHours(0, 0, 0, 0); d.setMinutes(min); return d }

  const beginDrag = (e, init) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || !canWrite) return
    dragRef.current = { ...init, x0: e.clientX, y0: e.clientY, active: false }
    const onMove = (ev) => {
      const d = dragRef.current
      if (!d) return
      if (!d.active && Math.hypot(ev.clientX - d.x0, ev.clientY - d.y0) < 6) return
      d.active = true
      const col = columnAt(ev.clientX) || [...containerRef.current.querySelectorAll('[data-day]')].find((c) => c.dataset.day === d.dayKey)
      if (!col) return
      const dayKey = d.kind === 'resize' ? d.dayKey : col.dataset.day
      const m = minuteAt(col, ev.clientY)
      let next
      if (d.kind === 'create') next = { dayKey: d.dayKey, startMin: Math.min(d.anchorMin, snap(m)), endMin: Math.max(d.anchorMin, snap(m)) }
      else if (d.kind === 'move') { const st = Math.max(0, Math.min(snap(m - d.offsetMin), 24 * 60 - d.durMin)); next = { dayKey, startMin: st, endMin: st + d.durMin } }
      else next = { dayKey, startMin: d.startMin, endMin: Math.max(d.startMin + 15, snap(m)) }
      setDrag({ kind: d.kind, event: d.event, ...next })
      d.last = next
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      const d = dragRef.current
      dragRef.current = null
      setDrag(null)
      if (!d?.active || !d.last) return
      justDragged.current = true
      setTimeout(() => { justDragged.current = false }, 0)
      const st = atMinute(d.last.dayKey, d.last.startMin), en = atMinute(d.last.dayKey, d.last.endMin)
      if (d.kind === 'create') { if (en - st >= 15 * 60000) onCreateRange?.(st, en < st + 30 * 60000 ? new Date(st.getTime() + 30 * 60000) : en) }
      else if (st.getTime() !== new Date(d.event.start).getTime() || en.getTime() !== new Date(d.event.end).getTime()) onMoveEvent?.(d.event, st, en)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const internalRef = useRef(null)
  const containerRef = scrollRef || internalRef
  const daysKey = days.map((d) => d.toDateString()).join(',')

  // Open scrolled to roughly the current time — same "don't make me scroll
  // from midnight" behavior Apple/Google Calendar both default to — rather
  // than always starting at 12 AM. Falls back to a reasonable 8 AM start
  // for a range that doesn't include today (e.g. paging to a future week).
  useEffect(() => {
    if (!containerRef.current) return
    const target = showNowLine ? Math.max(nowTop - ROW_HEIGHT * 2, 0) : Math.max((8 - START_HOUR) * ROW_HEIGHT, 0)
    containerRef.current.scrollTop = target
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daysKey, full])

  return (
    <div className="ador-glass ador-grain overflow-hidden rounded-2xl">
      <div className="grid" style={{ gridTemplateColumns: `${GUTTER_WIDTH}px repeat(${days.length}, minmax(0, 1fr))` }}>
        <div className="flex items-end justify-center pb-3">
          <button type="button" onClick={() => setFull((v) => !v)} title={full ? 'Mostrar solo la jornada (7–22 h)' : 'Mostrar las 24 horas'} className="rounded-md px-1.5 py-0.5 text-[10px] font-medium text-[#8A8A8A] transition-colors hover:bg-white/[0.08] hover:text-[#F5F5F5]">
            {full ? 'Jornada' : '24 h'}
          </button>
        </div>
        {days.map((d) => (
          <DayHeader key={d.toISOString()} day={d} nEvents={eventsForDay(events, d).length} nTasks={tasksForDay(tasks, d).length} />
        ))}
      </div>

      <AllDayStrip days={days} events={events} onOpenEvent={onOpenEvent} />
      <TasksStrip days={days} tasks={tasks} actorName={actorName} />

      <div ref={containerRef} className="max-h-[640px] overflow-y-auto" style={drag ? { userSelect: 'none', cursor: drag.kind === 'resize' ? 'ns-resize' : 'grabbing' } : undefined}>
        <div className="relative grid" style={{ gridTemplateColumns: `${GUTTER_WIDTH}px repeat(${days.length}, minmax(0, 1fr))`, height: HOURS.length * ROW_HEIGHT }}>
          {/* Hour labels */}
          <div className="relative">
            {HOURS.map((h) => (
              <div key={h} className="absolute right-2 -translate-y-1/2 text-[10px] text-[#8A8A8A]" style={{ top: (h - START_HOUR) * ROW_HEIGHT }}>
                {formatHour(h)}
              </div>
            ))}
          </div>

          {days.map((day) => {
            const dayEvents = eventsForDay(events, day)
            const placed = layoutDay(dayEvents)
            const gaps = freeGapsOf(dayEvents.filter((e) => !e.allDay && e.end), day, now)
            const isToday = day.toDateString() === now.toDateString()
            return (
              <div
                key={day.toISOString()}
                data-day={day.toDateString()}
                onPointerDown={(ev) => {
                  if (ev.target.closest('[data-event]')) return
                  const col = ev.currentTarget
                  const m = snap(minuteAt(col, ev.clientY - 0) - 7.5)
                  beginDrag(ev, { kind: 'create', dayKey: day.toDateString(), anchorMin: Math.max(0, m) })
                }}
                className="relative border-l border-white/[0.05]"
                style={{ background: isToday ? 'rgba(244,238,226,0.045)' : [0, 6].includes(day.getDay()) ? 'rgba(0,0,0,0.18)' : 'transparent' }}
              >
                {HOURS.map((h) => (
                  <div key={h} className="absolute w-full border-t border-white/[0.04]" style={{ top: (h - START_HOUR) * ROW_HEIGHT }} />
                ))}
                {gaps.map(([gs, ge], gi) => {
                  const gTop = ((minutesSinceMidnight(gs) - START_HOUR * 60) / 60) * ROW_HEIGHT
                  const gH = ((ge - gs) / 3600000) * ROW_HEIGHT
                  if (gTop + gH < 0 || gTop > HOURS.length * ROW_HEIGHT) return null
                  const hrs = Math.round(((ge - gs) / 3600000) * 2) / 2
                  return (
                    <div key={gi} className="pointer-events-none absolute inset-x-1 rounded-xl border border-dashed border-[#8FD19A]/25 bg-[#8FD19A]/[0.04]" style={{ top: gTop + 2, height: Math.max(gH - 4, 12) }}>
                      <span className="absolute left-2 top-1 text-[10px] font-medium text-[#8FD19A]/80">Libre · {hrs} h</span>
                    </div>
                  )
                })}
                {placed.map((e) => {
                  const top = ((e.startMin - START_HOUR * 60) / 60) * ROW_HEIGHT
                  const height = Math.max(((e.endMin - e.startMin) / 60) * ROW_HEIGHT - 2, 18)
                  const width = 100 / e.colCount
                  const color = eventColor(e)
                  const past = new Date(e.end).getTime() < now.getTime()
                  const live = new Date(e.start).getTime() <= now.getTime() && !past
                  return (
                    <button
                      key={e.id}
                      type="button"
                      data-event
                      onClick={() => { if (justDragged.current) return; setHover(null); onOpenEvent(e) }}
                      onPointerDown={(ev) => {
                        if (!e.canEdit) return
                        setHover(null)
                        clearTimeout(hoverTimer.current)
                        const col = ev.currentTarget.closest('[data-day]')
                        beginDrag(ev, { kind: 'move', event: e, dayKey: day.toDateString(), offsetMin: minuteAt(col, ev.clientY) - e.startMin, durMin: e.endMin - e.startMin })
                      }}
                      onMouseEnter={(ev) => showHover(e, ev.currentTarget)}
                      onMouseLeave={hideHover}
                      className="absolute overflow-hidden rounded-[10px] px-2.5 py-1.5 text-left text-[11.5px] font-medium leading-tight transition-[filter,transform] duration-150 hover:brightness-125 active:scale-[0.99]"
                      style={{
                        top,
                        height,
                        left: `${e.col * width}%`,
                        width: `calc(${width}% - 2px)`,
                        background: `${color}2E`,
                        borderLeft: `3px solid ${color}`,
                        color: '#F5F5F5',
                        opacity: drag?.event?.id === e.id ? 0.3 : past ? 0.62 : 1,
                        cursor: canWrite && e.canEdit ? 'grab' : 'pointer',
                        boxShadow: live ? `0 0 0 1px ${color}AA, 0 4px 14px -6px ${color}88` : 'none',
                      }}
                    >
                      <span className="block truncate">{e.title}</span>
                      {canWrite && e.canEdit && height > 24 && (
                        <span
                          className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize"
                          onPointerDown={(ev) => {
                            ev.stopPropagation()
                            setHover(null)
                            beginDrag(ev, { kind: 'resize', event: e, dayKey: day.toDateString(), startMin: e.startMin })
                          }}
                        />
                      )}
                      {height > 32 && (
                        <span className="block truncate text-[10.5px] tabular-nums text-[#B5B5B5]">
                          {new Date(e.start).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false })} – {new Date(e.end).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </span>
                      )}
                    </button>
                  )
                })}
                {drag && drag.dayKey === day.toDateString() && (
                  <div className="pointer-events-none absolute inset-x-1 z-20 overflow-hidden rounded-[10px] border border-dashed border-[#F4EEE2]/70 bg-[#F4EEE2]/[0.14] px-2 py-1 text-[11px] font-medium tabular-nums text-[#F4EEE2]" style={{ top: ((drag.startMin - START_HOUR * 60) / 60) * ROW_HEIGHT, height: Math.max(((drag.endMin - drag.startMin) / 60) * ROW_HEIGHT, 18) }}>
                    {drag.kind === 'create' ? 'Nuevo evento' : drag.event.title}
                    <span className="block text-[10.5px] text-[#F4EEE2]/80">{String(Math.floor(drag.startMin / 60)).padStart(2, '0')}:{String(drag.startMin % 60).padStart(2, '0')} – {String(Math.floor(drag.endMin / 60)).padStart(2, '0')}:{String(drag.endMin % 60).padStart(2, '0')}</span>
                  </div>
                )}
              </div>
            )
          })}

          {showNowLine && (
            <div className="pointer-events-none absolute flex items-center" style={{ top: nowTop, left: 0, right: 0 }}>
              <span
                className="z-10 ml-1 flex-shrink-0 rounded-md bg-[#EF5350] px-1.5 py-[2px] text-center text-[10px] font-semibold tabular-nums text-white"
                style={{ width: GUTTER_WIDTH - 10 }}
              >
                {now.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false })}
              </span>
              <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, #EF5350, rgba(239,83,80,0.15))' }} />
            </div>
          )}
        </div>
      </div>
      {hover && <EventHoverCard hover={hover} onEnter={() => clearTimeout(hoverTimer.current)} onLeave={hideHover} onOpen={() => { const ev = hover.event; setHover(null); onOpenEvent(ev) }} />}
    </div>
  )
}
