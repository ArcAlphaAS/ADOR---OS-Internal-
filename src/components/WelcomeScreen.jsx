import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion'
import usePhone from '../hooks/usePhone'
import { useWelcomeBrief } from '../hooks/useWelcomeBrief'
import { haptic } from '../lib/haptics'

// La luz del día entra desde el borde inferior, como un horizonte: dorada al amanecer,
// azul abierta de tarde, índigo profundo de noche. [rgb, alpha] del resplandor principal,
// del filo cálido y de la luz de fondo.
const SKY = {
  dawn: { glow: ['232,150,60', 0.62], rim: ['255,214,150', 0.26], far: ['30,60,120', 0.18] },
  day: { glow: ['70,140,235', 0.55], rim: ['190,220,255', 0.22], far: ['184,134,11', 0.1] },
  dusk: { glow: ['150,90,190', 0.58], rim: ['255,170,120', 0.26], far: ['40,60,150', 0.2] },
  night: { glow: ['64,76,200', 0.62], rim: ['184,134,11', 0.26], far: ['100,70,170', 0.14] },
}

function skyBucket(hour) {
  if (hour >= 6 && hour < 12) return 'dawn'
  if (hour >= 12 && hour < 18) return 'day'
  if (hour >= 18 && hour < 21) return 'dusk'
  return 'night'
}

function getMessages(hour, isReturning, name) {
  if (hour >= 6 && hour < 12) return { greeting: 'Buenos días', subtext: 'Hoy es un buen día para construir.' }
  if (hour >= 12 && hour < 15 && isReturning) return { greeting: 'Bienvenido de vuelta', subtext: 'Vamos con fuerza al cierre del día.' }
  if (hour >= 12 && hour < 19) return { greeting: 'Buenas tardes', subtext: 'Último tramo. Que valga.' }
  return { greeting: 'Buenas noches', subtext: 'Cerrando el día con ADOR.' }
}

const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")"

const DIGIT_STYLE = {
  backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.55) 100%)',
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  color: 'transparent',
}

