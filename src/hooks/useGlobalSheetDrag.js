import { useEffect } from 'react'
import { haptic } from '../lib/haptics'

// Un solo gesto para todas las ventanas del celular: cualquier modal que en teléfono se ve como hoja
// inferior (`.ador-modal-surface`) se cierra arrastrándola hacia abajo, sin tocar cada modal.
// Reglas (las mismas que useSheetDrag, para que todo se sienta igual):
//  - solo empieza si el contenido está arriba del todo (si no, el gesto desplaza la lista),
//  - hace falta una intención clara: >18 px casi en vertical,
//  - la hoja sigue al dedo con un poco de resistencia y el fondo se aclara,
//  - se cierra pasando 1/3 de su alto, o con un gesto rápido de >110 px; si no, vuelve con un resorte.
// Se cierra "tocando" el fondo (el mismo camino que ya usa cada modal para cerrarse). Las hojas que ya
// traen su propio gesto (`data-sheet-managed`) se saltan.
const scrollableAncestor = (el, stop) => {
  for (let n = el; n && n !== stop; n = n.parentElement) {
    const oy = getComputedStyle(n).overflowY
    if ((oy === 'auto' || oy === 'scroll') && n.scrollHeight > n.clientHeight + 1) return n
  }
  return stop
}

export function useGlobalSheetDrag(enabled) {
  useEffect(() => {
    if (!enabled) return
    let surface = null, overlay = null, scroller = null
    let startX = 0, startY = 0, lastY = 0, lastT = 0, vel = 0, armed = false, dragging = false, dy = 0

    const reset = () => {
      if (!surface) return
      const s = surface, o = overlay
      s.style.transition = 'transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1)'
      s.style.transform = ''
      if (o) { o.style.transition = 'opacity 260ms ease'; o.style.opacity = '' }
      setTimeout(() => { s.style.transition = ''; if (o) o.style.transition = '' }, 300)
    }

    const onStart = (e) => {
      armed = false; dragging = false
      const t = e.target
      if (!(t instanceof Element)) return
      const surf = t.closest('.ador-modal-surface')
      if (!surf || surf.closest('[data-sheet-managed]') || t.closest('[data-no-sheet-drag], input[type="range"]')) return
      const ov = surf.closest('.fixed')
      if (!ov) return
      surface = surf; overlay = ov
      scroller = scrollableAncestor(t, surf)
      armed = scroller.scrollTop <= 0 && surf.scrollTop <= 0
      const p = e.touches[0]
      startX = p.clientX; startY = lastY = p.clientY; lastT = performance.now(); vel = 0; dy = 0
    }
    const onMove = (e) => {
      if (!armed || !surface) return
      const p = e.touches[0]
      const ddy = p.clientY - startY
      const ddx = p.clientX - startX
      if (!dragging) {
        if (ddy > 18 && ddy > Math.abs(ddx) * 2) dragging = true
        else { if (Math.abs(ddx) > 10 || ddy < -6) armed = false; return }
      }
      e.preventDefault()
      const now = performance.now()
      vel = vel * 0.8 + ((p.clientY - lastY) / Math.max(1, now - lastT)) * 0.2
      lastY = p.clientY; lastT = now
      dy = Math.max(0, (ddy - 18) * 0.85)
      surface.style.transition = 'none'
      surface.style.transform = `translateY(${dy}px)`
      if (overlay) { overlay.style.transition = 'none'; overlay.style.opacity = String(Math.max(0.25, 1 - dy / 520)) }
    }
    const onEnd = () => {
      if (!dragging || !surface) { armed = false; return }
      dragging = false
      const h = surface.getBoundingClientRect().height || 600
      const s = surface, o = overlay
      if (dy > h * 0.33 || (vel > 1.1 && dy > 110)) {
        haptic('tap')
        o?.click() // el mismo camino que "tocar fuera": cada modal ya sabe cerrarse así
        // Si el modal no se cierra con eso (no se puede descartar), vuelve a su sitio.
        setTimeout(() => { if (document.contains(s)) reset() }, 450)
      } else {
        reset()
      }
      armed = false
    }

    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onEnd)
    document.addEventListener('touchcancel', onEnd)
    return () => {
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
      document.removeEventListener('touchcancel', onEnd)
    }
  }, [enabled])
}
