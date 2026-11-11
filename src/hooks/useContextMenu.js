import { useCallback, useRef, useState } from 'react'
import { haptic } from '../lib/haptics'

// Estado de un menú de clic derecho + el gesto equivalente en el teléfono
// (mantener presionado ~0,5 s). Uso:
//   const { menu, bind, close } = useContextMenu()
//   <div {...bind(item)}> … </div>   y   {menu && <ContextMenu x={menu.x} y={menu.y} … />}
// `menu.payload` es lo que pasaste a bind().
export function useContextMenu() {
  const [menu, setMenu] = useState(null)
  const timer = useRef(null)
  const openedAt = useRef(0)
  const start = useRef(null)
  const close = useCallback(() => setMenu(null), [])
  const bind = (payload) => ({
    onContextMenu: (e) => {
      if (e.target.closest?.('input,textarea')) return
      e.preventDefault()
      setMenu({ x: e.clientX, y: e.clientY, payload })
    },
    onTouchStart: (e) => {
      const t = e.touches?.[0]
      if (!t) return
      clearTimeout(timer.current)
      start.current = { x: t.clientX, y: t.clientY }
      timer.current = setTimeout(() => {
        haptic('heavy')
        openedAt.current = Date.now()
        setMenu({ x: t.clientX, y: t.clientY, payload })
      }, 520)
    },
    // Al soltar el dedo tras mantener pulsado, el "clic" fantasma no debe abrir la fila.
    onClickCapture: (e) => {
      if (Date.now() - openedAt.current < 700) {
        e.stopPropagation()
        e.preventDefault()
      }
    },
    'data-ctx': '',
    onTouchMove: (e) => {
      const t = e.touches?.[0]
      if (t && start.current && Math.hypot(t.clientX - start.current.x, t.clientY - start.current.y) < 8) return
      clearTimeout(timer.current)
    },
    onTouchEnd: () => clearTimeout(timer.current),
    onTouchCancel: () => clearTimeout(timer.current),
  })
  return { menu, bind, close }
}
