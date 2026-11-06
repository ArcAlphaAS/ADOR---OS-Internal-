import { useRef, useState } from 'react'
import TaskContextMenu from './TaskContextMenu'
import { motion } from 'framer-motion'
import { isTouchLayout } from '../../lib/motion'
import { toggleTaskComplete } from '../../lib/firestore'
import { priorityMeta, isOverdue, isDueToday, withTimeout } from '../../lib/workspace'
import { useToast } from '../../hooks/useToast'
import AvatarStack from './AvatarStack'

// Una tarea en el teléfono: una tarjeta, no una fila de tabla. Círculo para
// completar, el título grande, debajo el proyecto y cuándo vence (en rojo si ya
// pasó), el avance de las subtareas, y a la derecha la prioridad y los
// asignados. Tocar la tarjeta abre el panel con todo lo editable; las
// columnas de la tabla (estado, fechas, descripción) viven ahí.
const fmt = (d) => d.toLocaleDateString('es', { day: 'numeric', month: 'short' })

export default function PhoneTaskCard({ task, workstream, workstreams = [], userById, actorUserId, actorName, onOpen, onReschedule }) {
  const [menu, setMenu] = useState(null) // mantener pulsado → menú de la tarea (el "clic derecho" del teléfono)
  const press = useRef(null)
  const showToast = useToast()
  const dragged = useRef(false)
  const done = task.status === 'completado'
  const due = task.dueDate?.toDate?.() || null
  const overdue = isOverdue(task)
  const subs = task.subtasks || []
  const subsDone = subs.filter((s) => s.done).length
  const pm = task.priority ? priorityMeta(task.priority) : null
  const dueText = due ? (isDueToday(task) ? 'Hoy' : overdue ? `Venció ${fmt(due)}` : fmt(due)) : null

  const complete = () => withTimeout(toggleTaskComplete(task, actorName)).catch((error) => showToast(`No se pudo actualizar: ${error.message}`))
  const touch = isTouchLayout()

  return (
    <div className="relative overflow-hidden rounded-[22px]">
      {touch && (
        <div className="absolute inset-0 flex items-center gap-2 bg-[#F4EEE2] px-5 text-[14px] font-semibold text-[#1C1A16]">
          ✓ {done ? 'Reabrir' : 'Completar'}
        </div>
      )}
    <motion.div
      {...(touch ? {
        drag: 'x',
        dragConstraints: { left: 0, right: 0 },
        dragElastic: { left: 0.05, right: 0.7 },
        dragSnapToOrigin: true,
        onDragStart: () => { dragged.current = true },
        onDragEnd: (_e, info) => {
          setTimeout(() => { dragged.current = false }, 80)
          if (info.offset.x > 110 || info.velocity.x > 700) complete()
        },
      } : {})}
      className="relative flex items-center gap-3.5 bg-[#1C1C1E] px-4 py-3.5"
      onClick={() => { if (!dragged.current) onOpen(task) }}
      onTouchStart={(e) => {
        const t = e.touches?.[0]
        if (!t) return
        clearTimeout(press.current)
        press.current = setTimeout(() => {
          dragged.current = true
          navigator.vibrate?.(12)
          setMenu({ x: t.clientX, y: t.clientY })
          setTimeout(() => { dragged.current = false }, 400)
        }, 480)
      }}
      onTouchMove={() => clearTimeout(press.current)}
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
        {pm && <span className="rounded-full px-2.5 py-[3px] text-[11.5px] font-semibold" style={{ background: `${pm.color}22`, color: pm.color }}>{pm.label}</span>}
        {(task.assignedTo || []).length > 0 && <AvatarStack userIds={task.assignedTo} userById={userById} pendingIds={task.pendingConfirmations || []} size={22} />}
      </span>
    </motion.div>
      {menu && <TaskContextMenu task={task} x={menu.x} y={menu.y} workstreams={workstreams} actorUserId={actorUserId} actorName={actorName} onClose={() => setMenu(null)} onOpen={onOpen} onAddSubtask={() => onOpen(task)} />}
    </div>
  )
}
