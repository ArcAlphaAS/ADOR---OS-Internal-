import { useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { updateTask } from '../../lib/firestore'
import { STATUSES, priorityMeta } from '../../lib/workspace'
import AvatarStack from './AvatarStack'

function formatDueDate(task) {
  const due = task.dueDate?.toDate?.()
  if (!due) return null
  return due.toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

function TaskCard({ task, workstream, userById, onOpen, resolveDropColumn }) {
  const priority = priorityMeta(task.priority)
  const accent = workstream?.kind === 'intervencion' ? '#1E5FAD' : '#B8860B'
  const dueLabel = formatDueDate(task)

  return (
    <motion.div
      layout
      layoutId={task.id}
      drag
      dragSnapToOrigin
      dragMomentum={false}
      whileDrag={{ scale: 1.03, boxShadow: '0 20px 40px -12px rgba(0,0,0,0.6)', zIndex: 20 }}
      onDragEnd={(_, info) => {
        const targetStatus = resolveDropColumn(info.point.x, info.point.y)
        if (targetStatus && targetStatus !== task.status) updateTask(task.id, { status: targetStatus })
      }}
      onClick={() => onOpen(task)}
      className="ador-glass ador-grain relative cursor-pointer rounded-xl border-l-[3px] p-3.5"
      style={{ borderLeftColor: accent }}
    >
      <span className="font-medium text-[#444444]" style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {workstream?.name || 'Sin grupo'}
      </span>
      <div className="mt-1 text-[14px] font-medium text-[#F5F5F5]">{task.title}</div>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="rounded-full border px-2 py-0.5 text-[10px] font-medium"
            style={{ borderColor: priority.color, background: `${priority.color}26`, color: priority.color }}
          >
            {priority.label}
          </span>
          {dueLabel && <span className="text-[11px] text-[#444444]">{dueLabel}</span>}
        </div>
        <AvatarStack userIds={task.assignedTo || []} userById={userById} size={20} />
      </div>
    </motion.div>
  )
}

function KanbanColumn({ status, tasks, workstreamById, userById, registerRef, onOpenTask, resolveDropColumn }) {
  const ref = useRef(null)
  return (
    <div
      ref={(el) => {
        ref.current = el
        registerRef(status.id, el)
      }}
      className="flex w-[280px] flex-shrink-0 flex-col rounded-2xl"
      style={{ background: 'rgba(255,255,255,0.02)', padding: 16 }}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <span className="text-[13px] font-medium" style={{ color: status.color }}>
          {status.label}
        </span>
        <span className="text-[11px] text-[#444444]">{tasks.length}</span>
      </div>
      <div className="flex flex-col gap-3">
        {tasks.length === 0 ? (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-white/[0.06] py-8">
            <span className="text-[12px] text-[#444444]">Sin tareas</span>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              workstream={workstreamById[task.workstreamId]}
              userById={userById}
              onOpen={onOpenTask}
              resolveDropColumn={resolveDropColumn}
            />
          ))
        )}
      </div>
    </div>
  )
}

export default function KanbanView({ tasks, workstreamById, userById, onOpenTask }) {
  const columnRefs = useRef({})

  const registerRef = useCallback((statusId, el) => {
    columnRefs.current[statusId] = el
  }, [])

  const resolveDropColumn = useCallback((x, y) => {
    for (const statusId of Object.keys(columnRefs.current)) {
      const el = columnRefs.current[statusId]
      if (!el) continue
      const rect = el.getBoundingClientRect()
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return statusId
    }
    return null
  }, [])

  const byStatus = STATUSES.map((status) => ({
    status,
    items: tasks.filter((t) => t.status === status.id),
  }))

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {byStatus.map(({ status, items }) => (
        <KanbanColumn
          key={status.id}
          status={status}
          tasks={items}
          workstreamById={workstreamById}
          userById={userById}
          registerRef={registerRef}
          onOpenTask={onOpenTask}
          resolveDropColumn={resolveDropColumn}
        />
      ))}
    </div>
  )
}
