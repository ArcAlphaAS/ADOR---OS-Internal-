import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { markClientCompleted } from '../../lib/firestore'
import { currencyPEN, pendingPaymentAmount, serviceLabel } from '../../lib/clientStages'
import { withTimeout } from '../../lib/workspace'
import { useToast } from '../../hooks/useToast'
import { SPRING } from '../../lib/motion'

// "Completado": the work is done but the relationship isn't over. Nothing is
// lost — history and payments stay, and "Nuevo servicio" can reopen it later.
export default function CompleteClientModal({ client, services, actorName, onClose }) {
  const showToast = useToast()
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const owed = pendingPaymentAmount(client)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !busy && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  const confirm = async () => {
    if (busy) return
    setBusy(true)
    try {
      await withTimeout(markClientCompleted(client, note.trim(), actorName))
      showToast(`${client.name} quedó como completado.`)
      onClose()
    } catch (e) {
      showToast(`No se pudo completar: ${e.message}`)
      setBusy(false)
    }
  }

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[10px]"
      onClick={() => !busy && onClose()}
    >
      <motion.div initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={SPRING} onClick={(e) => e.stopPropagation()}>
        <div className="ador-modal-surface ador-grain w-[min(420px,calc(100vw-32px))] rounded-[28px] p-7">
          <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: 'rgba(76,175,80,0.14)', color: '#4CAF50' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </div>
          <h2 className="mt-4 text-[17px] font-semibold tracking-[-0.01em] text-[#F5F5F5]">¿Marcar a {client.name} como completado?</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-[#8A8A8A]">
            Termina el servicio ({serviceLabel(client.serviceType, services)}). Sale del Pipeline y de Workspace, pero conserva su historial y sus pagos. Cuando vuelva con otro servicio, lo reabres con “Nuevo servicio”.
          </p>
          {owed > 0 && (
            <p className="mt-3 text-[12.5px] leading-relaxed text-[#C9A227]">
              • Aún tiene {currencyPEN.format(owed)} por cobrar: seguirá apareciendo en Por cobrar.
            </p>
          )}
          <label className="mt-5 block text-[12.5px] text-[#8A8A8A]">
            ¿Cómo terminó? <span className="text-[#5E5E5E]">(opcional)</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Resultado, aprendizajes, si quedó abierta una nueva conversación…"
              className="mt-2 w-full resize-none rounded-[10px] border border-[#262626] bg-[#0A0A0A] px-3.5 py-2.5 text-[13.5px] text-[#F5F5F5] outline-none placeholder:text-[#4A4A4A] focus:border-[#F5F5F5]/60"
            />
          </label>
          <div className="mt-6 flex justify-end gap-2.5">
            <button type="button" onClick={onClose} disabled={busy} className="rounded-full px-4 py-2 text-[13px] font-medium text-[#C8C8C8] transition-colors hover:bg-white/[0.06] disabled:opacity-50">
              Cancelar
            </button>
            <button type="button" onClick={confirm} disabled={busy} className="rounded-full bg-[#F5F5F5] px-4 py-2 text-[13px] font-medium text-[#0A0A0A] transition-opacity hover:bg-white disabled:opacity-50">
              {busy ? 'Guardando…' : 'Marcar como completado'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}
