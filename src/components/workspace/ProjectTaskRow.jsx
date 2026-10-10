import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toggleTaskComplete, applyTaskUpdate, findOrCreateGeneralProyecto } from '../../lib/firestore'
import { PRIORITIES, STATUSES, priorityMeta, statusMeta, isOverdue, isDueToday, PROJECT_TASK_ROW_GRID, withTimeout, workstreamId as buildWorkstreamId } from '../../lib/workspace'
import { useToast } from '../../hooks/useToast'
import { PillCell, DueDateCell, TimelineCell, AssigneeCell, WorkstreamCell } from './TaskCells'
import { TaskTitleCell, SubtasksBlock } from './TaskChrome'
import TaskContextMenu from './TaskContextMenu'
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
  const [expanded, setExpanded] = useState(false)
  const [menu, setMenu] = useState(null) // right-click position
  const [subFocus, setSubFocus] = useState(0)
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
    <div>
    <div
      onContextMenu={(e) => {
        e.preventDefault()
        setMenu({ x: e.clientX, y: e.clientY })
      }}
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

      <TaskTitleCell task={task} completed={completed} expanded={expanded} onToggleExpand={() => setExpanded((v) => !v)} onOpen={onOpen} />

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
            className="flex-shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-medium transition-colors duration-150 hover:bg-white/10"
            style={{ borderColor: 'rgba(244,238,226,0.45)', color: '#F4EEE2' }}
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

      <AssigneeCell
        assignedTo={task.assignedTo || []}
        userById={userById}
        users={users}
        pendingIds={task.pendingConfirmations || []}
        onChange={(next) => applyUpdate({ assignedTo: next })}
      />

      <PillCell options={PRIORITIES} value={task.priority} meta={task.priority ? priorityMeta(task.priority) : null} emptyLabel="Prioridad" onChange={(id) => applyUpdate({ priority: id })} />

      <DueDateCell dueDate={task.dueDate?.toDate?.() || null} overdue={isOverdue(task)} dueToday={isDueToday(task)} onChange={(date) => applyUpdate({ dueDate: date })} />

      <TimelineCell
        startDate={task.startDate?.toDate?.() || null}
        endDate={task.endDate?.toDate?.() || (task.startDate ? task.dueDate?.toDate?.() || null : null)}
        onChangeStart={(date) => applyUpdate({ startDate: date })}
        onChangeEnd={(date) => applyUpdate({ endDate: date })}
      />

      <PillCell options={STATUSES} value={task.status} meta={statusMeta(task.status)} onChange={(id) => applyUpdate({ status: id })} />
    </div>
    {expanded && <SubtasksBlock task={task} focusKey={subFocus} />}
    {menu && (
      <TaskContextMenu
        task={task}
        x={menu.x}
        y={menu.y}
        workstreams={workstreams}
        actorUserId={actorUserId}
        actorName={actorName}
        onClose={() => setMenu(null)}
        onOpen={onOpen}
        onAddSubtask={() => {
          setExpanded(true)
          setSubFocus((n) => n + 1)
        }}
      />
    )}
    </div>
  )
}
