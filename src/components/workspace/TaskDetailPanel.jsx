import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { applyTaskUpdate, deleteTask, subscribeTaskHistory, subscribeObjetivos } from '../../lib/firestore'
import { STATUSES, PRIORITIES, RECURRENCES } from '../../lib/workspace'
import TaskComments from './TaskComments'
import { SubtasksBlock } from './TaskChrome'
import { quarterKey } from '../../lib/finance'
import { CloseIcon } from '../icons'
import AvatarStack from './AvatarStack'
import { SHEET, swipeToClose } from '../../lib/motion'

function formatHistoryDate(value) {
  const date = value?.toDate?.()
  if (!date) return ''
  return date.toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

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

export default function TaskDetailPanel({ task, workstream, users, userById, actorUserId, actorName, onClose: onCloseRaw, initialSection, allTasks = [], onNavigate }) {
  const descRef = useRef(null)
  const [title, setTitle] = useState(task?.title || '')
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [history, setHistory] = useState([])
  const [objetivos, setObjetivos] = useState([])

  useEffect(() => {
    if (!task?.id) return
    return subscribeTaskHistory(task.id, setHistory)
  }, [task?.id])

  useEffect(() => subscribeObjetivos(setObjetivos), [])
  const currentQuarterObjetivos = objetivos.filter((o) => o.quarter === quarterKey())

  // Tareas previas (dependencias). Un ciclo (A espera a B y B a A) no se permite:
  // se ofrecen solo las que no dependen, ni siquiera de lejos, de esta.
  const byId = Object.fromEntries(allTasks.map((t) => [t.id, t]))
  const dependsOn = (fromId, targetId, seen = new Set()) => {
    if (seen.has(fromId)) return false
    seen.add(fromId)
    return (byId[fromId]?.blockedBy || []).some((id) => id === targetId || dependsOn(id, targetId, seen))
  }
  const blockers = (task?.blockedBy || []).map((id) => byId[id]).filter(Boolean)
  const blockerOptions = task
    ? allTasks.filter((t) => t.id !== task.id && t.workstreamId === task.workstreamId && !(task.blockedBy || []).includes(t.id) && !dependsOn(t.id, task.id))
    : []

  useEffect(() => {
    if (initialSection !== 'comments') return
    const t = setTimeout(() => document.getElementById('task-comments')?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 380)
    return () => clearTimeout(t)
  }, [initialSection, task?.id])

  if (!task) return null

  const dueValue = task.dueDate?.toDate?.() ? task.dueDate.toDate().toISOString().slice(0, 10) : ''
  const startValue = task.startDate?.toDate?.() ? task.startDate.toDate().toISOString().slice(0, 10) : ''
  const endValue = (task.endDate?.toDate?.() || (task.startDate ? task.dueDate?.toDate?.() : null))?.toISOString?.().slice(0, 10) || ''
  const assignedTo = task.assignedTo || []

  const applyUpdate = (data) => applyTaskUpdate(task, data, actorUserId, actorName)

  // Refs remember what was just written: the blur and the close both call
  // these, and `task` only catches up a moment later — without them a title
  // typed then closed would be saved (and logged) twice.
  const lastTitle = useRef(null)
  const lastDesc = useRef(null)
  const saveTitle = () => {
    const t = title.trim()
    if (t && t !== task.title && t !== lastTitle.current) {
      lastTitle.current = t
      applyUpdate({ title: t })
    }
  }
  const saveDescription = (value) => {
    const v = value.trim()
    if (v !== (task.description || '') && v !== lastDesc.current) {
      lastDesc.current = v
      applyUpdate({ description: v })
    }
  }

  // Cerrar por cualquier lado (X, fuera del panel, deslizar) guarda antes lo que
  // se estaba escribiendo: el blur del campo no siempre alcanza a correr antes
  // de que el panel se desmonte.
  const onClose = () => {
    saveTitle()
    if (descRef.current) saveDescription(descRef.current.value)
    onCloseRaw()
  }

  const toggleAssignee = (uid) => {
    const next = assignedTo.includes(uid) ? assignedTo.filter((id) => id !== uid) : [...assignedTo, uid]
    applyUpdate({ assignedTo: next })
  }

  const handleDelete = () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true)
      return
    }
    deleteTask(task.id)
    onCloseRaw()
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
        transition={SHEET}
        {...swipeToClose('x', onClose)}
        className="fixed right-0 top-0 z-50 h-full w-[440px]"
        onClick={(e) => e.stopPropagation()}
      >
      <div className="ador-modal-surface ador-grain flex h-full flex-col overflow-y-auto">
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
              ref={descRef}
              defaultValue={task.description || ''}
              onBlur={(e) => saveDescription(e.target.value)}
              rows={3}
              placeholder="Sin descripción"
              className="w-full resize-none rounded-xl border border-white/[0.08] bg-[#1A1A1A] px-3.5 py-[10px] text-[13px] text-[#F5F5F5] placeholder:text-[#444444] outline-none focus:border-white/[0.2]"
            />
          </div>

          <div>
            <span className="mb-2 block font-medium text-[#444444]" style={labelStyle}>
              Estado
            </span>
            <PillToggle options={STATUSES} value={task.status} onChange={(id) => applyUpdate({ status: id })} />
          </div>

          <div>
            <span className="mb-2 block font-medium text-[#444444]" style={labelStyle}>
              Prioridad
            </span>
            <PillToggle options={PRIORITIES} value={task.priority} onChange={(id) => applyUpdate({ priority: id })} />
          </div>

          <div>
            <span className="mb-2 block font-medium text-[#444444]" style={labelStyle}>
              Objetivo vinculado
            </span>
            <select
              value={task.objetivoId || ''}
              onChange={(e) => applyUpdate({ objetivoId: e.target.value || null })}
              className="w-full rounded-xl border border-white/[0.08] bg-[#1A1A1A] px-3.5 py-[10px] text-[13px] text-[#F5F5F5] outline-none focus:border-white/[0.2]"
            >
              <option value="">Ninguno</option>
              {currentQuarterObjetivos.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[11px] text-[#444444]">Conecta esta tarea al Objetivo que está empujando esta semana.</p>
          </div>

          <div>
            <span className="mb-2 block font-medium text-[#444444]" style={labelStyle}>
              Fecha límite
            </span>
            <input
              type="date"
              value={dueValue}
              onChange={(e) => applyUpdate({ dueDate: e.target.value ? new Date(`${e.target.value}T00:00:00`) : null })}
              className="w-full rounded-xl border border-white/[0.08] bg-[#1A1A1A] px-3.5 py-[10px] text-[13px] text-[#F5F5F5] outline-none focus:border-white/[0.2]"
            />
            <p className="mt-1.5 text-[11px] text-[#444444]">Es el plazo: decide cuándo aparece en Hoy y cuándo se marca atrasada.</p>
          </div>

          <div>
            <span className="mb-2 block font-medium text-[#444444]" style={labelStyle}>
              Timeline
            </span>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-[11px] text-[#666666]">
                Inicio
                <input
                  type="date"
                  value={startValue}
                  onChange={(e) => applyUpdate({ startDate: e.target.value ? new Date(`${e.target.value}T00:00:00`) : null })}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#1A1A1A] px-3.5 py-[10px] text-[13px] text-[#F5F5F5] outline-none focus:border-white/[0.2]"
                />
              </label>
              <label className="flex flex-col gap-1 text-[11px] text-[#666666]">
                Fin
                <input
                  type="date"
                  value={endValue}
                  onChange={(e) => applyUpdate({ endDate: e.target.value ? new Date(`${e.target.value}T00:00:00`) : null })}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#1A1A1A] px-3.5 py-[10px] text-[13px] text-[#F5F5F5] outline-none focus:border-white/[0.2]"
                />
              </label>
            </div>
            <p className="mt-1.5 text-[11px] text-[#444444]">Es el tramo de trabajo: se dibuja como barra en la vista Timeline.</p>
          </div>

          <div>
            <span className="mb-2 block font-medium text-[#444444]" style={labelStyle}>
              Subtareas{(task.subtasks || []).length ? ` · ${(task.subtasks || []).filter((x) => x.done).length}/${(task.subtasks || []).length}` : ''}
            </span>
            <SubtasksBlock task={task} embedded />
          </div>

          <div>
            <span className="mb-2 block font-medium text-[#444444]" style={labelStyle}>
              Depende de
            </span>
            {blockers.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {blockers.map((b) => (
                  <span key={b.id} className="flex max-w-full items-center gap-1.5 rounded-full bg-white/[0.07] py-1 pl-2.5 pr-1.5 text-[11.5px]" style={{ color: b.status === 'completado' ? '#4CAF50' : '#DDDDDD' }}>
                    <span className="truncate">{b.title}</span>
                    <button type="button" onClick={() => applyUpdate({ blockedBy: (task.blockedBy || []).filter((x) => x !== b.id) })} className="text-[#888888] hover:text-[#F5F5F5]">
                      <CloseIcon size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <select
              value=""
              onChange={(e) => e.target.value && applyUpdate({ blockedBy: [...(task.blockedBy || []), e.target.value] })}
              className="w-full rounded-xl border border-white/[0.08] bg-[#1A1A1A] px-3.5 py-[10px] text-[13px] text-[#F5F5F5] outline-none focus:border-white/[0.2]"
            >
              <option value="">{blockerOptions.length ? 'Agregar una tarea previa…' : 'No hay otras tareas del proyecto'}</option>
              {blockerOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[11px] text-[#444444]">Esta tarea espera a las de arriba. En Timeline se dibuja una flecha, en rojo si empieza antes de que termine la previa.</p>
          </div>

          <div>
            <span className="mb-2 block font-medium text-[#444444]" style={labelStyle}>
              Repetir
            </span>
            <select
              value={task.recurrence || ''}
              onChange={(e) => applyUpdate({ recurrence: e.target.value || null })}
              className="w-full rounded-xl border border-white/[0.08] bg-[#1A1A1A] px-3.5 py-[10px] text-[13px] text-[#F5F5F5] outline-none focus:border-white/[0.2]"
            >
              <option value="">No se repite</option>
              {RECURRENCES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[11px] text-[#444444]">Al completarla, se crea sola la siguiente con la fecha límite corrida.</p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium text-[#444444]" style={labelStyle}>
                Asignado a
              </span>
              <AvatarStack userIds={assignedTo} userById={userById} pendingIds={task.pendingConfirmations || []} size={22} />
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
                  {(task.pendingConfirmations || []).includes(u.id) && (
                    <span className="ml-auto text-[11px]" style={{ color: '#B8860B' }}>
                      pendiente de confirmar
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>

          <TaskComments task={task} users={users} userById={userById} actorUserId={actorUserId} actorName={actorName} onNavigate={onNavigate} />

          <div>
            <span className="mb-2 block font-medium text-[#444444]" style={labelStyle}>
              Historial
            </span>
            {history.length === 0 ? (
              <p className="text-[13px] font-light text-[#444444]">Sin actividad registrada</p>
            ) : (
              <div className="flex flex-col divide-y divide-white/[0.04]">
                {history.map((event) => (
                  <div key={event.id} className="flex flex-col gap-0.5 py-2 first:pt-0">
                    <span className="text-[13px] text-[#F5F5F5]">{event.description}</span>
                    <span className="text-[11px] text-[#444444]">{formatHistoryDate(event.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
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
      </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}
