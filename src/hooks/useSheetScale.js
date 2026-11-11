import { useEffect } from 'react'

// Cuando sube una hoja desde abajo (Más, menú de acciones), la pantalla de atrás se aleja
// un poco y se oscurece, como en iOS. Cuenta cuántas hojas hay abiertas para no quitar el
// efecto si se abre otra encima. Solo teléfono y tablet vertical (CSS: html.sheet-open).
let open = 0
export function useSheetScale(active = true) {
  useEffect(() => {
    if (!active) return undefined
    open += 1
    document.documentElement.classList.add('sheet-open')
    return () => {
      open = Math.max(0, open - 1)
      if (open === 0) document.documentElement.classList.remove('sheet-open')
    }
  }, [active])
}
