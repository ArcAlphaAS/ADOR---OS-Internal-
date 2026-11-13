import { useCallback, useEffect, useRef, useState } from 'react'

// Pantalla de reposo, con una razón de ser: reorientarte. Si te alejaste un rato,
// al volver te recibe con lo que importa ahora (tareas, reuniones) antes de seguir.
//
// Reglas (modo "auto", el recomendado):
//  · Celular: sesiones cortas y la app suele quedar en segundo plano → 5 min, con la
//    app visible sin tocar o al volver de segundo plano.
//  · Escritorio: se tolera leer o estar en una reunión → 10 min sin tocar con la
//    ventana visible; 20 min si cambiaste de pestaña/app (revisar el correo no cuenta).
//  · Nunca interrumpe: si hay texto sin enviar en un campo, un video/audio sonando
//    o la ventana está en una llamada reciente, espera y vuelve a intentar.
// Cada persona puede cambiarlo en Configuración (localStorage `ador_idle_lock`).
const EVENTS = ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'wheel', 'scroll']
export const IDLE_KEY = 'ador_idle_lock'
export const IDLE_OPTIONS = [
  { id: 'auto', label: 'Auto' },
  { id: '5', label: '5 min' },
  { id: '10', label: '10 min' },
  { id: '15', label: '15 min' },
  { id: 'off', label: 'Nunca' },
]

// Bloqueo manual: desde el menú del perfil o con ⌘⇧L / Ctrl⇧L.
export const lockNow = () => window.dispatchEvent(new Event('ador:lock'))

export function readIdlePref() {
  try {
    return localStorage.getItem(IDLE_KEY) || 'auto'
  } catch {
    return 'auto'
  }
}

const limits = () => {
  const pref = readIdlePref()
  if (pref === 'off') return null
  const coarse = window.matchMedia?.('(pointer: coarse)').matches
  const min = pref === 'auto' ? (coarse ? 5 : 10) : Number(pref)
  const away = pref === 'auto' ? (coarse ? 5 : 20) : coarse ? min : min * 2
  return { idle: min * 60000, away: away * 60000 }
}

// ¿Interrumpir ahora estorbaría?
function busy() {
  const el = document.activeElement
  if (el && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT' || el.isContentEditable)) {
    const text = el.isContentEditable ? el.textContent : el.value
    if (text && String(text).trim().length > 0 && el.type !== 'password') return true
  }
  return [...document.querySelectorAll('video,audio')].some((m) => !m.paused && !m.ended)
}

export function useIdleLock(enabled) {
  const [lockedAt, setLockedAt] = useState(null) // null = no bloqueado; si no, cuándo te fuiste
  const last = useRef(Date.now())
  const hiddenAt = useRef(null)

  useEffect(() => {
    if (!enabled) return undefined
    last.current = Date.now()
    const touch = () => { last.current = Date.now() }
    const lock = (since) => { if (!busy()) setLockedAt(since ?? last.current) }
    const onVis = () => {
      const lim = limits()
      if (document.visibilityState === 'hidden') {
        hiddenAt.current = Date.now()
        return
      }
      const since = hiddenAt.current
      const away = since ? Date.now() - since : 0
      hiddenAt.current = null
      if (lim && away >= lim.away) lock(since)
      else last.current = Date.now()
    }
    const manual = () => setLockedAt(Date.now())
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault()
        manual()
      }
    }
    window.addEventListener('ador:lock', manual)
    window.addEventListener('keydown', onKey)
    EVENTS.forEach((e) => window.addEventListener(e, touch, { passive: true, capture: true }))
    document.addEventListener('visibilitychange', onVis)
    const id = setInterval(() => {
      const lim = limits()
      if (lim && document.visibilityState === 'visible' && Date.now() - last.current >= lim.idle) lock()
    }, 15000)
    return () => {
      window.removeEventListener('ador:lock', manual)
      window.removeEventListener('keydown', onKey)
      EVENTS.forEach((e) => window.removeEventListener(e, touch, { capture: true }))
      document.removeEventListener('visibilitychange', onVis)
      clearInterval(id)
    }
  }, [enabled])

  const unlock = useCallback(() => {
    last.current = Date.now()
    setLockedAt(null)
  }, [])

  return { locked: enabled && lockedAt !== null, leftAt: lockedAt, unlock }
}
