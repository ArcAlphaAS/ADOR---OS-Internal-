import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { startNewService } from '../../lib/firestore'
import { STAGES, serviceLabel } from '../../lib/clientStages'
import { withTimeout } from '../../lib/workspace'
import { useToast } from '../../hooks/useToast'
import { SPRING } from '../../lib/motion'

// A client that finished (Completado) comes back — maybe with another
// service. The finished cycle is archived in its ficha (payments included,
// Finanzas keeps counting them) and the client re-enters the pipeline.
const field = 'mt-2 w-full rounded-[10px] border border-[#262626] bg-[#0A0A0A] px-3.5 py-2.5 text-[14px] text-[#F5F5F5] outline-none focus:border-[#F5F5F5]/60'

export default function NewServiceModal({ client, services, actorName, onClose }) {
  const showToast = useToast()
  const [serviceType, setServiceType] = useState(services[0]?.id || 'intervencion')
  const [amount, setAmount] = useState('')
  const [stage, setStage] = useState('propuesta')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !busy && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  const confirm = async () => {
    if (busy) return
    setBusy(true)
    try {
      await withTimeout(startNewService(client, { serviceType, amount: Number(amount) || null, stage }, actorName))
      showToast(`Nuevo servicio abierto para ${client.name}.`)
      onClose()
    } catch (e) {
      showToast(`No se pudo abrir el servicio: ${e.message}`)
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
          <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-[#F5F5F5]">Nuevo servicio para {client.name}</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-[#8A8A8A]">
            El servicio anterior ({serviceLabel(client.serviceType, services)}) queda guardado en su historial, con sus pagos. {client.name} vuelve al Pipeline para este nuevo servicio.
          </p>

          <label className="mt-5 block text-[12.5px] text-[#8A8A8A]">
            Tipo de servicio
            <select value={serviceType} onChange={(e) => setServiceType(e.target.value)} className={field}>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </label>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="block text-[12.5px] text-[#8A8A8A]">
              Monto (soles)
              <input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Opcional" className={field} />
            </label>
            <label className="block text-[12.5px] text-[#8A8A8A]">
              Empieza en
              <select value={stage} onChange={(e) => setStage(e.target.value)} className={field}>
                {STAGES.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-6 flex justify-end gap-2.5">
            <button type="button" onClick={onClose} disabled={busy} className="rounded-full px-4 py-2 text-[13px] font-medium text-[#C8C8C8] transition-colors hover:bg-white/[0.06] disabled:opacity-50">
              Cancelar
            </button>
            <button type="button" onClick={confirm} disabled={busy} className="rounded-full bg-[#F5F5F5] px-4 py-2 text-[13px] font-medium text-[#0A0A0A] transition-opacity hover:bg-white disabled:opacity-50">
              {busy ? 'Abriendo…' : 'Abrir nuevo servicio'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}
