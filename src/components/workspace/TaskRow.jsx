import { motion } from 'framer-motion'
import { toggleTaskComplete } from '../../lib/firestore'
import { priorityMeta, statusMeta, isOverdue, isDueToday } from '../../lib/workspace'
import AvatarStack from './AvatarStack'
import { CheckCircleIcon } from '../icons'

function formatDueDate(task) {
  const due = task.dueDate?.toDate?.()
  if (!due) return null
  return due.toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

export default function TaskRow({ task, userById, onOpen }) {
  const completed = task.status === 'completado'
  const priority = priorityMeta(task.priority)
  const status = statusMeta(task.status)
  const dueLabel = formatDueDate(task)
  const overdue = isOverdue(task)
  const dueToday = isDueToday(task)

  return (
    <div
      onClick={() => onOpen(task)}
      className="group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors duration-150 hover:bg-white/[0.03]"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          toggleTaskComplete(task)
        }}
        className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full transition-colors duration-150"
        style={{ color: completed ? '#4CAF50' : '#444444' }}
      >
        {completed ? <CheckCircleIcon size={18} /> : <span className="h-[15px] w-[15px] rounded-full border" style={{ borderColor: '#444444' }} />}
      </button>

      <motion.span
        animate={{ opacity: completed ? 0.5 : 1 }}
        className="min-w-0 flex-1 truncate text-[14px] font-medium text-[#F5F5F5]"
        style={{ textDecoration: completed ? 'line-through' : 'none' }}
      >
        {task.title}
      </motion.span>

      <AvatarStack userIds={task.assignedTo || []} userById={userById} size={22} />

      <span
        className="flex-shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium"
        style={{ borderColor: priority.color, background: `${priority.color}26`, color: priority.color }}
      >
        {priority.label}
      </span>

      {dueLabel && (
        <span
          className="flex-shrink-0 text-[12px]"
          style={{ color: overdue ? '#EF5350' : dueToday ? '#FFC107' : '#444444' }}
        >
          {dueLabel}
        </span>
      )}

      <span
        className="flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium"
        style={{ background: `${status.color}22`, color: status.color }}
      >
        {status.label}
      </span>
    </div>
  )
}
