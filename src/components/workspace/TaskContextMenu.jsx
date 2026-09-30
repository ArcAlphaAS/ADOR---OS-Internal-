import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { applyTaskUpdate, createTask, deleteTask, toggleTaskComplete, findOrCreateGeneralProyecto } from '../../lib/firestore'
import { withTimeout, workstreamId as buildWorkstreamId } from '../../lib/workspace'
import { useToast } from '../../hooks/useToast'

// Right-click on a task row, like Monday's: copy name/link, open, duplicate,
// add a subtask, move to another project, complete/reopen, delete. One menu
// for every task table (Grupo/Lista, Hoy, Personal). Portaled to
// document.body at the cursor (§1) and clamped to the viewport.
function Item({ label, onClick, danger, hint }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors hover:bg-white/[0.07]"
      style={{ color: danger ? '#EF5350' : '#E8E8E8' }}
    >
      {label}
      {hint && <span className="text-[11px] text-[#888888]">{hint}</span>}
    </button>
  )
}

const Divider = () => <div className="my-1 h-px bg-white/[0.08]" />

export default function TaskContextMenu({ task, x, y, workstreams = [], actorUserId, actorName, onClose, onOpen, onAddSubtask }) {
  const showToast = useToast()
  const ref = useRef(null)
  const [pos, setPos] = useState({ left: x, top: y })
  const [moving, setMoving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const completed = task.status === 'completado'

  // Keep it on screen (it can open near the right/bottom edge, and the
  // "Mover a" list makes it taller).
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setPos({
      left: Math.max(8, Math.min(x, window.innerWidth - r.width - 8)),
      top: Math.max(8, Math.min(y, window.innerHeight - r.height - 8)),
    })
  }, [x, y, moving, confirmDelete])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onClose, true)
    window.addEventListener('resize', onClose)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onClose, true)
      window.removeEventListener('resize', onClose)
    }
  }, [onClose])

  const run = (fn) => async () => {
    onClose()
    try {
      await withTimeout(Promise.resolve(fn()))
    } catch (e) {
      showToast(`No se pudo completar la acción: ${e.message}`)
    }
  }
  const copy = (text, done) => run(() => navigator.clipboard.writeText(text).then(() => showToast(done)))

  const duplicate = () =>
    createTask(
      {
        title: `${task.title} (copia)`,
        description: task.description || '',
        workstreamId: task.workstreamId || null,
        priority: task.priority || 'media',
        objetivoId: task.objetivoId || null,
        recurrence: task.recurrence || null,
        assignedTo: task.assignedTo || [],
        startDate: task.startDate?.toDate?.() || null,
        dueDate: task.dueDate?.toDate?.() || null,
        subtasks: (task.subtasks || []).map((s) => ({ ...s, id: Math.random().toString(36).slice(2, 10), done: false })),
      },
      actorName,
      actorUserId
    ).then(() => showToast('Tarea duplicada.'))

  const moveTo = async (id) => {
    const target = id || (await findOrCreateGeneralProyecto(actorName).then((pid) => buildWorkstreamId('proyecto', pid)))
    await applyTaskUpdate(task, { workstreamId: target }, actorUserId, actorName)
    showToast('Tarea movida.')
  }

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[998]"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault()
          onClose()
        }}
      />
      <motion.div
        ref={ref}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.12, ease: 'easeOut' }}
        className="fixed z-[999] w-[230px]"
        style={{ left: pos.left, top: pos.top, transformOrigin: 'top left' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ador-glass ador-grain max-h-[70vh] overflow-y-auto rounded-xl p-1.5">
          <Item label="Copiar nombre" onClick={copy(task.title, 'Nombre copiado.')} />
          <Item label="Copiar enlace de la tarea" onClick={copy(`${window.location.origin}/?open=workspace&task=${task.id}`, 'Enlace copiado.')} />
          <Divider />
          <Item label="Abrir tarea" onClick={() => { onClose(); onOpen(task) }} />
          <Item label="Agregar subtarea" onClick={() => { onClose(); onAddSubtask() }} />
          <Item label="Duplicar" onClick={run(duplicate)} />
          <Item label="Mover a…" hint={moving ? '▾' : '▸'} onClick={() => setMoving((v) => !v)} />
          {moving && (
            <div className="mb-1 ml-2 flex flex-col border-l border-white/[0.08] pl-1.5">
              {[{ id: null, name: 'General' }, ...workstreams.filter((w) => w.id !== task.workstreamId && w.name !== 'General')].map((w) => (
                <Item key={w.id ?? 'general'} label={w.name} onClick={run(() => moveTo(w.id))} />
              ))}
            </div>
          )}
          <Divider />
          <Item label={completed ? 'Reabrir' : 'Marcar como completada'} onClick={run(() => toggleTaskComplete(task, actorName))} />
          <Divider />
          {confirmDelete ? (
            <Item label="Clic otra vez para eliminar" danger onClick={run(() => deleteTask(task.id))} />
          ) : (
            <Item label="Eliminar" danger onClick={() => setConfirmDelete(true)} />
          )}
        </div>
      </motion.div>
    </>,
    document.body
  )
}