// Un dígito que rueda hacia arriba cuando cambia (como un odómetro).
function RollDigit({ d, still }) {
  return (
    <span className="relative inline-block" style={{ fontVariantNumeric: 'tabular-nums' }}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={d}
          className="inline-block"
          style={DIGIT_STYLE}
          initial={still ? false : { y: '55%', opacity: 0, filter: 'blur(8px)' }}
          animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
          exit={still ? { opacity: 0 } : { y: '-55%', opacity: 0, filter: 'blur(8px)' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          {d}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

function Clock({ now, phone, still }) {
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const size = phone ? 'min(46vw, 240px)' : 'clamp(100px, 15vw, 196px)'
  const common = {
    fontSize: size,
    letterSpacing: '-0.035em',
    lineHeight: phone ? 0.84 : 1,
    fontFamily: "ui-rounded, 'SF Pro Rounded', -apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
    fontOpticalSizing: 'auto',
    textRendering: 'geometricPrecision',
    WebkitFontSmoothing: 'antialiased',
  }
  // Un "1" es estrecho y deja el peso visual a la derecha: se compensa para que quede centrado.
  const optical = hh[0] === '1' ? '-0.035em' : '0em'
  // Entra desde un peso muy fino y se asienta, enfocándose.
  const entry = {
    initial: still ? false : { opacity: 0, y: 14, filter: 'blur(14px)', fontWeight: 300 },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)', fontWeight: 600 },
    transition: { duration: 1.3, ease: [0.22, 1, 0.36, 1] },
  }
  if (phone) {
    return (
      <motion.div {...entry} className="flex select-none flex-col items-center" style={common} aria-label={`${hh}:${mm}`}>
        <div><RollDigit d={hh[0]} still={still} /><RollDigit d={hh[1]} still={still} /></div>
        <div><RollDigit d={mm[0]} still={still} /><RollDigit d={mm[1]} still={still} /></div>
      </motion.div>
    )
  }
  return (
    <motion.div {...entry} className="flex select-none items-center" style={common} aria-label={`${hh}:${mm}`}>
      <motion.span className="flex items-center" animate={{ x: optical }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
      <RollDigit d={hh[0]} still={still} />
      <RollDigit d={hh[1]} still={still} />
      <span className="mx-[0.015em] inline-block pb-[0.09em]" style={{ ...DIGIT_STYLE, fontWeight: 600, fontSize: '0.8em', opacity: 0.55, animation: still ? undefined : 'ador-pulse 2.4s ease-in-out infinite' }}>:</span>
      <RollDigit d={mm[0]} still={still} />
      <RollDigit d={mm[1]} still={still} />
      </motion.span>
    </motion.div>
  )
}

export default function WelcomeScreen({ uid, name = 'Ángel', isReturning = false, onDismiss }) {
  const phone = usePhone()
  const reduce = useReducedMotion()
  const [now, setNow] = useState(() => new Date())
  const [dismissing, setDismissing] = useState(false)
  const finished = useRef(false)
  const brief = useWelcomeBrief(uid, now.getHours())

  // Reloj alineado al cambio de minuto (el odómetro gira justo cuando toca).
  useEffect(() => {
    let t
    const tick = () => {
      setNow(new Date())
      t = setTimeout(tick, 60000 - (Date.now() % 60000) + 40)
    }
    t = setTimeout(tick, 60000 - (Date.now() % 60000) + 40)
    return () => clearTimeout(t)
  }, [])

  const dismiss = () => {
    if (finished.current) return
    haptic('success')
    setDismissing(true)
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.key === 'Shift' || e.key === 'Meta' || e.key === 'Control' || e.key === 'Alt') return
      dismiss()
    }
    window.addEventListener('click', dismiss)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('click', dismiss)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  useEffect(() => {
    if (!dismissing || finished.current) return
    finished.current = true
    const timer = setTimeout(onDismiss, reduce ? 150 : 620)
    return () => clearTimeout(timer)
  }, [dismissing, onDismiss, reduce])

  // Escritorio: la luz y el reloj siguen al cursor con un parallax muy leve.
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 50, damping: 18 })
  const sy = useSpring(my, { stiffness: 50, damping: 18 })
  const glowX = useTransform(sx, (v) => v * -34)
  const glowY = useTransform(sy, (v) => v * -14)
    const clockY = useTransform(sy, (v) => v * 5)
  const spotX = useSpring(useMotionValue(-600), { stiffness: 90, damping: 22 })
  const spotY = useSpring(useMotionValue(-600), { stiffness: 90, damping: 22 })
  useEffect(() => {
    if (phone || reduce || window.matchMedia('(pointer: coarse)').matches) return
    const move = (e) => {
      mx.set((e.clientX / window.innerWidth - 0.5) * 2)
      my.set((e.clientY / window.innerHeight - 0.5) * 2)
      spotX.set(e.clientX - 260)
      spotY.set(e.clientY - 260)
    }
    window.addEventListener('pointermove', move)
    return () => window.removeEventListener('pointermove', move)
  }, [phone, reduce, mx, my, spotX, spotY])

  // Celular: la pantalla sube con el dedo, como la de bloqueo de iOS.
  const dragY = useMotionValue(0)
  const dragOpacity = useTransform(dragY, [-320, 0], [0.15, 1])
  const dragScale = useTransform(dragY, [-320, 0], [0.92, 1])

  const { greeting, subtext } = getMessages(now.getHours(), isReturning, name)
  const line = brief.ready && brief.text ? brief.text : subtext
  const sky = SKY[skyBucket(now.getHours())]
  const date = now.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <motion.div
      className="fixed inset-0 z-40 overflow-hidden bg-[#000000]"
      animate={{ opacity: dismissing ? 0 : 1 }}
      transition={{ duration: reduce ? 0.15 : 0.6, delay: dismissing && !reduce ? 0.1 : 0, ease: 'easeInOut' }}
    >
      {/* Horizonte: luz que sube desde abajo, con un filo cálido y una luz lejana */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 70% 50% at 18% 20%, rgba(${sky.far[0]},${sky.far[1]}), transparent 70%)`, animation: reduce ? undefined : 'ador-drift 16s ease-in-out infinite' }} />
        <motion.div className="absolute inset-0" style={{ x: glowX, y: glowY }}>
          <div
            className="absolute -inset-x-[10%] bottom-0 h-[88%]"
            style={{
              background: `radial-gradient(ellipse 90% 70% at 50% 115%, rgba(${sky.glow[0]},${sky.glow[1]}) 0%, rgba(${sky.glow[0]},${sky.glow[1] * 0.35}) 45%, transparent 75%)`,
              animation: reduce ? undefined : 'ador-drift 11s ease-in-out infinite',
            }}
          />
          <div
            className="absolute -inset-x-[10%] bottom-0 h-[34%]"
            style={{
              background: `radial-gradient(ellipse 60% 70% at 50% 130%, rgba(${sky.rim[0]},${sky.rim[1]}) 0%, transparent 70%)`,
              animation: reduce ? undefined : 'ador-drift 8s ease-in-out infinite 2s',
            }}
          />
        </motion.div>
        {!phone && !reduce && (
          <motion.div
            className="absolute left-0 top-0 h-[520px] w-[520px] rounded-full"
            style={{ x: spotX, y: spotY, background: 'radial-gradient(circle, rgba(255,255,255,0.055), transparent 65%)' }}
          />
        )}
        <div className="absolute inset-0 opacity-[0.07] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />
      </div>

      <motion.div
        className="absolute inset-0"
        style={phone ? { y: dragY, opacity: dragOpacity, scale: dragScale } : undefined}
        drag={phone ? 'y' : false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.6, bottom: 0 }}
        onDragEnd={(_, info) => {
          if (info.offset.y < -90 || info.velocity.y < -500) dismiss()
        }}
      >
        <motion.div
          className="flex h-full flex-col items-center justify-center px-6"
          animate={dismissing && !reduce ? { y: -70, scale: 0.93, opacity: 0, filter: 'blur(14px)' } : { y: 0, scale: 1, opacity: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        >
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: 'easeOut' }}
            className="mb-4 select-none text-[12px] font-medium uppercase tracking-[0.2em] text-white/55 md:mb-5 md:text-[13px]"
          >
            {date}
          </motion.p>

          <motion.div style={phone ? undefined : { y: clockY }}>
            <Clock now={now} phone={phone} still={reduce} />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 text-center tracking-[-0.025em] text-white/60 md:mt-10"
            style={{ fontSize: phone ? 25 : 32, fontWeight: 500, fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Inter', sans-serif" }}
          >
            {greeting}, <span className="font-semibold text-[#F5F5F5]">{name}</span>
          </motion.h1>

          <div className="mt-3 min-h-[44px] max-w-[min(88vw,560px)] text-center">
            <AnimatePresence mode="wait" initial>
              <motion.p
                key={line}
                initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -6, filter: 'blur(4px)' }}
                transition={{ duration: 0.55, delay: 0.95, ease: 'easeOut' }}
                className="text-[15px] font-normal leading-snug tracking-[-0.005em] text-white/50 md:text-[17px]"
              >
                {line}
              </motion.p>
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>

      {/* Cómo seguir: una barra para deslizar en celular, una pista discreta en escritorio */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: dismissing ? 0 : 1 }}
        transition={{ duration: 0.6, delay: dismissing ? 0 : 1.4 }}
        className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 28px)' }}
      >
        {phone ? (
          <>
            <motion.div
              animate={reduce ? undefined : { y: [0, -7, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              className="h-[5px] w-[132px] rounded-full bg-white/40"
            />
            <p className="text-[12px] text-white/50">Desliza hacia arriba para entrar</p>
          </>
        ) : (
          <p className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[12px] text-white/50">
            Toca en cualquier lugar o presiona
            <kbd className="rounded-md border border-white/15 px-1.5 py-px text-[11px] text-white/70">Enter</kbd>
          </p>
        )}
      </motion.div>
    </motion.div>
  )
}
