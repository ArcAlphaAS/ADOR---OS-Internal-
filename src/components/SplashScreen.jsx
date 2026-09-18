import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

const LOGO_DURATION = 1.2
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
      {/* Real logo, not the old "ADOR" text + "OS" placeholder. The glow is
          just the image's own drop-shadow filter — since drop-shadow renders
          based on the source's alpha, animating this element's opacity from
          0→1 makes the glow visibly "breathe in" together with the logo
          fading in, with no separate glow animation needed. Bumped brighter
          per direct request ("que tenga un glow blanco, bien") — three
          layered shadows now instead of two, the innermost noticeably
          brighter so the glow actually reads at a glance, not just on close
          inspection. The small secondary mark that used to sit below it was
          removed the same request — one focal mark, not two. */}
      <motion.img
        src="/logo.svg"
        alt="ADOR"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: LOGO_DURATION, ease: 'easeOut' }}
        style={{
          height: 80,
          filter:
            'drop-shadow(0 0 14px rgba(255,255,255,0.35)) drop-shadow(0 0 36px rgba(255,255,255,0.18)) drop-shadow(0 0 80px rgba(255,255,255,0.08))',
        }}
      />

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
