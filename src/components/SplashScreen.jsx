import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Logo from './Logo'
import AdorMark from './AdorMark'

const LOGO_DURATION = 0.8
const RING_DELAY = 0.5
const HINT_DELAY = 1.4

export default function SplashScreen({ onFinish }) {
  const [dismissing, setDismissing] = useState(false)
  const finished = useRef(false)

  useEffect(() => {
    const dismiss = () => setDismissing(true)
    window.addEventListener('click', dismiss)
    window.addEventListener('keydown', dismiss)
    return () => {
      window.removeEventListener('click', dismiss)
      window.removeEventListener('keydown', dismiss)
    }
  }, [])

  useEffect(() => {
    if (!dismissing || finished.current) return
    finished.current = true
    const timer = setTimeout(onFinish, 300)
    return () => clearTimeout(timer)
  }, [dismissing, onFinish])

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0A0A0A]"
      animate={{ opacity: dismissing ? 0 : 1, scale: dismissing ? 0.98 : 1 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: LOGO_DURATION, ease: 'easeOut' }}
        className="flex items-baseline gap-[9px]"
      >
        <Logo size={28} />
        <span
          className="font-semibold text-[#F5F5F5]"
          style={{ fontSize: 28, letterSpacing: '0.2em' }}
        >
          OS
        </span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: RING_DELAY, ease: 'easeOut' }}
        className="mt-8"
      >
        <AdorMark size={26} />
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: HINT_DELAY }}
        className="absolute bottom-16 text-[11px] uppercase tracking-[0.06em] text-[#333333]"
      >
        Toca para continuar
      </motion.p>
    </motion.div>
  )
}
