import { motion } from 'framer-motion'
import { toggleTaskComplete, applyTaskUpdate } from '../../lib/firestore'
import { PRIORITIES, STATUSES, priorityMeta, statusMeta, isOverdue, isDueToday, TASK_ROW_GRID, withTimeout } from '../../lib/workspace'
import { useToast } from '../../hooks/useToast'
import { PillCell, EstimationCell, DescriptionCell, AssigneeCell } from './TaskCells'
import { CheckCircleIcon } from '../icons'

export default function TaskRow({ task, userById, users, onOpen, actorName }) {
  const completed = task.status === 'completado'
  const showToast = useToast()

  // Every inline cell edit routes through here so a failed write (most
  // commonly: Firestore rules don't yet cover this collection for this
  // account, or the signed-in user isn't in allowedEmails) surfaces as a
  // visible toast instead of silently doing nothing — which otherwise looks
  // indistinguishable from the click not having worked at all. applyTaskUpdate
  // also leaves an activity-log entry, so every edit surface writes the same
  // trail (see Historial in the Task Detail Panel).
  const applyUpdate = (data) => {
    withTimeout(applyTaskUpdate(task.id, data, actorName)).catch((error) => showToast(`No se pudo guardar: ${error.message}`))
  }

  return (
    <div
      className="grid items-center gap-3 rounded-lg px-2 py-2.5 transition-colors duration-150 hover:bg-white/[0.035]"
      style={{ gridTemplateColumns: TASK_ROW_GRID }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          withTimeout(toggleTaskComplete(task, actorName)).catch((error) => showToast(`No se pudo actualizar: ${error.message}`))
        }}
        className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full transition-colors duration-150"
        style={{ color: completed ? '#4CAF50' : '#444444' }}
      >
        {completed ? <CheckCircleIcon size={18} /> : <span className="h-[15px] w-[15px] rounded-full border" style={{ borderColor: '#444444' }} />}
      </button>

      <motion.span
        onClick={() => onOpen(task)}
        animate={{ opacity: completed ? 0.5 : 1 }}
        className="min-w-0 cursor-pointer truncate text-[14px] font-medium text-[#F5F5F5] hover:underline"
        style={{ textDecoration: completed ? 'line-through' : 'none' }}
      >
        {task.title}
      </motion.span>

      <DescriptionCell description={task.description} onChange={(text) => applyUpdate({ description: text })} />

      <AssigneeCell
        assignedTo={task.assignedTo || []}
        userById={userById}
        users={users}
        onChange={(next) => applyUpdate({ assignedTo: next })}
      />

      <PillCell
        options={PRIORITIES}
        value={task.priority}
        meta={task.priority ? priorityMeta(task.priority) : null}
        emptyLabel="Prioridad"
        onChange={(id) => applyUpdate({ priority: id })}
      />

      <EstimationCell
        startDate={task.startDate?.toDate?.() || null}
        dueDate={task.dueDate?.toDate?.() || null}
        overdue={isOverdue(task)}
        dueToday={isDueToday(task)}
        onChangeStart={(date) => applyUpdate({ startDate: date })}
        onChangeDue={(date) => applyUpdate({ dueDate: date })}
      />

      <PillCell
        options={STATUSES}
        value={task.status}
        meta={statusMeta(task.status)}
        onChange={(id) => applyUpdate({ status: id })}
      />
    </div>
  )
}
