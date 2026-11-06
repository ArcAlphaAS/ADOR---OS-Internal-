import { useState } from 'react'
import { motion } from 'framer-motion'
import { applyTaskUpdate } from '../../lib/firestore'
import { withTimeout, PRIORITIES, STATUSES, priorityMeta, statusMeta } from '../../lib/workspace'
import { useToast } from '../../hooks/useToast'
import { PillCell } from '../workspace/TaskCells'
import AvatarStack from '../workspace/AvatarStack'
import { ChevronDownIcon } from '../icons'

// Tarjeta de tarea que nace compacta (proyecto, progreso, prioridad, estado,
// asignados) y se despliega en el mismo sitio con las subtareas marcables y
// los chips editables — sin abrir el panel. Es un solo elemento que cambia de
// tamaño (layout), no dos elementos que se reemplazan. Sin vidrio/blur a
// propósito: transform + backdrop-filter en el mismo elemento rompe el blur.
const SPRING = { type: 'spring', stiffness: 420, damping: 38 }

export default function ExpandableTaskCard({ task, label, userById, actorUserId, actorName, onOpen }) {
  const [open, setOpen] = useState(false)
  const showToast = useToast()
  const subs = task.subtasks || []
  const done = subs.filter((s) => s.done).length
  const pct = subs.length ? Math.round((done / subs.length) * 100) : null

  const save = (data) => withTimeout(applyTaskUpdate(task, data, actorUserId, actorName)).catch((e) => showToast(`No se pudo actualizar: ${e.message}`))
  const toggleSub = (id) => save({ subtasks: subs.map((s) => (s.id === id ? { ...s, done: !s.done } : s)) })

  return (
    <motion.div layout transition={SPRING} className="w-full max-w-[460px] overflow-hidden rounded-2xl border border-white/[0.09] bg-white/[0.04]" style={{ borderRadius: 16 }}>
      <motion.button layout="position" type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 px-3.5 py-3 text-left">
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-white/[0.07]">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F4EEE2" strokeWidth="1.7" strokeLinejoin="round"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" /><circle cx="12" cy="12" r="3" /></svg>
        </span>
        <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-[#F0F0F0]">{label || 'Tarea'}</span>
        {pct !== null && (
          <span className="flex flex-shrink-0 items-center gap-2">
            <span className="h-[5px] w-16 overflow-hidden rounded-full bg-white/[0.1]">
              <span className="block h-full rounded-full bg-[#F4EEE2] transition-all duration-500" style={{ width: `${pct}%` }} />
            </span>
            <span className="text-[12px] tabular-nums text-[#9A9A9A]">{pct}%</span>
          </span>
        )}
        <ChevronDownIcon size={14} className="flex-shrink-0 text-[#8A8A8A] transition-transform duration-200" style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
      </motion.button>

      {!open && (
        <motion.div layout="position" className="flex items-center gap-2 px-3.5 pb-3">
          <span className="rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ background: `${priorityMeta(task.priority).color}22`, color: priorityMeta(task.priority).color }}>
            {priorityMeta(task.priority).label}
          </span>
          <span className="rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ background: `${statusMeta(task.status).color}22`, color: statusMeta(task.status).color }}>
            {statusMeta(task.status).label}
          </span>
          <span className="ml-auto"><AvatarStack userIds={task.assignedTo || []} userById={userById} size={24} /></span>
        </motion.div>
      )}

      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25, delay: 0.08 }} className="px-3.5 pb-3.5">
          {subs.length > 0 && (
            <ul className="relative ml-[15px] border-l border-white/[0.14] pb-1 pl-4">
              {subs.map((s) => (
                <li key={s.id} className="relative">
                  <span aria-hidden className="absolute -left-4 top-[19px] h-px w-3 bg-white/[0.14]" />
                  <button type="button" onClick={() => toggleSub(s.id)} className="flex w-full items-center gap-2.5 py-2 text-left">
                    <span
                      className="flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full border-[1.5px] text-[10px] font-bold leading-none text-[#0A0A0A]"
                      style={{ borderColor: s.done ? '#F4EEE2' : 'rgba(255,255,255,0.3)', background: s.done ? '#F4EEE2' : 'transparent' }}
                    >
                      {s.done ? '✓' : ''}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13.5px]" style={{ color: s.done ? '#767676' : '#E4E4E4', textDecoration: s.done ? 'line-through' : 'none' }}>{s.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className={`flex flex-col gap-2.5 ${subs.length ? 'mt-2' : ''}`}>
            <div className="flex items-center gap-3">
              <span className="w-[68px] text-[12px] text-[#8A8A8A]">Prioridad</span>
              <PillCell options={PRIORITIES} value={task.priority} meta={priorityMeta(task.priority)} onChange={(v) => save({ priority: v })} emptyLabel="Prioridad" />
            </div>
            <div className="flex items-center gap-3">
              <span className="w-[68px] text-[12px] text-[#8A8A8A]">Estado</span>
              <PillCell options={STATUSES} value={task.status} meta={statusMeta(task.status)} onChange={(v) => save({ status: v })} emptyLabel="Estado" />
            </div>
            <div className="flex items-center gap-3">
              <span className="w-[68px] text-[12px] text-[#8A8A8A]">Asignados</span>
              <AvatarStack userIds={task.assignedTo || []} userById={userById} size={26} />
            </div>
          </div>
          <button type="button" onClick={onOpen} className="mt-3 text-[12.5px] font-medium text-[#F4EEE2] hover:underline">
            Abrir tarea completa →
          </button>
        </motion.div>
      )}
    </motion.div>
  )
}
