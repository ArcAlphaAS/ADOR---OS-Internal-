import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '../../lib/firestore'
import { STAGES } from '../../lib/clientStages'

const labelClass = 'mb-1.5 block font-medium text-[#444444]'
const labelStyle = { fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }
const inputClass =
  'w-full rounded-xl border border-white/[0.08] bg-[#1A1A1A] px-3.5 py-[10px] text-[13px] text-[#F5F5F5] placeholder:text-[#444444] outline-none transition-colors duration-150 focus:border-white/[0.2]'

const INITIAL = {
  name: '',
  industria: '',
  revenueEstimado: '',
  website: '',
  linkedin: '',
  contactName: '',
  contactRole: '',
  contactEmail: '',
  contactWhatsapp: '',
  fracturaIdentificada: '',
  stage: 'generacion',
  assignedTo: '',
  montoAcordado: '',
}

function Field({ form, setForm, field, label, placeholder, type = 'text', required }) {
  return (
    <div>
      <label className={labelClass} style={labelStyle}>
        {label} {required && <span style={{ color: '#B8860B' }}>*</span>}
      </label>
      <input
        type={type}
        value={form[field]}
        onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
        placeholder={placeholder}
        className={inputClass}
      />
    </div>
  )
}

export default function NewClientModal({ users, actorName, onClose, onCreated }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(INITIAL)
  const [creating, setCreating] = useState(false)

  const canAdvance =
    (step === 1 && form.name.trim()) ||
    (step === 2 && form.contactName.trim() && form.contactRole.trim()) ||
    (step === 3 && form.stage && form.assignedTo)

  const handleCreate = async () => {
    setCreating(true)
    try {
      const id = await createClient(
        {
          name: form.name.trim(),
          industria: form.industria,
          revenueEstimado: Number(form.revenueEstimado) || null,
          website: form.website,
          linkedin: form.linkedin,
          contactName: form.contactName.trim(),
          contactRole: form.contactRole.trim(),
          contactEmail: form.contactEmail,
          contactWhatsapp: form.contactWhatsapp,
          fracturaIdentificada: form.fracturaIdentificada,
          stage: form.stage,
          assignedTo: form.assignedTo,
          montoAcordado: Number(form.montoAcordado) || null,
          pago1: { status: 'Pendiente' },
          pago2: { status: 'Pendiente' },
        },
        actorName
      )
      onCreated(id)
    } finally {
      setCreating(false)
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
        className="ador-modal-surface ador-grain w-[440px] rounded-[28px] p-8"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-[#F5F5F5]">Nuevo SPC</h2>
          <span className="text-[12px] text-[#888888]">Paso {step} de 3</span>
        </div>
        <div className="mt-3 flex gap-1.5">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className="h-1 flex-1 rounded-full"
              style={{ background: s <= step ? '#1E5FAD' : 'rgba(255,255,255,0.08)' }}
            />
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-4">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col gap-4"
              >
                <Field form={form} setForm={setForm} field="name" label="Nombre de la organización" required placeholder="Nombre de la empresa" />
                <Field form={form} setForm={setForm} field="industria" label="Industria" placeholder="Retail, Fintech..." />
                <Field form={form} setForm={setForm} field="revenueEstimado" label="Revenue estimado (soles)" type="number" placeholder="0" />
                <div className="grid grid-cols-2 gap-3">
                  <Field form={form} setForm={setForm} field="website" label="Website" placeholder="empresa.com" />
                  <Field form={form} setForm={setForm} field="linkedin" label="LinkedIn" placeholder="linkedin.com/..." />
                </div>
              </motion.div>
            )}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col gap-4"
              >
                <Field form={form} setForm={setForm} field="contactName" label="Nombre" required placeholder="Nombre completo" />
                <Field form={form} setForm={setForm} field="contactRole" label="Cargo" required placeholder="CEO, Founder..." />
                <Field form={form} setForm={setForm} field="contactEmail" label="Email" placeholder="correo@empresa.com" />
                <Field form={form} setForm={setForm} field="contactWhatsapp" label="WhatsApp" placeholder="+51 999 999 999" />
              </motion.div>
            )}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col gap-4"
              >
                <div>
                  <label className={labelClass} style={labelStyle}>
                    Fractura inicial
                  </label>
                  <textarea
                    value={form.fracturaIdentificada}
                    onChange={(e) => setForm((f) => ({ ...f, fracturaIdentificada: e.target.value }))}
                    rows={3}
                    placeholder="¿Qué problema detectamos inicialmente?"
                    className={`${inputClass} resize-none`}
                  />
                </div>
                <div>
                  <label className={labelClass} style={labelStyle}>
                    Etapa inicial <span style={{ color: '#B8860B' }}>*</span>
                  </label>
                  <select
                    value={form.stage}
                    onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value }))}
                    className={inputClass}
                  >
                    {STAGES.filter((s) => s.type === 'SPC').map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass} style={labelStyle}>
                    Asociado responsable <span style={{ color: '#B8860B' }}>*</span>
                  </label>
                  <select
                    value={form.assignedTo}
                    onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))}
                    className={inputClass}
                  >
                    <option value="">Selecciona...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.displayName || u.email}
                      </option>
                    ))}
                  </select>
                </div>
                <Field form={form} setForm={setForm} field="montoAcordado" label="Monto acordado (soles)" type="number" placeholder="Opcional" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-7 flex justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="rounded-xl px-4 py-2 text-[13px] text-[#888888] transition-colors hover:text-[#F5F5F5]"
            >
              Atrás
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-[13px] text-[#888888] transition-colors hover:text-[#F5F5F5]"
            >
              Cancelar
            </button>
          )}

          {step < 3 ? (
            <motion.button
              type="button"
              disabled={!canAdvance}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => setStep((s) => s + 1)}
              className="ador-btn-primary rounded-xl px-5 py-2 text-[13px] font-medium disabled:opacity-40"
            >
              Siguiente
            </motion.button>
          ) : (
            <motion.button
              type="button"
              disabled={!canAdvance || creating}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleCreate}
              className="ador-btn-primary rounded-xl px-5 py-2 text-[13px] font-medium disabled:opacity-40"
            >
              {creating ? 'Creando…' : 'Crear SPC'}
            </motion.button>
          )}
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}
