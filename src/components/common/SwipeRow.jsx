import { useRef, useState } from 'react'
import { motion, useAnimationControls } from 'framer-motion'
import { isTouchLayout } from '../../lib/motion'
import { haptic } from '../../lib/haptics'

// Fila que se desliza como en Mail: hacia la izquierda deja ver botones de color (`actions`),
// hacia la derecha ejecuta `rightAction` al soltar pasado cierto punto. Solo en pantallas táctiles;
// en computadora devuelve los hijos tal cual. Tocar la fila abierta la cierra.
//   actions: [{ label, color, onClick, Icon? }]   rightAction: { label, color, onClick }
export default function SwipeRow({ children, actions = [], rightAction = null, background = '#1C1C1E', className = '' }) {
  const touch = isTouchLayout()
  const controls = useAnimationControls()
  const [open, setOpen] = useState(false)
  const dragged = useRef(false)
  if (!touch || (!actions.length && !rightAction)) return <div className={className}>{children}</div>
  const width = actions.length * 88
  const close = () => {
    setOpen(false)
    controls.start({ x: 0, transition: { type: 'spring', stiffness: 520, damping: 42 } })
  }
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {rightAction && (
        <div className="absolute inset-0 flex items-center gap-2 px-5 text-[15px] font-semibold text-white" style={{ background: rightAction.color }}>
          {rightAction.label}
        </div>
      )}
      {actions.length > 0 && (
        <div className="absolute inset-y-0 right-0 flex" style={{ width }}>
          {actions.map((a) => (
            <button key={a.label} type="button" onClick={() => { haptic(); close(); a.onClick() }} className="flex flex-1 flex-col items-center justify-center gap-1 text-[13px] font-semibold text-white active:brightness-90" style={{ background: a.color }}>
              {a.Icon && <a.Icon size={20} />}
              {a.label}
            </button>
          ))}
        </div>
      )}
      <motion.div
        drag="x"
        animate={controls}
        dragConstraints={{ left: -width, right: 0 }}
        dragElastic={{ left: 0.06, right: rightAction ? 0.7 : 0.05 }}
        dragMomentum={false}
        onDragStart={() => { dragged.current = true }}
        onDragEnd={(_e, info) => {
          setTimeout(() => { dragged.current = false }, 80)
          if (rightAction && (info.offset.x > 110 || info.velocity.x > 700)) {
            haptic('success')
            close()
            rightAction.onClick()
          } else if (actions.length && (info.offset.x < -50 || info.velocity.x < -500)) {
            haptic()
            setOpen(true)
            controls.start({ x: -width, transition: { type: 'spring', stiffness: 520, damping: 42 } })
          } else {
            close()
          }
        }}
        onClickCapture={(e) => {
          if (dragged.current) { e.stopPropagation(); e.preventDefault(); return }
          if (open) { e.stopPropagation(); e.preventDefault(); close() }
        }}
        className="relative"
        style={{ background }}
      >
        {children}
      </motion.div>
    </div>
  )
}
