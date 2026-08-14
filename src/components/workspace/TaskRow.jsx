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
    <tr onClick={() => onOpen(task)} className="group cursor-pointer transition-colors duration-150 hover:bg-white/[0.03]">
      <td className="w-8 py-2.5 pl-1">
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
      </td>

      <td className="py-2.5 pr-4">
        <motion.span
          animate={{ opacity: completed ? 0.5 : 1 }}
          className="block truncate text-[14px] font-medium text-[#F5F5F5]"
          style={{ textDecoration: completed ? 'line-through' : 'none' }}
        >
          {task.title}
        </motion.span>
      </td>

      <td className="w-[90px] py-2.5 pr-4">
        <AvatarStack userIds={task.assignedTo || []} userById={userById} size={22} />
      </td>

      <td className="w-[90px] py-2.5 pr-4">
        <span
          className="inline-block flex-shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium"
          style={{ borderColor: priority.color, background: `${priority.color}26`, color: priority.color }}
        >
          {priority.label}
        </span>
      </td>

      <td className="w-[80px] py-2.5 pr-4">
        {dueLabel && (
          <span className="text-[12px]" style={{ color: overdue ? '#EF5350' : dueToday ? '#FFC107' : '#444444' }}>
            {dueLabel}
          </span>
        )}
      </td>

      <td className="w-[110px] py-2.5">
        <span
          className="inline-block flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium"
          style={{ background: `${status.color}22`, color: status.color }}
        >
          {status.label}
        </span>
      </td>
    </tr>
  )
}
