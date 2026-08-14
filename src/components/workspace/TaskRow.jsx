import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { toggleTaskComplete, updateTask } from '../../lib/firestore'
import { PRIORITIES, STATUSES, priorityMeta, statusMeta, isOverdue, isDueToday, TASK_ROW_GRID, withTimeout } from '../../lib/workspace'
import { useToast } from '../../hooks/useToast'
import AvatarStack from './AvatarStack'
import CellPopover from './CellPopover'
import { CheckCircleIcon } from '../icons'

function formatShort(date) {
  return date.toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

// Click-to-open dropdown for a pill-style field (Estado/Prioridad) — stops
// the row's own onClick (which opens the full Task Detail Panel) so editing
// a single cell never yanks the user into the side panel.
function PillCell({ options, value, meta, onChange, emptyLabel }) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState(null)
  const triggerRef = useRef(null)

  const openMenu = (e) => {
    e.stopPropagation()
    setRect(triggerRef.current.getBoundingClientRect())
    setOpen(true)
  }

  return (
    <div>
      <button
        ref={triggerRef}
        type="button"
        onClick={openMenu}
        className="w-fit rounded-full px-2.5 py-1 text-[11px] font-medium transition-opacity duration-150 hover:opacity-80"
        style={meta ? { background: `${meta.color}22`, color: meta.color } : { color: '#444444', border: '1px dashed rgba(255,255,255,0.14)' }}
      >
        {meta ? meta.label : emptyLabel}
      </button>

      {open && (
        <CellPopover anchorRect={rect} onClose={() => setOpen(false)}>
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onChange(opt.id)
                setOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] transition-colors duration-150 hover:bg-white/[0.06]"
              style={{ color: opt.id === value ? opt.color : '#F5F5F5' }}
            >
              <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: opt.color }} />
              {opt.label}
            </button>
          ))}
        </CellPopover>
      )}
    </div>
  )
}

// "Estimación" — start and due date together, matching Timeline's own
// startDate/dueDate fields (see TimelineView.jsx) so a duration set here is
// the exact same duration that draws as a bar there. A due-date-only task
// still shows just its due date; adding a start date is optional.
function EstimationCell({ task, onUpdate }) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState(null)
  const triggerRef = useRef(null)
  const due = task.dueDate?.toDate?.()
  const start = task.startDate?.toDate?.()
  const overdue = isOverdue(task)
  const dueToday = isDueToday(task)

  const label = due ? (start ? `${formatShort(start)} – ${formatShort(due)}` : formatShort(due)) : null

  return (
    <div>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setRect(triggerRef.current.getBoundingClientRect())
          setOpen(true)
        }}
        className="w-fit truncate text-left text-[12px] transition-opacity duration-150 hover:opacity-80"
        style={{ color: label ? (overdue ? '#EF5350' : dueToday ? '#FFC107' : '#888888') : '#444444' }}
      >
        {label || 'Agregar fecha'}
      </button>

      {open && (
        <CellPopover anchorRect={rect} onClose={() => setOpen(false)} width={210}>
          <div className="flex flex-col gap-2 p-1">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[#444444]">Inicio</span>
              <input
                type="date"
                defaultValue={start ? start.toISOString().slice(0, 10) : ''}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => onUpdate({ startDate: e.target.value ? new Date(`${e.target.value}T00:00:00`) : null })}
                className="rounded-lg border border-white/[0.14] bg-[#141414] px-2 py-1 text-[12px] text-[#F5F5F5] outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[#444444]">Fin</span>
              <input
                type="date"
                defaultValue={due ? due.toISOString().slice(0, 10) : ''}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => onUpdate({ dueDate: e.target.value ? new Date(`${e.target.value}T00:00:00`) : null })}
                className="rounded-lg border border-white/[0.14] bg-[#141414] px-2 py-1 text-[12px] text-[#F5F5F5] outline-none"
              />
            </label>
          </div>
        </CellPopover>
      )}
    </div>
  )
}

