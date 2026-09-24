// Apple-style motion, shared by every modal, panel and sheet. iOS doesn't
// animate with fixed durations — it uses springs: fast off the mark, then
// settling gently. Two feels:
//   SPRING — centered modals and popups (a small, crisp pop)
//   SHEET  — things that slide in: bottom sheets and side panels (a bit
//            heavier, like a UIKit sheet)
export const SPRING = { type: 'spring', stiffness: 460, damping: 34, mass: 0.9 }
export const SHEET = { type: 'spring', stiffness: 380, damping: 40, mass: 1 }

// Phones and tablets (touch, below the desktop layout). Swipe-to-close
// gestures only switch on here, so a mouse drag on desktop never moves a
// panel by accident.
export const isTouchLayout = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches && window.matchMedia('(max-width: 1023px)').matches

// Shared "drag it away to close" props for a sheet (axis 'y', downwards) or
// a side panel (axis 'x', to the right). Closes past a distance or on a
// quick flick; otherwise springs back.
export function swipeToClose(axis, onClose) {
  if (!isTouchLayout()) return {}
  return {
    drag: axis,
    dragConstraints: axis === 'y' ? { top: 0, bottom: 0 } : { left: 0, right: 0 },
    dragElastic: axis === 'y' ? { top: 0, bottom: 0.9 } : { left: 0, right: 0.9 },
    dragSnapToOrigin: true,
    onDragEnd: (_e, info) => {
      const d = info.offset[axis]
      const v = info.velocity[axis]
      if (d > 110 || v > 600) onClose()
    },
  }
}
