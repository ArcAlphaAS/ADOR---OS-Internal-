import { useLayoutEffect, useRef } from 'react'

// Hace que un elemento "crezca" desde un rectángulo de origen (la tarjeta o miniatura que
// tocaste) hasta su lugar, como las transiciones de Fotos o de la App Store. Se anima con la
// API del navegador sobre el propio elemento (no toca los estilos de React). Sin origen, o con
// "reducir movimiento", no hace nada. Uso: const ref = useGrowFrom(rect); <div ref={ref}>…
export function useGrowFrom(originRect) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !originRect || typeof window === 'undefined') return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const r = el.getBoundingClientRect()
    if (!r.width || !r.height) return
    const dx = originRect.left - r.left
    const dy = originRect.top - r.top
    const sx = Math.max(0.15, originRect.width / r.width)
    const sy = Math.max(0.05, Math.min(1, originRect.height / r.height))
    el.style.transformOrigin = '0 0'
    el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, opacity: 0 },
        { opacity: 1, offset: 0.3 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: 460, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
    )
  }, [originRect])
  return ref
}
