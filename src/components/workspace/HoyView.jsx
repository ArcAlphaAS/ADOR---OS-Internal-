import { isOverdue, isDueToday } from '../../lib/workspace'
import TaskRow from './TaskRow'

// The landing screen for Workspace — added 2026-09-16 after direct feedback
// that opening on "Todo" (every Intervención/Proyecto) made the module read
// as a team database, not somewhere you'd actually start your day. Modeled
// on Sunsama/Akiflow's "today first" philosophy rather than Linear's
// backlog-triage model: at 3 founders, the daily question isn't "what's in
// the queue" but "what's mine, and what's late." Deliberately shows only
// two buckets (vencidas, hoy) — no "upcoming this week" noise — matching
// this project's "fewer things, shown clearly" pattern already used in
// Resumen Semanal's prioritized TL;DR.
function Section({ title, color, tasks, userById, users, onOpenTask, actorName, workstreamById }) {
  if (tasks.length === 0) return null
  return (
    <div className="ador-glass ador-grain overflow-hidden rounded-2xl">
      <div className="flex items-center gap-2 border-l-2 px-5 py-3.5" style={{ borderColor: color }}>
        <span className="text-[14px] font-semibold" style={{ color }}>
          {title}
        </span>
        <span className="text-[12px] text-[#444444]">{tasks.length}</span>
      </div>
      <div className="flex flex-col divide-y divide-white/[0.04] px-3 pb-3">
        {tasks.map((task) => (
          <HoyTaskRow
            key={task.id}
            task={task}
            userById={userById}
            users={users}
            onOpen={onOpenTask}
            actorName={actorName}
            workstream={workstreamById[task.workstreamId]}
          />
        ))}
      </div>
    </div>
  )
}

// Same row the team views use (same inline-editable cells), with a small
// workstream tag layered above the title — Hoy mixes tasks from every
// Intervención/Proyecto, so without it a task reads with no context about
// which piece of work it belongs to.
function HoyTaskRow({ task, workstream, ...rest }) {
  return (
    <div className="pt-2.5 first:pt-3">
      {workstream && (
        <span className="mb-1 ml-[36px] block w-fit text-[10px] font-medium uppercase tracking-[0.06em]" style={{ color: workstream.kind === 'intervencion' ? '#1E5FAD' : '#B8860B' }}>
          {workstream.name}
        </span>
      )}
      <TaskRow task={task} {...rest} />
    </div>
  )
}

function EmptyDay() {
  return (
    <div className="flex flex-col items-center gap-3 py-24">
      <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'rgba(76,175,80,0.1)' }}>
        <span className="h-2 w-2 rounded-full bg-[#4CAF50]" style={{ animation: 'ador-pulse 2.5s ease-in-out infinite' }} />
      </div>
      <p className="text-[14px] font-light text-[#F5F5F5]">Nada vencido, nada para hoy.</p>
      <p className="text-[13px] text-[#444444]">Buen momento para adelantar algo de esta semana, o revisar el tablero del equipo.</p>
    </div>
  )
}

export default function HoyView({ tasks, userId, userById, users, workstreamById, onOpenTask, actorName }) {
  const mine = tasks.filter((t) => (t.assignedTo || []).includes(userId) && t.status !== 'completado')
  const vencidas = mine.filter(isOverdue)
  const hoy = mine.filter((t) => isDueToday(t) && !isOverdue(t))

  if (vencidas.length === 0 && hoy.length === 0) return <EmptyDay />

  return (
    <div className="flex flex-col gap-5">
      <Section title="Vencidas" color="#EF5350" tasks={vencidas} userById={userById} users={users} onOpenTask={onOpenTask} actorName={actorName} workstreamById={workstreamById} />
      <Section title="Para hoy" color="#1E5FAD" tasks={hoy} userById={userById} users={users} onOpenTask={onOpenTask} actorName={actorName} workstreamById={workstreamById} />
    </div>
  )
}
