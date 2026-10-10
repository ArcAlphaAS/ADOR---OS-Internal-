import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import ParticleLogo from './ParticleLogo'

// The welcome screen shown to anyone who arrives without a session: the ADOR
// mark made of strokes, "Bienvenido", and one button. Pressing it disperses
// the strokes and hands over to the login form. People who are already signed
// in never see it (App.jsx).
const SLOW = [0.22, 1, 0.36, 1]

export default function SplashScreen({ onFinish }) {
  const [leaving, setLeaving] = useState(false)
  const [compact, setCompact] = useState(() => window.innerWidth < 640)
  const finished = useRef(false)

  useEffect(() => {
    const onResize = () => setCompact(window.innerWidth < 640)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const start = () => setLeaving(true)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Enter') start() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!leaving || finished.current) return undefined
    finished.current = true
    const timer = setTimeout(onFinish, 520)
    return () => clearTimeout(timer)
  }, [leaving, onFinish])

  const size = compact ? 230 : 280

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center bg-[#000000]"
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={{ duration: leaving ? 0.25 : 0, delay: leaving ? 0.3 : 0, ease: 'easeInOut' }}
    >
      <div className="flex w-full flex-1 items-center justify-center pt-[env(safe-area-inset-top)]">
        <div style={{ marginTop: compact ? 40 : 20 }}>
          <ParticleLogo size={size} scatter={leaving} />
        </div>
      </div>

      <div
        className="w-full max-w-[380px] px-6 text-center"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 36px)' }}
      >
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.9, ease: SLOW }}
          className="text-[44px] font-semibold leading-[1.05] tracking-[-0.035em] text-[#F5F5F5]"
        >
          Bienvenido
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.05, ease: SLOW }}
          className="mb-7 mt-2.5 text-[16px] text-[#8A8A8A]"
        >
          Todo ADOR, en un solo lugar.
        </motion.p>
        <motion.button
          type="button"
          onClick={start}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.985 }}
          transition={{ duration: 0.8, delay: 1.2, ease: SLOW }}
          className="flex h-[52px] w-full items-center justify-center rounded-full bg-[#F5F5F5] text-[16px] font-medium text-[#0A0A0A] transition-colors duration-150 hover:bg-white"
        >
          Iniciar sesión
        </motion.button>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.4 }}
          className="mt-4 text-[12.5px] text-[#767676]"
        >
          Acceso por invitación únicamente
        </motion.p>
      </div>
    </motion.div>
  )
}
