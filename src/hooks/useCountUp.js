import { useEffect, useRef, useState } from 'react'

// Animates a number from where it was (0 on mount) to `value` on value-change — used for the
// Finanzas hero numbers so they read as "the system just computed this"
// rather than a static label.
export function useCountUp(value, duration = 600) {
  const [display, setDisplay] = useState(0)
  const shown = useRef(0)

  useEffect(() => {
    if (typeof value !== 'number' || Number.isNaN(value)) return
    let frame
    const start = performance.now()
    const from = shown.current
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - (1 - progress) ** 3
      shown.current = from + (value - from) * eased
      setDisplay(shown.current)
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, duration])

  return display
}
