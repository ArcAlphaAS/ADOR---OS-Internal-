import { useCallback, useEffect, useRef, useState } from 'react'

// Pantalla de reposo: si nadie toca la plataforma durante `minutes`, vuelve la
// pantalla de bienvenida (como el bloqueo de un iPhone). En celular también cuenta
// el tiempo con la app en segundo plano: al volver tras `minutes`, aparece.
// Se activa solo con actividad real (puntero, teclado, toque, rueda), nunca por timers.
const EVENTS = ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'wheel', 'scroll']

export function useIdleLock(enabled, minutes = 10) {
  const [locked, setLocked] = useState(false)
  const last = useRef(Date.now())
  const limit = minutes * 60 * 1000

  useEffect(() => {
    if (!enabled) return undefined
    last.current = Date.now()
    const touch = () => { last.current = Date.now() }
    const check = () => {
      if (Date.now() - last.current >= limit) setLocked(true)
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') check()
    }
    EVENTS.forEach((e) => window.addEventListener(e, touch, { passive: true, capture: true }))
    document.addEventListener('visibilitychange', onVisible)
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') check()
    }, 15000)
    return () => {
      EVENTS.forEach((e) => window.removeEventListener(e, touch, { capture: true }))
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(id)
    }
  }, [enabled, limit])

  const unlock = useCallback(() => {
    last.current = Date.now()
    setLocked(false)
  }, [])

  return { locked: enabled && locked, unlock }
}
