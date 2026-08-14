import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { updateTask, deleteTask } from '../../lib/firestore'
import { STATUSES, PRIORITIES } from '../../lib/workspace'
import { CloseIcon } from '../icons'
import AvatarStack from './AvatarStack'

const labelStyle = { fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }

function PillToggle({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = value === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className="rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors duration-150"
            style={{
              borderColor: opt.color,
              background: active ? `${opt.color}26` : 'transparent',
              color: active ? opt.color : '#888888',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

export default function TaskDetailPanel({ task, workstream, users, userById, onClose }) {
  const [title, setTitle] = useState(task?.title || '')
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  if (!task) return null

  const dueValue = task.dueDate?.toDate?.() ? task.dueDate.toDate().toISOString().slice(0, 10) : ''
  const startValue = task.startDate?.toDate?.() ? task.startDate.toDate().toISOString().slice(0, 10) : ''
  const assignedTo = task.assignedTo || []

  const saveTitle = () => {
    if (title.trim() && title.trim() !== task.title) updateTask(task.id, { title: title.trim() })
  }

  const toggleAssignee = (uid) => {
    const next = assignedTo.includes(uid) ? assignedTo.filter((id) => id !== uid) : [...assignedTo, uid]
    updateTask(task.id, { assignedTo: next })
  }

  const handleDelete = () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true)
      return
    }
    deleteTask(task.id)
    onClose()
  }

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[6px]"
        onClick={onClose}
      />
      <motion.div
        key={task.id}
        initial={{ x: 440, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 440, opacity: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="ador-modal-surface ador-grain fixed right-0 top-0 z-50 flex h-full w-[440px] flex-col overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-7 pt-7">
          <span className="font-medium text-[#444444]" style={labelStyle}>
            {workstream?.name}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[#888888] transition-colors duration-150 hover:bg-white/[0.08] hover:text-[#F5F5F5]"
          >
            <CloseIcon size={14} />
          </button>
        </div>

        <div className="flex flex-col gap-6 px-7 pb-7 pt-4">
          <textarea
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            rows={2}
            className="resize-none bg-transparent text-[18px] font-semibold text-[#F5F5F5] outline-none"
          />

          <div>
            <span className="mb-2 block font-medium text-[#444444]" style={labelStyle}>
              Descripción
            </span>
            <textarea
              defaultValue={task.description || ''}
              onBlur={(e) => {
                if (e.target.value !== (task.description || '')) updateTask(task.id, { description: e.target.value.trim() })
              }}
              rows={3}
              placeholder="Sin descripción"
              className="w-full resize-none rounded-xl border border-white/[0.08] bg-[#1A1A1A] px-3.5 py-[10px] text-[13px] text-[#F5F5F5] placeholder:text-[#444444] outline-none focus:border-white/[0.2]"
            />
          </div>

          <div>
            <span className="mb-2 block font-medium text-[#444444]" style={labelStyle}>
              Estado
            </span>
            <PillToggle options={STATUSES} value={task.status} onChange={(id) => updateTask(task.id, { status: id })} />
          </div>

          <div>
            <span className="mb-2 block font-medium text-[#444444]" style={labelStyle}>
              Prioridad
            </span>
            <PillToggle options={PRIORITIES} value={task.priority} onChange={(id) => updateTask(task.id, { priority: id })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="mb-2 block font-medium text-[#444444]" style={labelStyle}>
                Inicio
              </span>
              <input
                type="date"
                value={startValue}
                onChange={(e) =>
                  updateTask(task.id, {
                    startDate: e.target.value ? new Date(`${e.target.value}T00:00:00`) : null,
                  })
                }
                className="w-full rounded-xl border border-white/[0.08] bg-[#1A1A1A] px-3.5 py-[10px] text-[13px] text-[#F5F5F5] outline-none focus:border-white/[0.2]"
              />
            </div>
            <div>
              <span className="mb-2 block font-medium text-[#444444]" style={labelStyle}>
                Fecha límite
              </span>
              <input
                type="date"
                value={dueValue}
                onChange={(e) =>
                  updateTask(task.id, {
                    dueDate: e.target.value ? new Date(`${e.target.value}T00:00:00`) : null,
                  })
                }
                className="w-full rounded-xl border border-white/[0.08] bg-[#1A1A1A] px-3.5 py-[10px] text-[13px] text-[#F5F5F5] outline-none focus:border-white/[0.2]"
              />
            </div>
          </div>
          <p className="-mt-4 text-[11px] text-[#444444]">La fecha de inicio es opcional — solo se usa para dibujar la duración en la vista Timeline.</p>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium text-[#444444]" style={labelStyle}>
                Asignado a
              </span>
              <AvatarStack userIds={assignedTo} userById={userById} size={22} />
            </div>
            <div className="flex flex-col gap-1.5">
              {users.map((u) => (
                <label key={u.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors duration-150 hover:bg-white/[0.03]">
                  <input
                    type="checkbox"
                    checked={assignedTo.includes(u.id)}
                    onChange={() => toggleAssignee(u.id)}
                    className="h-3.5 w-3.5 accent-[#1E5FAD]"
                  />
                  <span className="text-[13px] text-[#F5F5F5]">{u.displayName || u.email}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleDelete}
            className="mt-2 w-full rounded-xl border py-2.5 text-[13px] font-medium transition-colors duration-150"
            style={{
              borderColor: confirmingDelete ? '#EF5350' : 'rgba(255,255,255,0.08)',
              color: confirmingDelete ? '#EF5350' : '#888888',
              background: confirmingDelete ? 'rgba(239,83,80,0.1)' : 'transparent',
            }}
          >
            {confirmingDelete ? 'Confirmar eliminación' : 'Eliminar tarea'}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}
