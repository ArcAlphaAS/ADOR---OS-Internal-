import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SPRING } from '../../lib/motion'

// "Sin conexión" while the device is offline, then a short "Conectado de
// nuevo" when it comes back. Nothing is lost meanwhile: writes wait on the
// device and go out on reconnect (lib/firestore.js local cache,
// withTimeout in lib/workspace.js). Messages sent offline show ◷ until
// the server confirms them.
export default function OfflineBanner() {
  const [online, setOnline] = useState(() => navigator.onLine !== false)
  const [back, setBack] = useState(false)
  useEffect(() => {
    let t
    const off = () => {
      clearTimeout(t)
      setBack(false)
      setOnline(false)
    }
    const on = () => {
      setOnline(true)
      setBack(true)
      t = setTimeout(() => setBack(false), 2500)
    }
    window.addEventListener('offline', off)
    window.addEventListener('online', on)
    return () => {
      clearTimeout(t)
      window.removeEventListener('offline', off)
      window.removeEventListener('online', on)
    }
  }, [])
  const show = !online || back
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key={online ? 'back' : 'off'}
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={SPRING}
          className="pointer-events-none fixed inset-x-0 z-[79] flex justify-center px-4"
          style={{ top: 'calc(env(safe-area-inset-top) + 10px)' }}
        >
          <div className="flex items-center gap-2 rounded-full border border-white/[0.1] bg-[#1C1C1E]/95 px-4 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl">
            <span className="h-2 w-2 rounded-full" style={{ background: online ? '#4CAF50' : '#8E8E93' }} />
            <span className="text-[13px] text-[#DDDDDD]">{online ? 'Conectado de nuevo — enviando lo pendiente' : 'Sin conexión — lo que envíes saldrá al volver la señal'}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
