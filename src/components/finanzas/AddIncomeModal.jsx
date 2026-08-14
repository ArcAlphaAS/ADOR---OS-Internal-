import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { addManualIncome } from '../../lib/firestore'
import { useToast } from '../../hooks/useToast'

const labelClass = 'mb-1.5 block font-medium text-[#444444]'
const labelStyle = { fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }
const inputClass =
  'w-full rounded-xl border border-white/[0.08] bg-[#1A1A1A] px-3.5 py-[10px] text-[13px] text-[#F5F5F5] placeholder:text-[#444444] outline-none transition-colors duration-150 focus:border-white/[0.2]'

export default function AddIncomeModal({ clients, actorName, onClose }) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [clientId, setClientId] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const showToast = useToast()

  const canSave = description.trim() && Number(amount) > 0 && date

  const handleSave = async () => {
    setSaving(true)
    try {
      const client = clients.find((c) => c.id === clientId)
      await addManualIncome(
        {
          description: description.trim(),
          amount: Number(amount),
          date,
          clientId: clientId || null,
          clientName: client?.name || null,
          notes: notes.trim(),
        },
        actorName
      )
      showToast('Ingreso registrado correctamente.')
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
        <h2 className="text-[15px] font-semibold text-[#F5F5F5]">Ingreso Manual</h2>

        <div className="mt-6 flex flex-col gap-4">
          <div>
            <label className={labelClass} style={labelStyle}>
              Descripción <span style={{ color: '#B8860B' }}>*</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="¿De qué es este ingreso?"
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} style={labelStyle}>
                Monto (soles) <span style={{ color: '#B8860B' }}>*</span>
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>
                Fecha <span style={{ color: '#B8860B' }}>*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass} style={labelStyle}>
              SP relacionado
            </label>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={inputClass}>
              <option value="">Ninguno</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} style={labelStyle}>
              Notas
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Opcional"
              className={`${inputClass} resize-none`}
            />
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
            disabled={!canSave || saving}
            onClick={handleSave}
            className="ador-btn-primary rounded-xl px-5 py-2 text-[13px] font-medium"
          >
            Registrar Ingreso
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}
