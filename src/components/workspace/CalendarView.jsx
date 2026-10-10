import { useMemo, useState } from 'react'
import { applyTaskUpdate } from '../../lib/firestore'
import { statusMeta } from '../../lib/workspace'
import { useToast } from '../../hooks/useToast'
import { ChevronRightIcon, ChevronDownIcon } from '../icons'

// A month of deadlines: every task with a Fecha límite sits on its day,
// coloured by state. Drag a task to another day to reschedule it (or drag one
// from "Sin fecha" to give it a date). Works on the same filtered tasks as
// Lista/Kanban/Timeline, so "lo de Leonardo este mes" is one filter away.
const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function Chip({ task, onOpen, onDragStart }) {
  const status = statusMeta(task.status)
  const done = task.status === 'completado'
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onClick={(e) => {
        e.stopPropagation()
        onOpen(task)
      }}
      title={task.title}
      className="flex w-full cursor-grab items-center gap-1.5 rounded-md px-1.5 py-[3px] text-left text-[11.5px] transition-colors hover:bg-white/[0.08] active:cursor-grabbing"
      style={{ background: `${status.color === '#444444' ? '#888888' : status.color}22`, color: done ? '#777777' : '#F0F0F0', textDecoration: done ? 'line-through' : 'none' }}
    >
      <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: status.color === '#444444' ? '#888888' : status.color }} />
      <span className="truncate">{task.title}</span>
    </button>
  )
}

export default function CalendarView({ tasks, onOpenTask, actorUserId, actorName }) {
  const showToast = useToast()
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [overKey, setOverKey] = useState(null)
  const todayKey = key(new Date())

  const days = useMemo(() => {
    const first = new Date(month)
    const offset = (first.getDay() + 6) % 7 // Monday-first
    const start = new Date(first)
    start.setDate(1 - offset)
    const total = Math.ceil((offset + new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()) / 7) * 7
    return Array.from({ length: total }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  }, [month])

  const byDay = useMemo(() => {
    const map = new Map()
    for (const t of tasks) {
      const due = t.dueDate?.toDate?.()
      if (!due) continue
      const k = key(due)
      map.set(k, [...(map.get(k) || []), t])
    }
    return map
  }, [tasks])
  const undated = tasks.filter((t) => !t.dueDate && t.status !== 'completado')

  const onDragStart = (e, task) => {
    e.dataTransfer.setData('text/plain', task.id)
    e.dataTransfer.effectAllowed = 'move'
  }
  const onDrop = (e, date) => {
    e.preventDefault()
    setOverKey(null)
    const task = tasks.find((t) => t.id === e.dataTransfer.getData('text/plain'))
    if (!task) return
    const cur = task.dueDate?.toDate?.()
    if (cur && key(cur) === key(date)) return
    applyTaskUpdate(task, { dueDate: new Date(date.getFullYear(), date.getMonth(), date.getDate()) }, actorUserId, actorName).catch((err) => showToast(`No se pudo reprogramar: ${err.message}`))
  }

  const label = month.toLocaleDateString('es', { month: 'long', year: 'numeric' })

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="flex h-8 w-8 items-center justify-center rounded-full text-[#888888] hover:bg-white/[0.07] hover:text-[#F5F5F5]" title="Mes anterior">
          <span className="flex rotate-180"><ChevronRightIcon size={14} /></span>
        </button>
        <h2 className="min-w-[150px] text-center text-[15px] font-semibold text-[#F5F5F5]">{label.charAt(0).toUpperCase() + label.slice(1)}</h2>
        <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="flex h-8 w-8 items-center justify-center rounded-full text-[#888888] hover:bg-white/[0.07] hover:text-[#F5F5F5]" title="Mes siguiente">
          <ChevronRightIcon size={14} />
        </button>
        <button type="button" onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))} className="ml-1 rounded-lg px-2.5 py-1 text-[12px] text-[#AAAAAA] hover:bg-white/[0.06]">
          Hoy
        </button>
        <span className="ml-auto text-[11.5px] text-[#666666]">Arrastra una tarea a otro día para reprogramarla</span>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-7 gap-px px-px pb-1">
            {DAY_NAMES.map((n) => (
              <span key={n} className="px-2 text-[10.5px] font-medium uppercase tracking-[0.06em] text-[#555555]">{n}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.06]">
            {days.map((d) => {
              const k = key(d)
              const inMonth = d.getMonth() === month.getMonth()
              const list = byDay.get(k) || []
              return (
                <div
                  key={k}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setOverKey(k)
                  }}
                  onDragLeave={() => setOverKey((cur) => (cur === k ? null : cur))}
                  onDrop={(e) => onDrop(e, d)}
                  className="flex min-h-[104px] flex-col gap-0.5 p-1.5 transition-colors"
                  style={{ background: overKey === k ? 'rgba(232,193,90,0.12)' : inMonth ? '#0F0F0F' : '#0B0B0B' }}
                >
                  <span
                    className="mb-0.5 flex h-5 w-5 items-center justify-center self-end rounded-full text-[11px]"
                    style={{ background: k === todayKey ? '#F5F5F5' : 'transparent', color: k === todayKey ? '#0A0A0A' : inMonth ? '#999999' : '#444444' }}
                  >
                    {d.getDate()}
                  </span>
                  {list.slice(0, 4).map((t) => (
                    <Chip key={t.id} task={t} onOpen={onOpenTask} onDragStart={onDragStart} />
                  ))}
                  {list.length > 4 && <span className="px-1.5 text-[10.5px] text-[#777777]">+{list.length - 4} más</span>}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {undated.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-[#666666]">
            <ChevronDownIcon size={11} /> Sin fecha · {undated.length}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {undated.slice(0, 30).map((t) => (
              <div key={t.id} className="max-w-[240px]">
                <Chip task={t} onOpen={onOpenTask} onDragStart={onDragStart} />
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-[#555555]">Arrástralas a un día del calendario para darles fecha límite.</p>
        </div>
      )}
    </div>
  )
}
