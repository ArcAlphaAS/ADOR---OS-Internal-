import { useEffect, useRef } from 'react'
import { animate, useMotionValue, useTransform } from 'framer-motion'
import { haptic } from '../lib/haptics'

// Arrastrar una hoja hacia abajo para cerrarla, como en iOS: se puede empezar desde cualquier
// parte (no solo desde el asa) siempre que el contenido esté arriba del todo, la hoja sigue al
// dedo, el fondo se aclara mientras bajas, y se cierra al pasar cierta distancia o con un
// gesto rápido; si no, vuelve a su sitio con un resorte.
//   const sheet = useSheetDrag(onClose, enabled)
//   <motion.div ref={sheet.sheetRef} style={{ y: sheet.y }}> … <div ref={sheet.scrollRef}> … </div></motion.div>
//   <motion.div style={{ opacity: sheet.backdrop }} />   // capa oscura de fondo
export function useSheetDrag(onClose, enabled = true) {
  const y = useMotionValue(0)
  const backdrop = useTransform(y, [0, 420], [1, 0.2])
  const sheetRef = useRef(null)
  const scrollRef = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const el = sheetRef.current
    if (!enabled || !el) return
    let startX = 0, startY = 0, lastY = 0, lastT = 0, vel = 0, armed = false, dragging = false, armedAt = 0

    const onStart = (e) => {
      const t = e.touches[0]
      startX = t.clientX; startY = lastY = t.clientY; lastT = performance.now(); vel = 0; dragging = false
      // Solo si el contenido está arriba del todo (si no, el gesto es para desplazar la lista).
      armed = !scrollRef.current || scrollRef.current.scrollTop <= 0
      armedAt = 0
    }
    const onMove = (e) => {
      if (!armed) return
      const t = e.touches[0]
      const dy = t.clientY - startY
      const dx = t.clientX - startX
      if (!dragging) {
        // Hace falta una intención clara: movimiento vertical firme hacia abajo, no un roce.
        if (dy > 18 && dy > Math.abs(dx) * 2) dragging = true
        else { if (Math.abs(dx) > 10 || dy < -6) armed = false; return }
      }
      e.preventDefault()
      const now = performance.now()
      // Velocidad suavizada (promedio): un pequeño tirón final no cuenta como gesto rápido.
      vel = vel * 0.8 + ((t.clientY - lastY) / Math.max(1, now - lastT)) * 0.2
      lastY = t.clientY; lastT = now
      // Resistencia: la hoja baja más lento que el dedo al principio, como en iOS.
      y.set(Math.max(0, (dy - 18) * 0.85))
    }
    const onEnd = () => {
      if (!dragging) return
      dragging = false
      const h = el.getBoundingClientRect().height || 600
      // Se cierra si la bajaste más de un tercio de la hoja, o con un gesto rápido y claro (>110 px).
      if (y.get() > h * 0.33 || (vel > 1.1 && y.get() > 110)) { haptic('tap'); closeRef.current?.() }
      else animate(y, 0, { type: 'spring', stiffness: 520, damping: 38 })
    }
    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', onEnd)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }, [enabled, y])

  return { y, backdrop, sheetRef, scrollRef }
}
