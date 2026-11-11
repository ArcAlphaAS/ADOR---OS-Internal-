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
      timer.current = setTimeout(() => {
        haptic()
        setMenu({ x: t.clientX, y: t.clientY, payload })
      }, 520)
    },
    onTouchMove: () => clearTimeout(timer.current),
    onTouchEnd: () => clearTimeout(timer.current),
    onTouchCancel: () => clearTimeout(timer.current),
  })
  return { menu, bind, close }
}
