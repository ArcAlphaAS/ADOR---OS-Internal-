import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import useDeferredReveal from '../../hooks/useDeferredReveal'

// Generic floating menu for inline cell editing in Lista's rows. Portaled to
// document.body and positioned from the trigger's measured rect — table rows
// live inside a scrollable, non-shrink-wrapped container so a portal isn't
// strictly required to dodge the width-leak bug (see CLAUDE.md §1), but it's
// still the safest way to guarantee the menu never gets clipped by the
// group's own overflow-x-auto wrapper.
//
// Entrance motion matches every other floating menu in the app (see
// NotificationCenter.jsx), including waiting on `useDeferredReveal` so the
// freshly-mounted blur layer has a couple of frames to composite before
// anything becomes visible. No exit animation on purpose, unlike those —
// this mounts/unmounts many times per session (every inline cell edit), and
// CLAUDE.md §10 already documents a real bug from over-animating this exact
// component (a duplicate-key warning from wrapping it in AnimatePresence for
// no real benefit, since the parent's own conditional render controls
// mount/unmount here, not this component's internal state).
export default function CellPopover({ anchorRect, onClose, children, width = 180 }) {
  const ready = useDeferredReveal()
  if (!anchorRect) return null

  return createPortal(
    <>
      <div className="fixed inset-0 z-[998]" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={ready ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: -8, scale: 0.98 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="fixed z-[999]"
        style={{
          top: anchorRect.bottom + 6,
          left: Math.min(anchorRect.left, window.innerWidth - width - 12),
          width,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ador-glass ador-grain overflow-hidden rounded-xl p-1.5">{children}</div>
      </motion.div>
    </>,
    document.body
  )
}
