import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useLiveStatus } from '../../lib/liveStatus'
import { useAppUpdate } from '../../hooks/useAppUpdate'
import { SPRING } from '../../lib/motion'
import { applyUpdate } from '../../lib/appUpdate'

// La "isla" de la esquina: una píldora negra pequeña que solo existe mientras
// pasa algo y cambia de forma según qué. Sustituye a los avisos sueltos de
// "sin conexión" y "nueva versión", y suma "guardando" y "ADOR IA pensando".
// Prioridad: sin conexión > nueva versión > pensando > guardando > guardado.
function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine !== false)
  const [back, setBack] = useState(false)
  useEffect(() => {
    let t
    const off = () => { clearTimeout(t); setBack(false); setOnline(false) }
    const on = () => { setOnline(true); setBack(true); t = setTimeout(() => setBack(false), 2200) }
    window.addEventListener('offline', off)
    window.addEventListener('online', on)
    return () => { clearTimeout(t); window.removeEventListener('offline', off); window.removeEventListener('online', on) }
  }, [])
  return { online, back }
}

const Dots6 = () => (
  <span className="relative block h-[18px] w-[18px]">
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <span
        key={i}
        className="absolute left-1/2 top-1/2 h-[4px] w-[4px] rounded-full bg-white"
        style={{
          margin: '-2px 0 0 -2px',
          transform: `rotate(${i * 60}deg) translateY(-7px)`,
        }}
      >
        <span className="block h-full w-full rounded-full bg-white" style={{ animation: `ador-orbit 1.2s ease-in-out ${i * 0.2}s infinite` }} />
      </span>
    ))}
  </span>
)

const Dots3 = () => (
  <span className="flex h-[16px] items-center gap-[4px]">
    {[0, 1, 2].map((i) => (
      <span key={i} className="h-[8px] w-[7px] rounded-full bg-white" style={{ animation: `ador-morph 0.9s ease-in-out ${i * 0.15}s infinite` }} />
    ))}
  </span>
)

const Check = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
)

export default function LiveIsland() {
  const live = useLiveStatus()
  const update = useAppUpdate()
  const { online, back } = useOnline()

  let mode = null
  if (!online) mode = 'offline'
  else if (update) mode = 'update'
  else if (live.thinking && typeof document !== 'undefined' && !document.documentElement.classList.contains('ador-chat-open')) mode = 'thinking'
  else if (live.saving) mode = 'saving'
  else if (back) mode = 'back'
  else if (live.saved) mode = 'saved'

  const content = {
    offline: { icon: <span className="h-2 w-2 rounded-full bg-[#8E8E93]" />, text: 'Sin conexión', title: 'Lo que envíes saldrá al volver la señal' },
    update: { icon: <span className="h-2 w-2 rounded-full bg-[#4CAF50]" />, text: 'Nueva versión · Actualizar', light: true, title: 'Hay una nueva versión de ADOR OS', action: () => applyUpdate() },
    thinking: { icon: <Dots3 />, text: null, title: 'ADOR IA está pensando' },
    saving: { icon: <Dots6 />, text: null, title: 'Guardando…' },
    back: { icon: <span className="h-2 w-2 rounded-full bg-[#4CAF50]" />, text: 'Conectado', title: 'Enviando lo pendiente' },
    saved: { icon: <Check />, text: null, title: 'Guardado' },
  }[mode]

  return (
    <div className={`pointer-events-none fixed z-[80] top-[calc(env(safe-area-inset-top)+12px)] lg:top-[22px] ${mode === 'update' ? 'inset-x-0 flex justify-center lg:inset-x-auto lg:right-[156px]' : 'right-4 lg:right-[156px]'}`}>
      <AnimatePresence mode="popLayout">
        {mode && (
          <motion.div
            key="island"
            layout
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={SPRING}
            style={{ transformOrigin: 'top right' }}
          >
            <button
              type="button"
              title={content.title}
              onClick={content.action}
              disabled={!content.action}
              className={`pointer-events-auto flex h-[34px] min-w-[52px] items-center justify-center gap-2 rounded-full px-4 text-[12.5px] font-semibold shadow-[0_6px_20px_rgba(0,0,0,0.45)] ring-1 ring-white/[0.1] ${content.light ? 'bg-[#F5F5F5] text-[#0A0A0A]' : 'bg-black text-white'}`}
              style={{ cursor: content.action ? 'pointer' : 'default' }}
            >
              {content.icon}
              {content.text && <span>{content.text}</span>}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