function DescriptionCell({ task, onUpdate }) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState(null)
  const [draft, setDraft] = useState(task.description || '')
  const triggerRef = useRef(null)

  const save = () => {
    if (draft !== (task.description || '')) onUpdate({ description: draft.trim() })
    setOpen(false)
  }

  return (
    <div>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setDraft(task.description || '')
          setRect(triggerRef.current.getBoundingClientRect())
          setOpen(true)
        }}
        className="w-full truncate text-left text-[13px] transition-opacity duration-150 hover:opacity-80"
        style={{ color: task.description ? '#888888' : '#444444' }}
      >
        {task.description || 'Agregar descripción'}
      </button>

      {open && (
        <CellPopover anchorRect={rect} onClose={save} width={260}>
          <div className="p-1">
            <textarea
              autoFocus
              rows={3}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder="Agregar descripción..."
              className="w-full resize-none rounded-lg border border-white/[0.14] bg-[#141414] px-2.5 py-2 text-[12px] text-[#F5F5F5] placeholder:text-[#444444] outline-none"
            />
          </div>
        </CellPopover>
      )}
    </div>
  )
}

function AssigneeCell({ task, userById, users = [], onUpdate }) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState(null)
  const triggerRef = useRef(null)
  const assignedTo = task.assignedTo || []

  const toggle = (uid) => {
    const next = assignedTo.includes(uid) ? assignedTo.filter((id) => id !== uid) : [...assignedTo, uid]
    onUpdate({ assignedTo: next })
  }

  return (
    <div>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setRect(triggerRef.current.getBoundingClientRect())
          setOpen(true)
        }}
        className="flex items-center transition-opacity duration-150 hover:opacity-80"
      >
        <AvatarStack userIds={assignedTo} userById={userById} size={22} />
      </button>

      {open && (
        <CellPopover anchorRect={rect} onClose={() => setOpen(false)} width={200}>
          {users.length === 0 ? (
            <p className="px-2.5 py-1.5 text-[12px] text-[#444444]">Sin asociados</p>
          ) : (
            users.map((u) => (
              <label
                key={u.id}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[12px] transition-colors duration-150 hover:bg-white/[0.06]"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={assignedTo.includes(u.id)}
                  onChange={() => toggle(u.id)}
                  className="h-3.5 w-3.5 accent-[#1E5FAD]"
                />
                <span className="text-[#F5F5F5]">{u.displayName || u.email}</span>
              </label>
            ))
          )}
        </CellPopover>
      )}
    </div>
  )
}

export default function TaskRow({ task, userById, users, onOpen }) {
  const completed = task.status === 'completado'
  const showToast = useToast()

  // Every inline cell edit routes through here so a failed write (most
  // commonly: Firestore rules don't yet cover this collection for this
  // account, or the signed-in user isn't in allowedEmails) surfaces as a
  // visible toast instead of silently doing nothing — which otherwise looks
  // indistinguishable from the click not having worked at all.
  const applyUpdate = (data) => {
    withTimeout(updateTask(task.id, data)).catch((error) => showToast(`No se pudo guardar: ${error.message}`))
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
          withTimeout(toggleTaskComplete(task)).catch((error) => showToast(`No se pudo actualizar: ${error.message}`))
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

      <DescriptionCell task={task} onUpdate={applyUpdate} />

      <AssigneeCell task={task} userById={userById} users={users} onUpdate={applyUpdate} />

      <PillCell
        options={PRIORITIES}
        value={task.priority}
        meta={task.priority ? priorityMeta(task.priority) : null}
        emptyLabel="Prioridad"
        onChange={(id) => applyUpdate({ priority: id })}
      />

      <EstimationCell task={task} onUpdate={applyUpdate} />

      <PillCell
        options={STATUSES}
        value={task.status}
        meta={statusMeta(task.status)}
        onChange={(id) => applyUpdate({ status: id })}
      />
    </div>
  )
}
