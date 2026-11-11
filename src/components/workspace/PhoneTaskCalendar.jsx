import { useMemo, useState } from 'react'
import PhoneTaskCard from './PhoneTaskCard'
import EmptyState from '../common/EmptyState'
import { CalendarIcon } from '../icons'

// El calendario de Workspace en el teléfono: un mes compacto (7 columnas, un punto
// por tarea del día) arriba y, debajo, las tareas del día elegido como tarjetas.
// Arrastrar entre celdas no existe en una pantalla táctil; para cambiar el día de
// una tarea se abre su panel (Fecha límite) o se mantiene pulsada la tarjeta.
const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1)
const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export default function PhoneTaskCalendar({ tasks, workstreamById, workstreams, userById, actorUserId, actorName, onOpenTask }) {
  const now = new Date()
  const [month, setMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1))
  const [selected, setSelected] = useState(() => key(now))
  const todayKey = key(now)

  const byDay = useMemo(() => {
    const m = new Map()
    for (const t of tasks) {
      const due = t.dueDate?.toDate?.()
      if (!due) continue
      const k = key(due)
      m.set(k, [...(m.get(k) || []), t])
    }
    return m
  }, [tasks])
  const undated = tasks.filter((t) => !t.dueDate && t.status !== 'completado')

  const cells = useMemo(() => {
    const offset = (month.getDay() + 6) % 7
    const total = Math.ceil((offset + new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()) / 7) * 7
    return Array.from({ length: total }, (_, i) => new Date(month.getFullYear(), month.getMonth(), 1 - offset + i))
  }, [month])

  const go = (delta) => setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1))
  const label = month.toLocaleDateString('es', { month: 'long', year: 'numeric' })
  const dayTasks = [...(byDay.get(selected) || [])].sort((a, b) => (a.status === 'completado') - (b.status === 'completado'))
  const [sy, sm, sd] = selected.split('-').map(Number)
  const selLabel = new Date(sy, sm - 1, sd).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })

  const card = (t) => (
    <PhoneTaskCard key={t.id} task={t} workstream={workstreamById?.[t.workstreamId]} workstreams={workstreams} userById={userById} actorUserId={actorUserId} actorName={actorName} onOpen={onOpenTask} />
  )

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-[24px] bg-[#1C1C1E] px-3 pb-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <button type="button" aria-label="Mes anterior" onClick={() => go(-1)} className="flex h-11 w-11 items-center justify-center rounded-full text-[#F4EEE2] active:bg-white/[0.08]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg>
          </button>
          <button type="button" onClick={() => { setMonth(new Date(now.getFullYear(), now.getMonth(), 1)); setSelected(todayKey) }} className="text-[16px] font-semibold text-[#F5F5F5]">{cap(label)}</button>
          <button type="button" aria-label="Mes siguiente" onClick={() => go(1)} className="flex h-11 w-11 items-center justify-center rounded-full text-[#F4EEE2] active:bg-white/[0.08]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
          </button>
        </div>
        <div className="grid grid-cols-7 pb-1">
          {DAYS.map((d, i) => <span key={i} className="text-center text-[11px] font-medium text-[#8E8E93]">{d}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((d) => {
            const k = key(d)
            const inMonth = d.getMonth() === month.getMonth()
            const list = byDay.get(k) || []
            const open = list.filter((t) => t.status !== 'completado').length
            const overdue = list.some((t) => t.status !== 'completado') && k < todayKey
            const sel = k === selected
            const today = k === todayKey
            return (
              <button key={k} type="button" onClick={() => setSelected(k)} aria-label={`${d.getDate()}, ${list.length} tareas`} aria-pressed={sel} className="flex h-[48px] flex-col items-center justify-center gap-[3px] rounded-[14px]" style={{ background: sel ? '#F5F5F5' : today ? 'rgba(244,238,226,0.12)' : 'transparent' }}>
                <span className="text-[15px] font-medium" style={{ color: sel ? '#0A0A0A' : inMonth ? '#F5F5F5' : '#5F5F5F' }}>{d.getDate()}</span>
                <span className="flex h-[5px] items-center gap-[3px]">
                  {list.length > 0 && (
                    <>
                      <span className="h-[5px] w-[5px] rounded-full" style={{ background: sel ? '#0A0A0A' : overdue ? '#D98A86' : '#F4EEE2', opacity: open ? 1 : 0.4 }} />
                      {list.length > 1 && <span className="h-[5px] w-[5px] rounded-full" style={{ background: sel ? '#0A0A0A' : overdue ? '#D98A86' : '#F4EEE2', opacity: open ? 1 : 0.4 }} />}
                    </>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <section className="flex flex-col gap-2.5">
        <h2 className="px-1 text-[15px] font-semibold text-[#F5F5F5]">
          {cap(selLabel)} <span className="font-normal text-[#8A8A8A]">{dayTasks.length || ''}</span>
        </h2>
        {dayTasks.length ? dayTasks.map(card) : <EmptyState Icon={CalendarIcon} compact title="Día libre" hint="Nada con fecha límite este día." />}
      </section>

      {undated.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <h2 className="px-1 text-[14px] font-semibold text-[#8E8E93]">Sin fecha <span className="font-normal">{undated.length}</span></h2>
          {undated.slice(0, 20).map(card)}
        </section>
      )}
    </div>
  )
}
