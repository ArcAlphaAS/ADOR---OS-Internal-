import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'

// Generic floating menu for inline cell editing in Lista's rows. Portaled to
// document.body and positioned from the trigger's measured rect — table rows
// live inside a scrollable, non-shrink-wrapped container so a portal isn't
// strictly required to dodge the width-leak bug (see CLAUDE.md §1), but it's
// still the safest way to guarantee the menu never gets clipped by the
// group's own overflow-x-auto wrapper.
export default function CellPopover({ anchorRect, onClose, children, width = 180 }) {
  if (!anchorRect) return null

  return createPortal(
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.12 }}
        className="ador-glass ador-grain fixed z-50 overflow-hidden rounded-xl p-1.5"
        style={{
          top: anchorRect.bottom + 6,
          left: Math.min(anchorRect.left, window.innerWidth - width - 12),
          width,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </>,
    document.body
  )
}
