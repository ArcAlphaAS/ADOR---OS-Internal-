import { useCountUp } from '../../hooks/useCountUp'

// A number that counts up to its value when it first shows and glides to the
// new value when it changes. Falls back to the plain value for non-numbers
// or when the system asks for reduced motion.
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export default function AnimatedNumber({ value, format = (n) => Math.round(n).toLocaleString('es'), duration = 700 }) {
  const animated = useCountUp(typeof value === 'number' ? value : 0, duration)
  if (typeof value !== 'number' || reduced()) return typeof value === 'number' ? format(value) : value ?? null
  return format(animated)
}
