import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { startNewService, configureClientService } from '../../lib/firestore'
import { BILLING_EVERY, STAGES, modalityLabel, serviceLabel, serviceModality, todayISO } from '../../lib/clientStages'
import { withTimeout } from '../../lib/workspace'
import { useToast } from '../../hooks/useToast'
import { SPRING } from '../../lib/motion'

// Defines a client's service and how it is billed. Two entry points:
//  - mode "reopen": a client that finished (Completado) comes back; the old
//    cycle is archived and the client re-enters the pipeline.
//  - mode "setup": an active client gets (or changes) its service type and
//    billing — a contract, a subscription or a one-off payment.
// The type's MODALITY (set by admins) decides the fields: a fixed project
// keeps the 60/40 payments; a contract has a base term plus renewal options
// and periodic cobros (annual by default); a subscription repeats a cobro;
// a one-off payment is a single cobro.
const field = 'mt-2 w-full rounded-[10px] border border-[#262626] bg-[#0A0A0A] px-3.5 py-2.5 text-[14px] text-[#F5F5F5] outline-none focus:border-[#F5F5F5]/60'
const newId = () => Math.random().toString(36).slice(2, 8)

export default function NewServiceModal({ client, services, actorName, mode = 'reopen', onClose }) {
  const showToast = useToast()
  const existing = mode === 'setup' ? client.billing : null
  const [serviceType, setServiceType] = useState(client.serviceType && mode === 'setup' ? client.serviceType : services[0]?.id || 'intervencion')
  const modality = serviceModality(serviceType, services)
  const defaultEvery = modality === 'suscripcion' ? 'mes' : 'anio'
  const [amount, setAmount] = useState(existing?.amount ? String(existing.amount) : mode === 'setup' && client.montoAcordado ? String(client.montoAcordado) : '')
  const [every, setEvery] = useState(existing?.every || '')
  const [startDate, setStartDate] = useState(existing?.startDate || todayISO())
  const [termMonths, setTermMonths] = useState(String(existing?.termMonths || 12))
  const [options, setOptions] = useState(existing?.options || [])
  const [stage, setStage] = useState('propuesta')
  const [busy, setBusy] = useState(false)
  const effectiveEvery = every || defaultEvery

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !busy && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  const setOption = (id, patch) => setOptions((list) => list.map((o) => (o.id === id ? { ...o, ...patch } : o)))

  const confirm = async () => {
    if (busy) return
    if (modality !== 'proyecto' && !(Number(amount) > 0)) {
      showToast('Escribe el monto de cada cobro.')
      return
    }
    if (modality === 'contrato' && !(Number(termMonths) > 0)) {
      showToast('Indica la duración del periodo base.')
      return
    }
    const billing =
      modality === 'proyecto'
        ? null
        : {
            modality,
            amount: Number(amount),
            every: modality === 'unico' ? null : effectiveEvery,
            startDate,
            ...(modality === 'contrato'
              ? {
                  termMonths: Number(termMonths),
                  options: options.map((o, i) => ({
                    id: o.id,
                    label: o.label?.trim() || `Opción ${i + 1}`,
                    months: Number(o.months) || 12,
                    amount: Number(o.amount) || Number(amount),
                    status: o.status || 'pendiente',
                  })),
                }
              : {}),
            ...(existing?.nextDue ? { nextDue: existing.nextDue } : {}),
          }
    setBusy(true)
    try {
      if (mode === 'setup') {
        await withTimeout(configureClientService(client, { serviceType, billing }, actorName))
        showToast('Servicio y cobro guardados.')
      } else {
        const entryStage = modality === 'proyecto' ? stage : 'intervencion_activa'
        await withTimeout(startNewService(client, { serviceType, amount: Number(amount) || null, stage: entryStage, billing }, actorName))
        showToast(`Nuevo servicio abierto para ${client.name}.`)
      }
      onClose()
    } catch (e) {
      showToast(`No se pudo guardar: ${e.message}`)
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
        <div className="ador-modal-surface ador-grain max-h-[90vh] w-[min(460px,calc(100vw-32px))] overflow-y-auto rounded-[28px] p-7">
          <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-[#F5F5F5]">
            {mode === 'setup' ? `Servicio y cobro de ${client.name}` : `Nuevo servicio para ${client.name}`}
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-[#8A8A8A]">
            {mode === 'setup'
              ? 'Define qué servicio es y cómo se cobra. Los cobros se generan solos en cada periodo.'
              : `El servicio anterior (${serviceLabel(client.serviceType, services)}) queda guardado en su historial, con sus pagos. ${client.name} vuelve para este nuevo servicio.`}
          </p>

          <label className="mt-5 block text-[12.5px] text-[#8A8A8A]">
            Tipo de servicio <span className="text-[#5E5E5E]">· {modalityLabel(modality)}</span>
            <select value={serviceType} onChange={(e) => setServiceType(e.target.value)} className={field}>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </label>

          {modality === 'proyecto' ? (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="block text-[12.5px] text-[#8A8A8A]">
                Monto (soles)
                <input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Opcional" className={field} />
              </label>
              {mode === 'reopen' && (
                <label className="block text-[12.5px] text-[#8A8A8A]">
                  Empieza en
                  <select value={stage} onChange={(e) => setStage(e.target.value)} className={field}>
                    {STAGES.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          ) : (
            <>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <label className="block text-[12.5px] text-[#8A8A8A]">
                  {modality === 'unico' ? 'Monto (soles)' : 'Monto por cobro (soles)'}
                  <input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className={field} />
                </label>
                <label className="block text-[12.5px] text-[#8A8A8A]">
                  {modality === 'unico' ? 'Fecha del cobro' : 'Empieza el'}
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={field} style={{ colorScheme: 'dark' }} />
                </label>
              </div>
              {modality !== 'unico' && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <label className="block text-[12.5px] text-[#8A8A8A]">
                    Se cobra
                    <select value={effectiveEvery} onChange={(e) => setEvery(e.target.value)} className={field}>
                      {BILLING_EVERY.map((e) => (
                        <option key={e.id} value={e.id}>{e.label}</option>
                      ))}
                    </select>
                  </label>
                  {modality === 'contrato' && (
                    <label className="block text-[12.5px] text-[#8A8A8A]">
                      Periodo base (meses)
                      <input type="number" min="1" value={termMonths} onChange={(e) => setTermMonths(e.target.value)} className={field} />
                    </label>
                  )}
                </div>
              )}

              {modality === 'contrato' && (
                <div className="mt-5">
                  <p className="text-[12.5px] text-[#8A8A8A]">
                    Opciones de renovación <span className="text-[#5E5E5E]">· el cliente decide si las ejerce; avisamos 3 meses antes del fin</span>
                  </p>
                  <div className="mt-2 space-y-2">
                    {options.map((o, i) => (
                      <div key={o.id} className="grid grid-cols-[1fr_72px_96px_auto] items-center gap-2">
                        <input value={o.label || ''} onChange={(e) => setOption(o.id, { label: e.target.value })} placeholder={`Opción ${i + 1}`} className="rounded-[10px] border border-[#262626] bg-[#0A0A0A] px-3 py-2 text-[13px] text-[#F5F5F5] outline-none focus:border-[#F5F5F5]/60" />
                        <input type="number" min="1" value={o.months ?? 12} onChange={(e) => setOption(o.id, { months: e.target.value })} aria-label="Meses" title="Meses que añade" className="rounded-[10px] border border-[#262626] bg-[#0A0A0A] px-2.5 py-2 text-[13px] text-[#F5F5F5] outline-none focus:border-[#F5F5F5]/60" />
                        <input type="number" min="0" value={o.amount ?? ''} onChange={(e) => setOption(o.id, { amount: e.target.value })} placeholder="Monto" aria-label="Monto por cobro" className="rounded-[10px] border border-[#262626] bg-[#0A0A0A] px-2.5 py-2 text-[13px] text-[#F5F5F5] outline-none placeholder:text-[#4A4A4A] focus:border-[#F5F5F5]/60" />
                        <button type="button" onClick={() => setOptions((list) => list.filter((x) => x.id !== o.id))} className="px-1 text-[12px] text-[#767676] hover:text-[#EF5350]">Quitar</button>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={() => setOptions((list) => [...list, { id: newId(), label: '', months: 12, amount: amount || '', status: 'pendiente' }])} className="mt-2 text-[12.5px] font-medium text-[#F4EEE2] hover:underline">
                    + Añadir opción de renovación
                  </button>
                  {options.length > 0 && <p className="mt-1.5 text-[11.5px] text-[#5E5E5E]">Cada opción: nombre · meses que añade · monto por cobro.</p>}
                </div>
              )}
            </>
          )}

          <div className="mt-6 flex justify-end gap-2.5">
            <button type="button" onClick={onClose} disabled={busy} className="rounded-full px-4 py-2 text-[13px] font-medium text-[#C8C8C8] transition-colors hover:bg-white/[0.06] disabled:opacity-50">
              Cancelar
            </button>
            <button type="button" onClick={confirm} disabled={busy} className="rounded-full bg-[#F5F5F5] px-4 py-2 text-[13px] font-medium text-[#0A0A0A] transition-opacity hover:bg-white disabled:opacity-50">
              {busy ? 'Guardando…' : mode === 'setup' ? 'Guardar' : 'Abrir nuevo servicio'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}
