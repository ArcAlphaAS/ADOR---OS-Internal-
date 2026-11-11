import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { useEscape } from '../../hooks/useEscape'
import { useSheetScale } from '../../hooks/useSheetScale'
import { SHEET } from '../../lib/motion'
import { haptic } from '../../lib/haptics'

// Hoja de iOS con dos alturas ("detents"): abre a media pantalla y se arrastra hacia arriba
// hasta casi toda la pantalla; hacia abajo vuelve a la mitad y luego se cierra. Una barrita
// arriba indica que se puede arrastrar. El contenido se desplaza por dentro.
export default function BottomSheet({ title, onClose, children, initial = 'medium' }) {
  useEscape(onClose)
  useSheetScale(true)
  const [detent, setDetent] = useState(initial)
  const height = detent === 'large' ? '92dvh' : '52dvh'
  const settle = (_e, info) => {
    const dy = info.offset.y
    const vy = info.velocity.y
    if (dy < -50 || vy < -500) {
      if (detent !== 'large') haptic()
      setDetent('large')
    } else if (dy > 70 || vy > 600) {
      if (detent === 'large' && dy < 220 && vy < 1100) setDetent('medium')
      else onClose()
    }
  }
  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[997] bg-black/40" onClick={onClose}>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0, height }}
        exit={{ y: '100%' }}
        transition={SHEET}
        onClick={(e) => e.stopPropagation()}
        className="absolute inset-x-0 bottom-0 mx-auto flex max-w-[680px] flex-col rounded-t-[30px] bg-[#1C1C1E]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        role="dialog"
        aria-label={title}
      >
        <motion.div drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={0.25} dragSnapToOrigin onDragEnd={settle} className="flex-shrink-0 touch-none px-5 pb-2 pt-2.5">
          <div className="mx-auto h-[5px] w-10 rounded-full bg-white/25" />
          {title && <p className="mt-3 truncate text-center text-[16px] font-semibold text-[#F5F5F5]">{title}</p>}
        </motion.div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4" data-keep-scroll>{children}</div>
      </motion.div>
    </motion.div>,
    document.body
  )
}
