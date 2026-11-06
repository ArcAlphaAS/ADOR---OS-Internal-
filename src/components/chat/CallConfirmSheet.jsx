import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { SPRING } from '../../lib/motion'
import { useEscape } from '../../hooks/useEscape'
import { haptic } from '../../lib/haptics'
import { VideoIcon, PhoneIcon } from '../icons'
import PersonAvatar from './PersonAvatar'

// Confirmación antes de llamar: evita llamadas por un toque sin querer. La cara
// de la persona (o el grupo), una línea que dice a quién llamas, dos opciones
// grandes (Videollamada o Llamada de voz, las dos por Google Meet) y Cancelar.
// Tocar una opción confirma y llama; no hay un segundo paso. En el teléfono sube
// como hoja desde abajo (regla CSS de los modales); en computadora es una tarjeta.
export default function CallConfirmSheet({ uid, name, subtitle, count, note, onPick, onClose }) {
  useEscape(onClose)
  const first = (name || '').split(' ')[0]
  const pick = (type) => {
    haptic()
    onPick(type)
  }
  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 backdrop-blur-[8px]" onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }} transition={SPRING} onClick={(e) => e.stopPropagation()}>
        <div className="ador-modal-surface ador-grain w-[380px] max-w-[92vw] rounded-[28px] p-7 text-center">
          <div className="relative mx-auto flex h-[92px] w-[92px] items-center justify-center">
            <span className="absolute inset-0 rounded-full border border-[#F4EEE2]/30" style={{ animation: 'ador-pulse 2s ease-in-out infinite' }} />
            {uid ? (
              <PersonAvatar uid={uid} name={name} size={72} />
            ) : (
              <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-white/[0.08] text-[22px] font-semibold text-[#F5F5F5]">{count || '#'}</span>
            )}
          </div>
          <h2 className="mt-4 text-[21px] font-semibold tracking-[-0.01em] text-[#F5F5F5]">{uid ? `¿Llamar a ${first}?` : `¿Llamar a ${name}?`}</h2>
          <p className="mt-1 text-[13.5px] text-[#8E8E93]">{subtitle || 'Se abre en Google Meet y le suena en su teléfono.'}</p>
          {note && <p className="mx-auto mt-3 rounded-2xl bg-white/[0.06] px-3.5 py-2 text-[12.5px] leading-snug text-[#E8C15A]">{note}</p>}

          <div className="mt-6 grid grid-cols-2 gap-2.5">
            <button type="button" onClick={() => pick('video')} className="flex flex-col items-center gap-2 rounded-[22px] bg-[#F5F5F5] px-3 py-4 text-[#0A0A0A] active:scale-[0.97]" style={{ transition: 'transform 120ms' }}>
              <VideoIcon size={22} />
              <span className="text-[14.5px] font-semibold">Videollamada</span>
            </button>
            <button type="button" onClick={() => pick('audio')} className="flex flex-col items-center gap-2 rounded-[22px] bg-white/[0.09] px-3 py-4 text-[#F5F5F5] active:scale-[0.97]" style={{ transition: 'transform 120ms' }}>
              <PhoneIcon size={22} />
              <span className="text-[14.5px] font-semibold">Llamada</span>
            </button>
          </div>
          <button type="button" onClick={onClose} className="mt-4 w-full rounded-full py-3 text-[15px] text-[#8E8E93]">Cancelar</button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}
