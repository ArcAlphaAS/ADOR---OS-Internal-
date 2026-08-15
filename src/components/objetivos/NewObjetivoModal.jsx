import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { OBJETIVO_METRICS, OBJETIVO_TYPES, FOCO_SUGGESTIONS } from '../../lib/objetivos'
import { createObjetivo } from '../../lib/firestore'
import { withTimeout } from '../../lib/workspace'
import { useToast } from '../../hooks/useToast'

const labelClass = 'mb-1.5 block font-medium text-[#444444]'
const labelStyle = { fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }
const inputClass =
  'w-full rounded-xl border border-white/[0.08] bg-[#1A1A1A] px-3.5 py-[10px] text-[13px] text-[#F5F5F5] placeholder:text-[#444444] outline-none transition-colors duration-150 focus:border-white/[0.2]'

export default function NewObjetivoModal({ quarterKey, actorName, users, preset, onClose }) {
  const [title, setTitle] = useState(preset?.title || '')
  const [type, setType] = useState(preset?.type || 'kpi')
  const [metric, setMetric] = useState(preset?.metric || 'revenue_quarter')
  const [targetValue, setTargetValue] = useState('')
  const [customLabel, setCustomLabel] = useState('')
  const [foco, setFoco] = useState(preset?.foco || '')
  const [ownerId, setOwnerId] = useState('')
  const [saving, setSaving] = useState(false)
  const showToast = useToast()

  const metricDef = OBJETIVO_METRICS.find((m) => m.id === metric)
  const canSave = title.trim() && (type === 'milestone' || (targetValue && Number(targetValue) > 0))

  const handleCreate = async () => {
    if (!canSave || saving) return
    setSaving(true)
    try {
      await withTimeout(
        createObjetivo(
          {
            title: title.trim(),
            type,
            quarter: quarterKey,
            foco: foco.trim() || 'General',
            ownerId: ownerId || null,
            ...(type === 'kpi'
              ? {
                  metric,
                  unit: metric === 'custom' ? customLabel.trim() || '' : metricDef.unit,
                  targetValue: Number(targetValue),
                  currentValue: metric === 'custom' ? 0 : null,
                }
              : {}),
          },
          actorName
        )
      )
      onClose()
    } catch (error) {
      showToast(`No se pudo crear el objetivo: ${error.message}`)
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
        <div className="ador-modal-surface ador-grain w-[420px] rounded-[28px] p-8">
          <h2 className="text-[15px] font-semibold text-[#F5F5F5]">Nuevo Objetivo</h2>

          <div className="mt-6 flex flex-col gap-4">
            <div>
              <label className={labelClass} style={labelStyle}>
                Título <span style={{ color: '#B8860B' }}>*</span>
              </label>
              <input
                autoFocus
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="¿Qué queremos lograr este trimestre?"
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass} style={labelStyle}>
                  Foco
                </label>
                <input
                  type="text"
                  list="foco-suggestions"
                  value={foco}
                  onChange={(e) => setFoco(e.target.value)}
                  placeholder="General"
                  className={inputClass}
                />
                <datalist id="foco-suggestions">
                  {FOCO_SUGGESTIONS.map((f) => (
                    <option key={f} value={f} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className={labelClass} style={labelStyle}>
                  Responsable
                </label>
                <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className={inputClass}>
                  <option value="">Sin asignar</option>
                  {users?.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.displayName || u.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass} style={labelStyle}>
                Tipo
              </label>
              <div className="flex gap-2">
                {OBJETIVO_TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setType(t.id)}
                    className="flex-1 rounded-xl border px-3 py-2 text-[12px] font-medium transition-colors duration-150"
                    style={{
                      borderColor: type === t.id ? '#1E5FAD' : 'rgba(255,255,255,0.1)',
                      color: type === t.id ? '#1E5FAD' : '#888888',
                      background: type === t.id ? 'rgba(30,95,173,0.1)' : 'transparent',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {type === 'kpi' && (
              <>
                <div>
                  <label className={labelClass} style={labelStyle}>
                    Métrica
                  </label>
                  <select value={metric} onChange={(e) => setMetric(e.target.value)} className={inputClass}>
                    {OBJETIVO_METRICS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  {metricDef?.live && (
                    <p className="mt-1.5 text-[11px] text-[#444444]">
                      Se calcula solo con datos reales de {metricDef.label.includes('Ingresos') ? 'Finanzas' : metricDef.label.includes('tarea') ? 'Workspace' : 'Clientes'} — no se edita a mano.
                    </p>
                  )}
                </div>

                {metric === 'custom' && (
                  <div>
                    <label className={labelClass} style={labelStyle}>
                      Unidad
                    </label>
                    <input
                      type="text"
                      value={customLabel}
                      onChange={(e) => setCustomLabel(e.target.value)}
                      placeholder="Ej. leads, reuniones..."
                      className={inputClass}
                    />
                  </div>
                )}

                <div>
                  <label className={labelClass} style={labelStyle}>
                    Meta <span style={{ color: '#B8860B' }}>*</span>
                  </label>
                  <input
                    type="number"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    placeholder="0"
                    className={inputClass}
                  />
                </div>
              </>
            )}
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
              onClick={handleCreate}
              className="ador-btn-primary rounded-xl px-5 py-2 text-[13px] font-medium disabled:opacity-40"
            >
              {saving ? 'Creando…' : 'Crear Objetivo'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}
