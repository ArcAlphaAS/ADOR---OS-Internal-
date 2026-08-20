import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import AdorMark from '../AdorMark'
import { HomeIcon, KanbanIcon, TargetIcon, ContactsIcon, WalletIcon, SparkleIcon, ArrowRightIcon, ArrowLeftIcon, CloseIcon } from '../icons'

// Full-screen slide carousel — "Conoce ADOR OS" — shown once on first login
// (gated by users/{uid}.onboardingSeenAt, see lib/firestore.js's
// markOnboardingSeen) and re-openable any time from Configuración. Modeled
// on Apple's own post-setup "Hello" screens rather than spotlight coach
// marks pointing at live UI: one slide per module, icon + short copy, no
// dependency on where any button happens to sit on screen — so it can't
// break if the layout changes later (see CLAUDE.md's portal-positioning
// gotcha for why anchored floating UI is the fragile choice here).
// Screenshots are real captures of the app itself (public/onboarding/*.jpg,
// taken via Playwright against the ?preview=1 mock account — see git history
// for the capture script) — showing its actual empty state on purpose. A new
// founder's first real session looks exactly like this, so the walkthrough
// doubles as "here's where you'll create your first X" rather than a staged
// screenshot that wouldn't match what they see next.
const SLIDES = [
  {
    mark: true,
    title: 'Conoce ADOR OS',
    description: 'El sistema operativo interno de ADOR. Antes de empezar, un vistazo rápido a cada módulo — qué es y para qué sirve.',
  },
  {
    icon: HomeIcon,
    image: '/onboarding/inicio.jpg',
    title: 'Inicio',
    description: 'El primer vistazo del día: ingresos, intervenciones activas, tareas pendientes y el Resumen Semanal — una lectura sintetizada de cómo va la empresa, no solo números sueltos.',
  },
  {
    icon: KanbanIcon,
    image: '/onboarding/workspace.jpg',
    title: 'Workspace',
    description: 'Donde vive el trabajo real: tareas de cada Intervención y Proyecto Interno, en Lista, Kanban o Timeline. Asigna, prioriza y da seguimiento sin salir del módulo.',
  },
  {
    icon: TargetIcon,
    image: '/onboarding/objetivos.jpg',
    title: 'Objetivos',
    description: 'Las metas del trimestre, con una Métrica Norte destacada arriba. Cada objetivo tiene dueño, check-ins semanales y las tareas que realmente lo mueven.',
  },
  {
    icon: ContactsIcon,
    image: '/onboarding/clientes.jpg',
    title: 'Clientes',
    description: 'El pipeline completo, de Strategic Partner Candidate a Strategic Partner activo. Pagos, progreso de intervención y documentos, todo en la ficha de cada uno.',
  },
  {
    icon: WalletIcon,
    image: '/onboarding/finanzas.jpg',
    title: 'Finanzas',
    description: 'Ingresos, gastos, meta trimestral y proyección de caja — leídos directamente de los pagos registrados en Clientes, nunca cifras cargadas a mano por separado.',
  },
  {
    icon: SparkleIcon,
    image: '/onboarding/ador-ia.jpg',
    title: 'ADOR IA',
    description: 'Pregúntale por el estado real de la empresa — ingresos, objetivos, carga del equipo, clientes sin contacto — y te da una lectura priorizada, no solo los números.',
  },
]

export default function OnboardingTour({ onFinish }) {
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const isLast = index === SLIDES.length - 1
  const slide = SLIDES[index]

  const goNext = () => {
    if (isLast) {
      onFinish()
      return
    }
    setDirection(1)
    setIndex((i) => i + 1)
  }

  const goBack = () => {
    if (index === 0) return
    setDirection(-1)
    setIndex((i) => i - 1)
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onFinish()
      else if (e.key === 'ArrowRight' || e.key === 'Enter') goNext()
      else if (e.key === 'ArrowLeft') goBack()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const Icon = slide.icon

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-[#0A0A0A]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
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

      <button
        type="button"
        onClick={onFinish}
        className="absolute right-8 top-8 flex items-center gap-1.5 text-[12px] text-[#666666] transition-colors duration-150 hover:text-[#F5F5F5]"
      >
        Omitir
        <CloseIcon size={13} />
      </button>

      <div
        className={`flex w-full flex-col items-center px-8 text-center transition-[max-width] duration-300 ${slide.image ? 'max-w-[620px]' : 'max-w-[440px]'}`}
      >
        {/* Plain key-remount crossfade, not AnimatePresence — mode="wait"
            here would queue exit/enter transitions and, after a couple of
            rapid slide changes, could leave the old slide's content stuck
            mounted while index/dots/button kept advancing underneath it
            (confirmed while testing: dots and the Comenzar/Siguiente label
            reached the last slide correctly, but the title never moved past
            slide 2). A plain remount always shows the right slide; it just
            loses the exit fade, which nobody will miss at this scale. */}
        <motion.div
          key={index}
          initial={{ opacity: 0, x: direction * 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="flex w-full flex-col items-center"
        >
          {slide.image ? (
            <div
              className="w-full overflow-hidden rounded-2xl border border-white/[0.08]"
              style={{ boxShadow: '0 24px 60px -20px rgba(0,0,0,0.6)' }}
            >
              <div className="flex items-center gap-1.5 bg-white/[0.03] px-3 py-2">
                <span className="h-2 w-2 rounded-full bg-white/[0.12]" />
                <span className="h-2 w-2 rounded-full bg-white/[0.12]" />
                <span className="h-2 w-2 rounded-full bg-white/[0.12]" />
              </div>
              <img src={slide.image} alt={`Vista de ${slide.title}`} className="block w-full" />
            </div>
          ) : (
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(30,95,173,0.12)', border: '1px solid rgba(30,95,173,0.25)' }}
            >
              <AdorMark size={26} />
            </div>
          )}

          <div className="mt-6 flex items-center gap-2">
            {Icon && (
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full text-[#1E5FAD]"
                style={{ backgroundColor: 'rgba(30,95,173,0.12)' }}
              >
                <Icon size={15} />
              </span>
            )}
            <h1 className="text-[22px] font-semibold text-[#F5F5F5]">{slide.title}</h1>
          </div>
          <p className="mt-3 max-w-[440px] text-[14px] font-light leading-relaxed text-[#888888]">{slide.description}</p>
        </motion.div>

        <div className="mt-10 flex items-center gap-2">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === index ? 18 : 6,
                backgroundColor: i === index ? '#1E5FAD' : 'rgba(255,255,255,0.15)',
              }}
            />
          ))}
        </div>

        <div className="mt-10 flex w-full items-center justify-between">
          <button
            type="button"
            onClick={goBack}
            disabled={index === 0}
            className="flex items-center gap-1.5 text-[13px] text-[#888888] transition-colors duration-150 hover:text-[#F5F5F5] disabled:opacity-0"
          >
            <ArrowLeftIcon size={14} />
            Atrás
          </button>
          <button type="button" onClick={goNext} className="ador-btn-primary flex items-center gap-1.5 rounded-full px-5 py-2.5 text-[13px] font-medium">
            {isLast ? 'Comenzar' : 'Siguiente'}
            {!isLast && <ArrowRightIcon size={14} />}
          </button>
        </div>
      </div>
    </motion.div>
  )
}
