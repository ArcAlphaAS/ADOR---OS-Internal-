import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toggleTaskComplete } from '../../lib/firestore'
import { isDueToday, withTimeout } from '../../lib/workspace'
import { eventColor } from '../../lib/googleCalendar'
import { ArrowRightIcon, ArrowLeftIcon } from '../icons'
import { useToast } from '../../hooks/useToast'

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

function buildMonthCells(monthDate) {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const startWeekday = (first.getDay() + 6) % 7
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), d))
  return cells
}

// Compact navigable month — separate component from Hoy's week-strip
// MiniCalendar (HoyRightRail.jsx): this is Calendario's own page, where a
// full month makes sense as an at-a-glance nav aid, not a competing widget
// crammed next to a daily task list.
export function MiniMonthCalendar({ anchorDate, onSelectDay }) {
  const [monthDate, setMonthDate] = useState(new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1))
  const today = new Date()
  const cells = buildMonthCells(monthDate)
  const label = monthDate.toLocaleDateString('es', { month: 'long', year: 'numeric' })

  useEffect(() => {
    setMonthDate(new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1))
  }, [anchorDate.getFullYear(), anchorDate.getMonth()])

  const shiftMonth = (delta) => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1))

  return (
    <div className="ador-glass ador-grain rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[13px] font-semibold capitalize text-[#F5F5F5]">{label}</span>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => shiftMonth(-1)} className="flex h-6 w-6 items-center justify-center rounded-full text-[#888888] transition-colors duration-150 hover:bg-white/[0.08] hover:text-[#F5F5F5]">
            <ArrowLeftIcon size={12} />
          </button>
          <button type="button" onClick={() => shiftMonth(1)} className="flex h-6 w-6 items-center justify-center rounded-full text-[#888888] transition-colors duration-150 hover:bg-white/[0.08] hover:text-[#F5F5F5]">
            <ArrowRightIcon size={12} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAYS.map((w, i) => (
          <span key={i} className="text-[10px] font-medium text-[#444444]">
            {w}
          </span>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const isToday = day.toDateString() === today.toDateString()
          const isSelected = day.toDateString() === anchorDate.toDateString()
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelectDay(day)}
              className="flex items-center justify-center py-0.5"
            >
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full text-[11px]"
                style={{
                  background: isToday ? '#1E5FAD' : isSelected ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: '#F5F5F5',
                  fontWeight: isToday ? 600 : 400,
                }}
              >
                {day.getDate()}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function TodayCard({ events, onOpenDay, onOpenEvent }) {
  const today = new Date()
  const todays = events
    .filter((e) => new Date(e.start).toDateString() === today.toDateString())
    .sort((a, b) => new Date(a.start) - new Date(b.start))

  return (
    <div className="ador-glass ador-grain rounded-2xl p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[13px] font-semibold text-[#F5F5F5]">
          Hoy — {today.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
      </div>
      {todays.length === 0 ? (
        <p className="text-[12px] text-[#666666]">Sin eventos hoy.</p>
      ) : (
        <>
          <p className="mb-2 text-[11px] text-[#888888]">{todays.length} evento{todays.length === 1 ? '' : 's'}</p>
          <div className="flex flex-col divide-y divide-white/[0.05]">
            {todays.slice(0, 5).map((e) => (
              <button key={e.id} type="button" onClick={() => onOpenEvent?.(e)} className="flex w-full items-center gap-2 py-2 text-left transition-opacity duration-150 hover:opacity-80">
                <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: eventColor(e) }} />
                <span className="w-[52px] flex-shrink-0 text-[11px] text-[#888888]">
                  {e.allDay ? 'Todo el día' : new Date(e.start).toLocaleTimeString('es', { hour: 'numeric', minute: '2-digit' })}
                </span>
                <span className="min-w-0 flex-1 truncate text-[12px] text-[#F5F5F5]">{e.title}</span>
              </button>
            ))}
          </div>
        </>
      )}
      <button type="button" onClick={() => onOpenDay(today)} className="mt-2 text-[12px] font-medium text-[#1E5FAD] hover:underline">
        Ver día completo →
      </button>
    </div>
  )
}

// Real Workspace tasks due today for the signed-in user, passed down from
// CalendarioModule's single subscription (also feeds the grid's task strip
// and the greeting card, so there's one live source, not three). Checkbox
// reuses the exact toggleTaskComplete() write every other task checkbox in
// the app calls.
export function TasksTodayCard({ tasks, actorName }) {
  const showToast = useToast()
  const dueToday = tasks.filter((t) => t.status !== 'completado' && isDueToday(t))

  const toggle = (task) => {
    withTimeout(toggleTaskComplete(task, actorName)).catch((error) => showToast(`No se pudo actualizar: ${error.message}`))
  }

  if (dueToday.length === 0) return null

  return (
    <div className="ador-glass ador-grain rounded-2xl p-4">
      <span className="text-[13px] font-semibold text-[#F5F5F5]">Tareas de hoy</span>
      <div className="mt-2 flex flex-col divide-y divide-white/[0.05]">
        {dueToday.map((task) => (
          <div key={task.id} className="flex items-center gap-2.5 py-2">
            <motion.button
              type="button"
              whileTap={{ scale: 0.82 }}
              onClick={() => toggle(task)}
              className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[#444444]"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span key="empty" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.12 }} className="h-[13px] w-[13px] rounded-full border" style={{ borderColor: '#444444' }} />
              </AnimatePresence>
            </motion.button>
            <span className="min-w-0 flex-1 truncate text-[12.5px] text-[#F5F5F5]">{task.title}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
