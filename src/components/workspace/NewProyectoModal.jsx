import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { createProyectoInterno } from '../../lib/firestore'
import { useToast } from '../../hooks/useToast'

const labelClass = 'mb-1.5 block font-medium text-[#444444]'
const labelStyle = { fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }
const inputClass =
  'w-full rounded-xl border border-white/[0.08] bg-[#1A1A1A] px-3.5 py-[10px] text-[13px] text-[#F5F5F5] placeholder:text-[#444444] outline-none transition-colors duration-150 focus:border-white/[0.2]'

export default function NewProyectoModal({ actorName, onClose, onCreated }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const showToast = useToast()

  const handleCreate = async () => {
    setSaving(true)
    try {
      const ref = await createProyectoInterno({ name: name.trim(), description: description.trim() }, actorName)
      showToast(`${name.trim()} fue creado correctamente.`)
      onCreated?.(ref.id)
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
        <h2 className="text-[15px] font-semibold text-[#F5F5F5]">Nuevo Proyecto Interno</h2>

        <div className="mt-6 flex flex-col gap-4">
          <div>
            <label className={labelClass} style={labelStyle}>
              Nombre <span style={{ color: '#B8860B' }}>*</span>
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Plataforma, Marketing, Operaciones..."
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} style={labelStyle}>
              Descripción
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
            disabled={!name.trim() || saving}
            onClick={handleCreate}
            className="ador-btn-primary rounded-xl px-5 py-2 text-[13px] font-medium"
          >
            Crear Proyecto
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}
