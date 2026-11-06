import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { useEscape } from '../../hooks/useEscape'
import { SPRING } from '../../lib/motion'

// Una pregunta con un solo campo (p. ej. "Renombrar proyecto").
export default function PromptModal({ title, label, initial = '', confirmLabel = 'Guardar', onSubmit, onClose }) {
  useEscape(onClose)
  const [value, setValue] = useState(initial)
  const [busy, setBusy] = useState(false)
  const ok = value.trim() && value.trim() !== initial
  const submit = async () => {
    if (!ok || busy) return
    setBusy(true)
    try {
      await onSubmit(value.trim())
      onClose()
    } catch {
      setBusy(false)
    }
  }
  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-[10px]" onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={SPRING} onClick={(e) => e.stopPropagation()}>
        <div className="ador-modal-surface ador-grain w-[min(400px,calc(100vw-32px))] rounded-[28px] p-7">
          <h2 className="text-[17px] font-semibold text-[#F5F5F5]">{title}</h2>
          <label className="mt-4 block text-[12.5px] text-[#8A8A8A]">{label}
            <input autoFocus value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} className="mt-2 w-full rounded-[10px] border border-[#262626] bg-[#0A0A0A] px-3.5 py-2.5 text-[16px] text-[#F5F5F5] outline-none focus:border-white/30 md:text-[14px]" />
          </label>
          <div className="mt-6 flex justify-end gap-2.5">
            <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-[13px] font-medium text-[#C8C8C8] hover:bg-white/[0.06]">Cancelar</button>
            <button type="button" onClick={submit} disabled={!ok || busy} className="ador-btn-primary rounded-full px-5 py-2 text-[13px] font-semibold disabled:opacity-40">{confirmLabel}</button>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}
