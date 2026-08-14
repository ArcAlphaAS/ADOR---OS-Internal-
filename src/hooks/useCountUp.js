import { useEffect, useState } from 'react'

// Animates a number from 0 to `value` on mount/value-change — used for the
// Finanzas hero numbers so they read as "the system just computed this"
// rather than a static label.
export function useCountUp(value, duration = 600) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (typeof value !== 'number' || Number.isNaN(value)) return
    let frame
    const start = performance.now()
    const from = 0
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - (1 - progress) ** 3
      setDisplay(from + (value - from) * eased)
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, duration])

  return display
}
