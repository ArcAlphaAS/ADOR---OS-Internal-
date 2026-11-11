import { useRef, useState } from 'react'
import TaskContextMenu from './TaskContextMenu'
import { motion, useAnimationControls } from 'framer-motion'
import { isTouchLayout } from '../../lib/motion'
import { toggleTaskComplete, applyTaskUpdate, deleteTask, restoreTask } from '../../lib/firestore'
import { registerUndo } from '../../lib/undo'
import { priorityMeta, isOverdue, isDueToday, withTimeout } from '../../lib/workspace'
import { useToast } from '../../hooks/useToast'
import AvatarStack from './AvatarStack'
import QuickTaskSheet from './QuickTaskSheet'
import { haptic } from '../../lib/haptics'

// Una tarea en el teléfono: una tarjeta, no una fila de tabla. Círculo para
// completar, el título grande, debajo el proyecto y cuándo vence (en rojo si ya
// pasó), el avance de las subtareas, y a la derecha la prioridad y los
// asignados. Tocar la tarjeta abre el panel con todo lo editable; las
// columnas de la tabla (estado, fechas, descripción) viven ahí.
const fmt = (d) => d.toLocaleDateString('es', { day: 'numeric', month: 'short' })

export default function PhoneTaskCard({ task, workstream, workstreams = [], userById, actorUserId, actorName, onOpen, onReschedule }) {
  const [menu, setMenu] = useState(null) // mantener pulsado → menú de la tarea (el "clic derecho" del teléfono)
  const press = useRef(null)
  const startPt = useRef(null)
  const showToast = useToast()
  const dragged = useRef(false)
  const controls = useAnimationControls()
  const [open, setOpen] = useState(false) // acciones de la izquierda a la vista
  const [confirming, setConfirming] = useState(false)
  const [quick, setQuick] = useState(false)
  const done = task.status === 'completado'
  const due = task.dueDate?.toDate?.() || null
  const overdue = isOverdue(task)
  const subs = task.subtasks || []
  const subsDone = subs.filter((s) => s.done).length
  const pm = task.priority ? priorityMeta(task.priority) : null
  const dueText = due ? (isDueToday(task) ? 'Hoy' : overdue ? `Venció ${fmt(due)}` : fmt(due)) : null

  const complete = () => {
    haptic(done ? 'tap' : 'success') // en el mismo gesto del dedo (iOS lo exige)
    const wasDone = done
    return withTimeout(toggleTaskComplete(task, actorName))
      .then(() => registerUndo(wasDone ? 'Tarea reabierta' : 'Tarea completada', () => toggleTaskComplete({ ...task, status: wasDone ? 'por_hacer' : 'completado' }, actorName)))
      .catch((error) => showToast(`No se pudo actualizar: ${error.message}`))
  }
  const touch = isTouchLayout()
  const closeActions = () => {
    setOpen(false)
    setConfirming(false)
    controls.start({ x: 0, transition: { type: 'spring', stiffness: 520, damping: 42 } })
  }

  return (
    <div className="ador-card-in relative overflow-hidden rounded-[22px]">
      {touch && (
        <div className="absolute inset-0 flex items-center gap-2 bg-[#34C759] px-5 text-[15px] font-semibold text-white">
          ✓ {done ? 'Reabrir' : 'Completar'}
        </div>
      )}
      {touch && (
        <div className="absolute inset-y-0 right-0 flex w-[176px]">
          <button type="button" onClick={() => { haptic(); closeActions(); const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(0, 0, 0, 0); withTimeout(applyTaskUpdate(task, { dueDate: d }, actorUserId, actorName)).then(() => registerUndo('Fecha movida a mañana', () => applyTaskUpdate(task, { dueDate: task.dueDate || null }, actorUserId, actorName))).catch((error) => showToast(`No se pudo mover: ${error.message}`)) }} className="flex flex-1 flex-col items-center justify-center gap-1 bg-[#FF9F0A] text-[13px] font-semibold text-white active:brightness-90">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M8 3v4M16 3v4M3.5 10h17" /></svg>
            Mañana
          </button>
          <button type="button" onClick={() => { if (!confirming) { haptic('heavy'); setConfirming(true); return } haptic('heavy'); deleteTask(task.id).then(() => registerUndo('Tarea eliminada', () => restoreTask(task))).catch((error) => showToast(`No se pudo eliminar: ${error.message}`)) }} className="flex flex-1 flex-col items-center justify-center gap-1 bg-[#FF3B30] text-[13px] font-semibold text-white active:brightness-90">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" /></svg>
            {confirming ? '¿Seguro?' : 'Eliminar'}
          </button>
        </div>
      )}
    <motion.div
      {...(touch ? {
        drag: 'x',
        animate: controls,
        dragConstraints: { left: -176, right: 0 },
        dragElastic: { left: 0.06, right: 0.7 },
        dragMomentum: false,
        onDragStart: () => { dragged.current = true },
        onDragEnd: (_e, info) => {
          setTimeout(() => { dragged.current = false }, 80)
          if (info.offset.x > 110 || info.velocity.x > 700) {
            closeActions()
            complete()
          } else if (info.offset.x < -64 || info.velocity.x < -500) {
            haptic()
            setOpen(true)
            controls.start({ x: -176, transition: { type: 'spring', stiffness: 520, damping: 42 } })
          } else {
            closeActions()
          }
        },
      } : {})}
      className="relative flex items-center gap-3.5 bg-[#1C1C1E] px-4 py-3.5"
      onClick={(e) => { if (dragged.current) return; if (open) return closeActions(); onOpen(task, null, e.currentTarget.getBoundingClientRect()) }}
      onTouchStart={(e) => {
        const t = e.touches?.[0]
        if (!t) return
        clearTimeout(press.current)
        startPt.current = { x: t.clientX, y: t.clientY }
        press.current = setTimeout(() => {
          dragged.current = true
          haptic('heavy')
          setMenu({ x: t.clientX, y: t.clientY })
          setTimeout(() => { dragged.current = false }, 400)
        }, 480)
      }}
      onTouchMove={(e) => {
        const t = e.touches?.[0]
        if (t && startPt.current && Math.hypot(t.clientX - startPt.current.x, t.clientY - startPt.current.y) < 8) return
        clearTimeout(press.current)
      }}
      onTouchEnd={() => clearTimeout(press.current)}
      onTouchCancel={() => clearTimeout(press.current)}
    >
      <motion.button
        type="button"
        whileTap={{ scale: 0.8 }}
        transition={{ type: 'spring', stiffness: 600, damping: 22 }}
        aria-label={done ? 'Reabrir tarea' : 'Completar tarea'}
        onClick={(e) => {
          e.stopPropagation()
          complete()
        }}
        className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-full border-[1.5px] text-[13px] font-bold text-[#0A0A0A]"
        style={{ borderColor: done ? '#F4EEE2' : overdue ? '#D98A86' : 'rgba(255,255,255,0.32)', background: done ? '#F4EEE2' : 'transparent' }}
      >
        {done ? '✓' : ''}
      </motion.button>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16px] font-medium" style={{ color: done ? '#767676' : '#F5F5F5', textDecoration: done ? 'line-through' : 'none' }}>{task.title}</span>
        <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[13px] text-[#8E8E93]">
          {workstream?.name && <span className="truncate">{workstream.name}</span>}
          {dueText && <span className="flex-shrink-0" style={{ color: overdue ? '#D98A86' : isDueToday(task) ? '#F4EEE2' : '#8E8E93' }}>{workstream?.name ? '· ' : ''}{dueText}</span>}
          {subs.length > 0 && <span className="flex-shrink-0">· ☑ {subsDone}/{subs.length}</span>}
        </span>
        {onReschedule && overdue && (
          <button type="button" onClick={(e) => { e.stopPropagation(); onReschedule(task) }} className="mt-2 rounded-full bg-white/[0.08] px-3 py-1 text-[12.5px] font-medium text-[#F4EEE2]">Mover a hoy</button>
        )}
      </span>

      <span className="flex flex-shrink-0 flex-col items-end gap-2">
        {pm && <button type="button" onClick={(e) => { e.stopPropagation(); haptic(); setQuick(true) }} aria-label="Cambiar estado, prioridad o fecha" className="rounded-full px-2.5 py-[3px] text-[11.5px] font-semibold" style={{ background: `${pm.color}22`, color: pm.color }}>{pm.label}</button>}
        {(task.assignedTo || []).length > 0 && <AvatarStack userIds={task.assignedTo} userById={userById} pendingIds={task.pendingConfirmations || []} size={22} />}
      </span>
    </motion.div>
      {quick && <QuickTaskSheet task={task} actorUserId={actorUserId} actorName={actorName} onClose={() => setQuick(false)} onOpenFull={() => onOpen(task)} />}
      {menu && <TaskContextMenu task={task} x={menu.x} y={menu.y} workstreams={workstreams} actorUserId={actorUserId} actorName={actorName} onClose={() => setMenu(null)} onOpen={onOpen} onAddSubtask={() => onOpen(task)} />}
    </div>
  )
}
