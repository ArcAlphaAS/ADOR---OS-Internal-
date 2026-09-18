import { motion, AnimatePresence } from 'framer-motion'
import { toggleTaskComplete, applyTaskUpdate, findOrCreateGeneralProyecto } from '../../lib/firestore'
import { PRIORITIES, STATUSES, priorityMeta, statusMeta, isOverdue, isDueToday, PROJECT_TASK_ROW_GRID, withTimeout, workstreamId as buildWorkstreamId } from '../../lib/workspace'
import { useToast } from '../../hooks/useToast'
import { PillCell, EstimationCell, DescriptionCell, AssigneeCell, WorkstreamCell } from './TaskCells'
import { CheckCircleIcon, PlayIcon } from '../icons'

// Same full-column row as TaskRow.jsx (Grupo/Lista), plus a Proyecto
// column — shared by Personal's task table and Hoy's sections, the two
// places a task list isn't already grouped by workstream. `onReschedule`
// and `onFocus` are Hoy-only (Vencidas' "→ Hoy" pill, and the manual
// "Enfocar" button that pins a task as Hoy's Enfoque Actual instead of
// leaving the pick entirely automatic); everything else is identical
// between the two callers on purpose, per direct request that Hoy/
// Personal/Grupo all read as the same kind of table.
export default function ProjectTaskRow({ task, workstream, workstreams = [], userById, users, onOpen, actorUserId, actorName, onReschedule, onFocus }) {
  const completed = task.status === 'completado'
  const showToast = useToast()
  const accent = workstream?.kind === 'intervencion' ? '#1E5FAD' : '#B8860B'

  const applyUpdate = (data) => {
    withTimeout(applyTaskUpdate(task, data, actorUserId, actorName)).catch((error) => showToast(`No se pudo guardar: ${error.message}`))
  }

  const changeWorkstream = async (id) => {
    try {
      const targetId = id || (await findOrCreateGeneralProyecto(actorName).then((pid) => buildWorkstreamId('proyecto', pid)))
      applyUpdate({ workstreamId: targetId })
    } catch (error) {
      showToast(`No se pudo mover la tarea: ${error.message}`)
    }
  }

  return (
    <div
      className="grid items-center gap-3 rounded-lg px-2 py-2.5 transition-colors duration-150 hover:bg-white/[0.035]"
      style={{ gridTemplateColumns: PROJECT_TASK_ROW_GRID }}
    >
      <motion.button
        type="button"
        whileTap={{ scale: 0.82 }}
        onClick={(e) => {
          e.stopPropagation()
          withTimeout(toggleTaskComplete(task, actorName)).catch((error) => showToast(`No se pudo actualizar: ${error.message}`))
        }}
        className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
        style={{ color: completed ? '#4CAF50' : '#444444' }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {completed ? (
            <motion.span key="done" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 22 }} className="flex items-center justify-center">
              <CheckCircleIcon size={18} />
            </motion.span>
          ) : (
            <motion.span key="empty" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }} transition={{ duration: 0.12 }} className="h-[15px] w-[15px] rounded-full border" style={{ borderColor: '#444444' }} />
          )}
        </AnimatePresence>
      </motion.button>

      <motion.span
        onClick={() => onOpen(task)}
        animate={{ opacity: completed ? 0.5 : 1 }}
        className="min-w-0 cursor-pointer truncate text-[14px] font-medium text-[#F5F5F5] hover:underline"
        style={{ textDecoration: completed ? 'line-through' : 'none' }}
      >
        {task.title}
      </motion.span>

      <div className="flex min-w-0 items-center gap-1.5">
        <WorkstreamCell workstreams={workstreams} value={workstream?.id ?? ''} onChange={changeWorkstream} variant="label" accentColor={accent} />
        {onReschedule && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onReschedule(task)
            }}
            title="Mover a hoy"
            className="flex-shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-medium transition-colors duration-150 hover:bg-[#1E5FAD]/10"
            style={{ borderColor: '#1E5FAD', color: '#1E5FAD' }}
          >
            → Hoy
          </button>
        )}
        {onFocus && !completed && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onFocus(task)
            }}
            title="Enfocar esta tarea"
            className="flex flex-shrink-0 items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[9px] font-medium transition-colors duration-150 hover:bg-white/[0.06]"
            style={{ borderColor: 'rgba(255,255,255,0.14)', color: '#888888' }}
          >
            <PlayIcon size={8} /> Enfocar
          </button>
        )}
      </div>

      <DescriptionCell description={task.description} onChange={(text) => applyUpdate({ description: text })} />

      <AssigneeCell
        assignedTo={task.assignedTo || []}
        userById={userById}
        users={users}
        pendingIds={task.pendingConfirmations || []}
        onChange={(next) => applyUpdate({ assignedTo: next })}
      />

      <PillCell options={PRIORITIES} value={task.priority} meta={task.priority ? priorityMeta(task.priority) : null} emptyLabel="Prioridad" onChange={(id) => applyUpdate({ priority: id })} />

      <EstimationCell
        startDate={task.startDate?.toDate?.() || null}
        dueDate={task.dueDate?.toDate?.() || null}
        overdue={isOverdue(task)}
        dueToday={isDueToday(task)}
        onChangeStart={(date) => applyUpdate({ startDate: date })}
        onChangeDue={(date) => applyUpdate({ dueDate: date })}
      />

      <PillCell options={STATUSES} value={task.status} meta={statusMeta(task.status)} onChange={(id) => applyUpdate({ status: id })} />
    </div>
  )
}
