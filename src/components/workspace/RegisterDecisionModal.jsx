import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { createDecision } from '../../lib/firestore'
import { useToast } from '../../hooks/useToast'

const labelClass = 'mb-1.5 block font-medium text-[#444444]'
const labelStyle = { fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }
const inputClass =
  'w-full rounded-xl border border-white/[0.08] bg-[#1A1A1A] px-3.5 py-[10px] text-[13px] text-[#F5F5F5] placeholder:text-[#444444] outline-none transition-colors duration-150 focus:border-white/[0.2]'

export default function RegisterDecisionModal({ workstreams, actorName, onClose }) {
  const [title, setTitle] = useState('')
  const [context, setContext] = useState('')
  const [linkedId, setLinkedId] = useState('')
  const [saving, setSaving] = useState(false)
  const showToast = useToast()

  const handleSave = async () => {
    setSaving(true)
    try {
      const linked = workstreams.find((w) => w.id === linkedId)
      await createDecision(
        {
          title: title.trim(),
          context: context.trim(),
          clientId: linked?.kind === 'intervencion' ? linked.clientId : null,
          proyectoId: linked?.kind === 'proyecto_interno' ? linked.proyectoId : null,
          linkedName: linked?.name || null,
        },
        actorName
      )
      showToast('Decisión registrada.')
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[10px]"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        className="ador-modal-surface ador-grain w-[420px] rounded-[28px] p-8"
      >
        <h2 className="text-[15px] font-semibold text-[#F5F5F5]">Registrar Decisión</h2>

        <div className="mt-6 flex flex-col gap-4">
          <div>
            <label className={labelClass} style={labelStyle}>
              Decisión <span style={{ color: '#B8860B' }}>*</span>
            </label>
            <textarea
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              rows={3}
              placeholder="¿Qué se decidió?"
              className={`${inputClass} resize-none`}
            />
          </div>
          <div>
            <label className={labelClass} style={labelStyle}>
              Contexto
            </label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={2}
              placeholder="Opcional"
              className={`${inputClass} resize-none`}
            />
          </div>
          <div>
            <label className={labelClass} style={labelStyle}>
              Vinculada a
            </label>
            <select value={linkedId} onChange={(e) => setLinkedId(e.target.value)} className={inputClass}>
              <option value="">Ninguna</option>
              {workstreams.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.kind === 'intervencion' ? `${w.name} (Intervención)` : `${w.name} (Proyecto Interno)`}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-7 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-[13px] text-[#888888] transition-colors hover:text-[#F5F5F5]"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!title.trim() || saving}
            onClick={handleSave}
            className="ador-btn-primary rounded-xl px-5 py-2 text-[13px] font-medium"
          >
            Registrar
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}
