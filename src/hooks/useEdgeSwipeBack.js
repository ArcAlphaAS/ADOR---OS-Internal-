import { useEffect } from 'react'

// El gesto de volver de iOS: empezar a deslizar desde el borde izquierdo de la pantalla hacia
// la derecha. Solo teléfono/tablet táctil y mientras `enabled`. `onBack` se llama una vez.
export function useEdgeSwipeBack(onBack, enabled = true) {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !window.matchMedia?.('(pointer: coarse)').matches) return undefined
    let start = null
    const down = (e) => {
      const t = e.touches?.[0]
      start = t && t.clientX < 26 ? { x: t.clientX, y: t.clientY } : null
    }
    const move = (e) => {
      if (!start) return
      const t = e.touches?.[0]
      if (!t) return
      if (Math.abs(t.clientY - start.y) > 60) { start = null; return }
      if (t.clientX - start.x > 72) {
        start = null
        navigator.vibrate?.(8)
        onBack()
      }
    }
    const end = () => { start = null }
    window.addEventListener('touchstart', down, { passive: true })
    window.addEventListener('touchmove', move, { passive: true })
    window.addEventListener('touchend', end, { passive: true })
    return () => {
      window.removeEventListener('touchstart', down)
      window.removeEventListener('touchmove', move)
      window.removeEventListener('touchend', end)
    }
  }, [onBack, enabled])
}
