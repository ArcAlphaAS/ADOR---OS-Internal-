import { AnimatePresence, motion } from 'framer-motion'
import { useAppUpdate } from '../../hooks/useAppUpdate'
import { SPRING } from '../../lib/motion'

// "Nueva versión disponible · Actualizar" — so the team never has to know
// that the installed app only picks up changes after closing and reopening.
export default function UpdateBanner() {
  const available = useAppUpdate()
  return (
    <AnimatePresence>
      {available && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={SPRING}
          className="fixed inset-x-0 z-[80] flex justify-center px-4"
          style={{ top: 'calc(env(safe-area-inset-top) + 10px)' }}
        >
          <div className="flex items-center gap-3 rounded-full border border-white/[0.1] bg-[#1C1C1E]/95 py-1.5 pr-1.5 pl-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl">
            <span className="text-[13px] text-[#DDDDDD]">Nueva versión de ADOR OS</span>
            <button type="button" onClick={() => window.location.reload()} className="rounded-full px-3.5 py-1.5 text-[13px] font-semibold text-[#1C1A16]" style={{ background: '#E8C15A' }}>
              Actualizar
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
