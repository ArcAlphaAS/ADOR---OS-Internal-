import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createTask } from '../../lib/firestore'
import { LAYERS, currentLayer } from '../../lib/workspace'
import { ChevronDownIcon } from '../icons'
import TaskRow from './TaskRow'

function LayerIndicator({ week, totalWeeks }) {
  const active = currentLayer(week, totalWeeks)
  return (
    <div className="flex items-center gap-1.5">
      {LAYERS.map((name, i) => {
        const layerNum = i + 1
        const done = layerNum < active
        const isActive = layerNum === active
        return (
          <div
            key={name}
            title={name}
            className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-medium"
            style={{
              background: done ? '#1E5FAD' : isActive ? 'transparent' : 'rgba(255,255,255,0.08)',
              border: isActive ? '1px solid #1E5FAD' : 'none',
              color: done ? '#F5F5F5' : isActive ? '#1E5FAD' : '#444444',
            }}
          >
            {isActive ? (
              <span className="h-1.5 w-1.5 rounded-full bg-[#1E5FAD]" style={{ animation: 'ador-pulse 2s ease-in-out infinite' }} />
            ) : (
              layerNum
            )}
          </div>
        )
      })}
    </div>
  )
}

function InlineAddTask({ workstreamId, actorUserId, actorName }) {
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')

  const submit = () => {
    if (!title.trim()) {
      setAdding(false)
      return
    }
    createTask(
      { title: title.trim(), workstreamId, assignedTo: [actorUserId], priority: 'media', dueDate: null },
      actorName
    )
    setTitle('')
  }

  if (!adding) {
    return (
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="w-full rounded-lg px-3 py-2 text-left text-[13px] text-[#444444] transition-colors duration-150 hover:text-[#888888]"
      >
        + Agregar tarea
      </button>
    )
  }

  return (
    <input
      autoFocus
      type="text"
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') submit()
        if (e.key === 'Escape') {
          setTitle('')
          setAdding(false)
        }
      }}
      onBlur={submit}
      placeholder="Título de la tarea — Enter para guardar"
      className="w-full rounded-lg border border-white/[0.1] bg-transparent px-3 py-2 text-[13px] text-[#F5F5F5] placeholder:text-[#444444] outline-none"
    />
  )
}

function WorkstreamGroup({ workstream, tasks, userById, onOpenTask, actorUserId, actorName }) {
  const [collapsed, setCollapsed] = useState(false)
  const completedCount = tasks.filter((t) => t.status === 'completado').length
  const pct = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0
  const accent = workstream.kind === 'intervencion' ? '#1E5FAD' : '#B8860B'

  return (
    <div className="rounded-2xl border-l-2 pl-4" style={{ borderColor: accent }}>
      <button type="button" onClick={() => setCollapsed((v) => !v)} className="flex w-full items-center gap-3 py-2 text-left">
        <ChevronDownIcon
          size={14}
          style={{ color: '#444444', transform: collapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 150ms ease-out' }}
        />
        <span className="text-[14px] font-semibold text-[#F5F5F5]">{workstream.name}</span>
        <span className="text-[12px] text-[#444444]">
          {completedCount}/{tasks.length} · {pct}%
        </span>
        <div className="ml-auto flex items-center gap-3">
          {workstream.kind === 'intervencion' && (
            <span className="text-[11px] text-[#888888]">
              Semana {workstream.interventionWeek} de {workstream.interventionTotalWeeks}
            </span>
          )}
        </div>
      </button>

      <div className="h-[2px] w-full overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: accent }} />
      </div>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            {workstream.kind === 'intervencion' && (
              <div className="flex items-center gap-2 py-3">
                <LayerIndicator week={workstream.interventionWeek} totalWeeks={workstream.interventionTotalWeeks} />
                <span className="ml-2 rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: 'rgba(30,95,173,0.15)', color: '#1E5FAD' }}>
                  En curso
                </span>
              </div>
            )}

            <div className="flex flex-col py-1">
              {tasks.length === 0 ? (
                <p className="py-3 text-[13px] font-light text-[#444444]">Sin tareas todavía</p>
              ) : (
                tasks.map((task) => <TaskRow key={task.id} task={task} userById={userById} onOpen={onOpenTask} />)
              )}
              <InlineAddTask workstreamId={workstream.id} actorUserId={actorUserId} actorName={actorName} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function ListaView({ workstreams, tasksByWorkstream, userById, onOpenTask, actorUserId, actorName }) {
  if (workstreams.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-24">
        <div className="ador-skeleton h-[2px] w-1/3 rounded-full" />
        <p className="text-[14px] font-light text-[#444444]">
          Sin Intervenciones activas ni Proyectos Internos — crea un Proyecto Interno para empezar.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {workstreams.map((w) => (
        <WorkstreamGroup
          key={w.id}
          workstream={w}
          tasks={tasksByWorkstream.get(w.id) || []}
          userById={userById}
          onOpenTask={onOpenTask}
          actorUserId={actorUserId}
          actorName={actorName}
        />
      ))}
    </div>
  )
}
