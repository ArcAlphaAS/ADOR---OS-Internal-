import { AnimatePresence } from 'framer-motion'
import BottomSheet from '../common/BottomSheet'
import { applyTaskUpdate } from '../../lib/firestore'
import { STATUSES, PRIORITIES, withTimeout } from '../../lib/workspace'
import { useToast } from '../../hooks/useToast'
import { haptic } from '../../lib/haptics'

// Cambiar lo esencial de una tarea sin abrir todo el panel: estado, prioridad y fecha.
// Se abre al tocar la prioridad de una tarjeta. A media pantalla; arrastrando sube.
const day = (n) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  d.setHours(0, 0, 0, 0)
  return d
}
const nextMonday = () => {
  const d = new Date()
  const add = ((8 - d.getDay()) % 7) || 7
  return day(add)
}

function Group({ label, children }) {
  return (
    <section className="mt-4">
      <h3 className="px-1 pb-1.5 text-[13px] font-medium text-[#8E8E93]">{label}</h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  )
}
function Chip({ on, color, children, onClick }) {
  return (
    <button type="button" onClick={() => { haptic(); onClick() }} className="h-11 rounded-full px-4 text-[15px] font-medium" style={{ background: on ? (color || '#F5F5F5') : '#2C2C2E', color: on ? (color ? '#fff' : '#0A0A0A') : '#E4E4E4' }}>
      {children}
    </button>
  )
}

export default function QuickTaskSheet({ task, actorUserId, actorName, onClose, onOpenFull }) {
  const showToast = useToast()
  const apply = (data) => withTimeout(applyTaskUpdate(task, data, actorUserId, actorName)).catch((e) => showToast(`No se pudo actualizar: ${e.message}`))
  return (
    <AnimatePresence>
      <BottomSheet title={task.title} onClose={onClose}>
        <Group label="Estado">
          {STATUSES.map((s) => <Chip key={s.id} on={task.status === s.id} color={s.color === '#8A8A8A' ? '#636366' : s.color} onClick={() => apply({ status: s.id })}>{s.label}</Chip>)}
        </Group>
        <Group label="Prioridad">
          {PRIORITIES.map((p) => <Chip key={p.id} on={task.priority === p.id} color={p.color} onClick={() => apply({ priority: p.id })}>{p.label}</Chip>)}
        </Group>
        <Group label="Fecha límite">
          <Chip onClick={() => apply({ dueDate: day(0) })}>Hoy</Chip>
          <Chip onClick={() => apply({ dueDate: day(1) })}>Mañana</Chip>
          <Chip onClick={() => apply({ dueDate: nextMonday() })}>Próx. lunes</Chip>
          <Chip onClick={() => apply({ dueDate: null })}>Sin fecha</Chip>
        </Group>
        <button type="button" onClick={() => { onClose(); onOpenFull() }} className="mt-6 flex h-[52px] w-full items-center justify-center rounded-[18px] bg-[#2C2C2E] text-[16px] font-semibold text-[#F4EEE2] active:bg-[#3A3A3C]">
          Abrir tarea completa
        </button>
      </BottomSheet>
    </AnimatePresence>
  )
}
