import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

// Light of the day: warm at dawn, open blue in the afternoon, deep indigo at
// night. Each entry is [color rgb, x%, y%, alpha, drift seconds].
const SKY = {
  morning: [
    ['184,134,11', 22, 30, 0.2, 11],
    ['232,193,90', 78, 18, 0.1, 14],
    ['30,95,173', 70, 78, 0.13, 12],
  ],
  afternoon: [
    ['30,95,173', 28, 34, 0.22, 11],
    ['111,163,224', 76, 24, 0.1, 14],
    ['184,134,11', 68, 80, 0.1, 12],
  ],
  evening: [
    ['52,60,150', 26, 36, 0.26, 11],
    ['100,70,170', 76, 26, 0.13, 14],
    ['30,95,173', 66, 82, 0.12, 12],
  ],
}

function skyBucket(hour) {
  if (hour >= 6 && hour < 13) return 'morning'
  if (hour >= 13 && hour < 19) return 'afternoon'
  return 'evening'
}

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
  const sky = SKY[skyBucket(now.getHours())]

  return (
    <motion.div
      className="fixed inset-0 z-40 flex flex-col items-center justify-center overflow-hidden bg-[#000000]"
      animate={{ opacity: dismissing ? 0 : 1, scale: dismissing ? 0.98 : 1 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      <div className="pointer-events-none absolute inset-0">
        {sky.map(([rgb, x, y, alpha, secs], i) => (
          <div
            key={i}
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse 55% 50% at ${x}% ${y}%, rgba(${rgb},${alpha}), transparent 70%)`,
              animation: `ador-drift ${secs}s ease-in-out infinite ${i * 3}s`,
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
        className="select-none font-extralight leading-none tabular-nums"
        style={{
          fontSize: 'clamp(96px, 17vw, 210px)',
          letterSpacing: '-0.045em',
          backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.5) 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          color: 'transparent',
        }}
      >
        {formatTime(now)}
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5, ease: 'easeOut' }}
        className="mt-6 font-semibold tracking-[-0.01em] text-[#F5F5F5]"
        style={{ fontSize: 26 }}
      >
        {greeting}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.75 }}
        className="mt-2.5 font-light text-[15px] text-[#888888]"
      >
        {subtext}
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.95 }}
        className="mt-8"
      >
        <div
          className="h-1 w-1 rounded-full bg-[#F4EEE2]"
          style={{ animation: 'ador-pulse 2s ease-in-out infinite' }}
        />
      </motion.div>

      <p className="absolute bottom-12 text-[11px] uppercase tracking-[0.06em] text-[#333333]">
        Toca en cualquier lugar para continuar
      </p>
    </motion.div>
  )
}
