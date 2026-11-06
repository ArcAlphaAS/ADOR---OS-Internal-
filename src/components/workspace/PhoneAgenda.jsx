import { useMemo } from 'react'
import PhoneTaskCard from './PhoneTaskCard'

// La "línea de tiempo" en el teléfono: un diagrama de barras con scroll lateral no
// es de app. Aquí son tus tareas abiertas agrupadas por cuándo vencen — Vencidas,
// Hoy, Mañana, Esta semana, Más adelante y Sin fecha — cada una como tarjeta.
const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

export default function PhoneAgenda({ tasks, workstreamById, userById, actorUserId, actorName, workstreams, onOpenTask }) {
  const groups = useMemo(() => {
    const today = startOf(new Date())
    const DAY = 86400000
    const g = { vencidas: [], hoy: [], manana: [], semana: [], despues: [], sin: [] }
    for (const t of tasks) {
      if (t.status === 'completado') continue
      const due = t.dueDate?.toDate?.()
      if (!due) g.sin.push(t)
      else {
        const diff = Math.round((startOf(due) - today) / DAY)
        if (diff < 0) g.vencidas.push(t)
        else if (diff === 0) g.hoy.push(t)
        else if (diff === 1) g.manana.push(t)
        else if (diff <= 7) g.semana.push(t)
        else g.despues.push(t)
      }
    }
    const byDue = (a, b) => (a.dueDate?.toMillis?.() || 0) - (b.dueDate?.toMillis?.() || 0)
    for (const k of Object.keys(g)) g[k].sort(byDue)
    return [
      ['Vencidas', g.vencidas, '#D98A86'],
      ['Hoy', g.hoy, '#F4EEE2'],
      ['Mañana', g.manana, '#E4E4E4'],
      ['Esta semana', g.semana, '#E4E4E4'],
      ['Más adelante', g.despues, '#8E8E93'],
      ['Sin fecha', g.sin, '#8E8E93'],
    ].filter(([, list]) => list.length)
  }, [tasks])

  if (groups.length === 0) return <p className="rounded-[24px] bg-[#1C1C1E] px-5 py-8 text-center text-[14px] text-[#8E8E93]">No hay tareas abiertas en este alcance.</p>

  return (
    <div className="flex flex-col gap-6">
      {groups.map(([label, list, color]) => (
        <section key={label} className="flex flex-col gap-2.5">
          <h2 className="px-1 text-[14px] font-semibold" style={{ color }}>{label} <span className="font-normal text-[#767676]">{list.length}</span></h2>
          {list.map((t) => (
            <PhoneTaskCard key={t.id} task={t} workstream={workstreamById[t.workstreamId]} workstreams={workstreams} userById={userById} actorUserId={actorUserId} actorName={actorName} onOpen={onOpenTask} />
          ))}
        </section>
      ))}
    </div>
  )
}
