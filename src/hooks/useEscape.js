import { useEffect } from 'react'

// Esc cierra el modal o panel que está al frente. Un solo patrón para todos,
// en vez de que cada uno decida si lo soporta.
export function useEscape(onClose) {
  useEffect(() => {
    if (!onClose) return
    const onKey = (e) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      // Si estás escribiendo, el primer Esc solo sale del campo (como en el panel de tareas).
      const el = document.activeElement
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && !el.dataset.escClose) {
        el.blur()
        return
      }
      onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
}
