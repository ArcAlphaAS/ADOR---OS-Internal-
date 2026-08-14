import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

function getMessages(hour, isReturning, name) {
  if (hour >= 6 && hour < 13) {
    return {
      greeting: `Buenos días, ${name}.`,
      subtext: 'Hoy es un buen día para construir.',
    }
  }
  if (hour >= 13 && hour < 15 && isReturning) {
    return {
      greeting: `Bienvenido de vuelta, ${name}.`,
      subtext: 'Vamos con fuerza al cierre del día.',
    }
  }
  if (hour >= 13 && hour < 19) {
    return {
      greeting: `Buenas tardes, ${name}.`,
      subtext: 'Último tramo. Que valga.',
    }
  }
  return {
    greeting: `Buenas noches, ${name}.`,
    subtext: 'Cerrando el día con ADOR.',
  }
}

function formatTime(date) {
  return date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export default function WelcomeScreen({ name = 'Ángel', isReturning = false, onDismiss }) {
  const [now, setNow] = useState(() => new Date())
  const [dismissing, setDismissing] = useState(false)
  const finished = useRef(false)

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(interval)
  }, [])

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
    const timer = setTimeout(onDismiss, 300)
    return () => clearTimeout(timer)
  }, [dismissing, onDismiss])

  const { greeting, subtext } = getMessages(now.getHours(), isReturning, name)

  return (
    <motion.div
      className="fixed inset-0 z-40 flex flex-col items-center justify-center overflow-hidden bg-[#0A0A0A]"
      animate={{ opacity: dismissing ? 0 : 1, scale: dismissing ? 0.98 : 1 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at 30% 40%, rgba(30,95,173,0.06), transparent 60%)',
            animation: 'ador-drift 8s ease-in-out infinite',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at 70% 60%, rgba(184,134,11,0.04), transparent 60%)',
            animation: 'ador-drift 8s ease-in-out infinite 4s',
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="font-light tracking-[-0.02em] text-white/15"
        style={{ fontSize: 72 }}
      >
        {formatTime(now)}
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
        className="mt-2 font-semibold tracking-[-0.01em] text-[#F5F5F5]"
        style={{ fontSize: 32 }}
      >
        {greeting}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="mt-3 font-light text-[16px] text-[#888888]"
      >
        {subtext}
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.6 }}
        className="mt-8"
      >
        <div
          className="h-1 w-1 rounded-full bg-[#1E5FAD]"
          style={{ animation: 'ador-pulse 2s ease-in-out infinite' }}
        />
      </motion.div>

      <p className="absolute bottom-12 text-[11px] uppercase tracking-[0.06em] text-[#333333]">
        Toca en cualquier lugar para continuar
      </p>
    </motion.div>
  )
}
