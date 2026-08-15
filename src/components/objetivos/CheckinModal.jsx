import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { CONFIDENCE_LEVELS } from '../../lib/objetivos'
import { submitCheckin } from '../../lib/firestore'
import { withTimeout } from '../../lib/workspace'
import { useToast } from '../../hooks/useToast'

const labelClass = 'mb-1.5 block font-medium text-[#444444]'
const labelStyle = { fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }
const inputClass =
  'w-full rounded-xl border border-white/[0.08] bg-[#1A1A1A] px-3.5 py-[10px] text-[13px] text-[#F5F5F5] placeholder:text-[#444444] outline-none transition-colors duration-150 focus:border-white/[0.2]'

// The "Friday 3-minute sync" — deliberately three fields, nothing more.
// Only writes the *latest* state (see submitCheckin in lib/firestore.js),
// no weekly history yet.
export default function CheckinModal({ objetivo, actorName, onClose }) {
  const [confidence, setConfidence] = useState(objetivo.confidence || 'verde')
  const [blocker, setBlocker] = useState(objetivo.blocker || '')
  const [progressValue, setProgressValue] = useState(
    objetivo.type === 'kpi' && objetivo.metric === 'custom' ? objetivo.currentValue || '' : ''
  )
  const [saving, setSaving] = useState(false)
  const showToast = useToast()

  const isCustomKpi = objetivo.type === 'kpi' && objetivo.metric === 'custom'

  const handleSave = async () => {
    setSaving(true)
    try {
      await withTimeout(
        submitCheckin(
          objetivo.id,
          {
            confidence,
            blocker: blocker.trim(),
            progressValue: isCustomKpi ? Number(progressValue) || 0 : undefined,
          },
          actorName
        )
      )
      showToast('Check-in guardado.')
      onClose()
    } catch (error) {
      showToast(`No se pudo guardar el check-in: ${error.message}`)
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
      >
        <div className="ador-modal-surface ador-grain w-[400px] rounded-[28px] p-8">
          <h2 className="text-[15px] font-semibold text-[#F5F5F5]">Check-in — {objetivo.title}</h2>

          <div className="mt-6 flex flex-col gap-4">
            <div>
              <label className={labelClass} style={labelStyle}>
                Confianza
              </label>
              <div className="flex gap-2">
                {CONFIDENCE_LEVELS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setConfidence(c.id)}
                    className="flex-1 rounded-xl border px-2 py-2 text-[12px] font-medium transition-colors duration-150"
                    style={{
                      borderColor: confidence === c.id ? c.color : 'rgba(255,255,255,0.1)',
                      color: confidence === c.id ? c.color : '#888888',
                      background: confidence === c.id ? `${c.color}1A` : 'transparent',
                    }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {isCustomKpi && (
              <div>
                <label className={labelClass} style={labelStyle}>
                  Progreso actual ({objetivo.unit || 'unidades'})
                </label>
                <input
                  type="number"
                  value={progressValue}
                  onChange={(e) => setProgressValue(e.target.value)}
                  placeholder="0"
                  className={inputClass}
                />
              </div>
            )}

            <div>
              <label className={labelClass} style={labelStyle}>
                Bloqueo (opcional)
              </label>
              <textarea
                value={blocker}
                onChange={(e) => setBlocker(e.target.value)}
                rows={2}
                placeholder="¿Qué o quién te impide avanzar?"
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
              disabled={saving}
              onClick={handleSave}
              className="ador-btn-primary rounded-xl px-5 py-2 text-[13px] font-medium disabled:opacity-40"
            >
              {saving ? 'Guardando…' : 'Guardar check-in'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}
