import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MOMENT_EVENT } from '../../lib/celebrate'
import { SPRING } from '../../lib/motion'

// The little celebration for a real win (a payment in, a new SP, a goal
// reached, a cleared day). One at a time, ~5s, gold — restrained on purpose.
// The surface is the opaque modal one (it floats over busy content), split
// from the motion wrapper per the transform+blur rule (CLAUDE.md §11).
const GOLD = '#E8C15A'
const SHOW_MS = 5200
const BURST = Array.from({ length: 12 }, (_, i) => {
  const angle = (i / 12) * Math.PI * 2
  return { x: Math.cos(angle) * 30, y: Math.sin(angle) * 30, size: i % 2 ? 3 : 2 }
})

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function CheckRing() {
  return (
    <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center">
      {!reduced() &&
        BURST.map((b, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{ width: b.size, height: b.size, background: GOLD }}
            initial={{ x: 0, y: 0, opacity: 0.9, scale: 1 }}
            animate={{ x: b.x, y: b.y, opacity: 0, scale: 0.3 }}
            transition={{ duration: 0.9, delay: 0.2, ease: 'easeOut' }}
          />
        ))}
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <motion.circle cx="20" cy="20" r="16" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.55, ease: 'easeOut' }} />
        <motion.path d="M13 20.5l5 5 9-10.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, delay: 0.3, ease: 'easeOut' }} />
      </svg>
    </div>
  )
}

export default function AchievementMoment() {
  const [queue, setQueue] = useState([])
  const idRef = useRef(0)

  useEffect(() => {
    const onMoment = (event) => {
      const { title, subtitle } = event.detail || {}
      if (!title) return
      idRef.current += 1
      setQueue((q) => [...q, { id: idRef.current, title, subtitle }])
    }
    window.addEventListener(MOMENT_EVENT, onMoment)
    return () => window.removeEventListener(MOMENT_EVENT, onMoment)
  }, [])

  const current = queue[0]
  const dismiss = useCallback(() => setQueue((q) => q.slice(1)), [])

  useEffect(() => {
    if (!current) return undefined
    const timer = setTimeout(dismiss, SHOW_MS)
    return () => clearTimeout(timer)
  }, [current?.id, dismiss])

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[70] flex justify-center px-4"
      style={{ top: 'calc(env(safe-area-inset-top, 0px) + 72px)' }}
    >
      <AnimatePresence mode="wait">
        {current && (
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={SPRING}
            className="pointer-events-auto"
          >
            <button
              type="button"
              onClick={dismiss}
              className="ador-modal-surface flex max-w-[min(420px,calc(100vw-32px))] items-center gap-3.5 rounded-2xl py-3 pl-3.5 pr-6 text-left"
              style={{ boxShadow: `0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px ${GOLD}33` }}
            >
              <CheckRing />
              <span className="min-w-0">
                <span className="block text-[13.5px] font-semibold text-[#F5F5F5]">{current.title}</span>
                {current.subtitle && <span className="mt-0.5 block truncate text-[12.5px] text-[#9A9A9A]">{current.subtitle}</span>}
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
