import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { useEscape } from '../../hooks/useEscape'
import { SPRING } from '../../lib/motion'

// Confirmación ligera (dos botones) para acciones que se pueden deshacer pero conviene
// no hacer por accidente. Para borrar algo de verdad, ConfirmDeleteModal pide escribir el nombre.
// El botón peligroso no está enfocado por defecto: Enter no lo dispara sin querer.
export default function ConfirmDialog({ title, description, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', danger = true, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false)
  useEscape(() => !busy && onClose())
  const run = async () => {
    if (busy) return
    setBusy(true)
    try {
      await onConfirm()
      onClose()
    } catch {
      setBusy(false)
    }
  }
  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-0 backdrop-blur-[10px] md:p-6" onClick={() => !busy && onClose()}>
      <motion.div initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }} transition={SPRING} onClick={(e) => e.stopPropagation()}>
        <div role="alertdialog" aria-modal="true" aria-label={title} className="ador-modal-surface ador-grain w-[min(400px,calc(100vw-32px))] rounded-[28px] p-7">
          <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-[#F5F5F5]">{title}</h2>
          {description && <p className="mt-2 text-[13.5px] leading-relaxed text-[#9A9A9A]">{description}</p>}
          <div className="mt-6 flex justify-end gap-2.5">
            <button type="button" autoFocus onClick={onClose} disabled={busy} className="rounded-full px-5 py-2.5 text-[13.5px] font-medium text-[#E4E4E4] transition-colors hover:bg-white/[0.08] disabled:opacity-50">{cancelLabel}</button>
            <button type="button" onClick={run} disabled={busy} className="rounded-full px-5 py-2.5 text-[13.5px] font-semibold transition-opacity disabled:opacity-60" style={danger ? { background: '#D9433F', color: '#fff' } : { background: '#F5F5F5', color: '#0A0A0A' }}>{busy ? '…' : confirmLabel}</button>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}
