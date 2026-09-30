import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { addExpense, createFinanceRecurring } from '../../lib/firestore'
import { EXPENSE_CATEGORIES, RECURRING_FREQUENCIES, advanceRecurringDate } from '../../lib/finance'
import { useToast } from '../../hooks/useToast'
import { UploadIcon, FileIcon } from '../icons'
import { useDrivePicker } from '../../hooks/useDrivePicker'
import { driveFileKind } from '../../lib/googleDrive'
import { SPRING } from '../../lib/motion'

const labelClass = 'mb-1.5 block font-medium text-[#444444]'
const labelStyle = { fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }
const inputClass =
  'w-full rounded-xl border border-white/[0.08] bg-[#1A1A1A] px-3.5 py-[10px] text-[13px] text-[#F5F5F5] placeholder:text-[#444444] outline-none transition-colors duration-150 focus:border-white/[0.2]'

export default function AddExpenseModal({ actorName, onClose }) {
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0])
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [receipt, setReceipt] = useState(null)
  const [notes, setNotes] = useState('')
  const [repeat, setRepeat] = useState('none')
  const [saving, setSaving] = useState(false)
  const showToast = useToast()
  // The receipt itself lives in Google Drive; the expense keeps its link.
  const drive = useDrivePicker('finanzas')
  const pickReceipt = async () => {
    const [file] = await drive.pick({ title: 'Comprobante del gasto' })
    if (file) setReceipt(file)
  }

  const canSave = description.trim() && Number(amount) > 0 && date

  const handleSave = async () => {
    setSaving(true)
    try {
      // A repeating expense: the template first (its nextDate is the one after
      // this date), then today's entry linked to it.
      let recurringId = null
      if (repeat !== 'none') {
        const anchorDay = Number(date.slice(8))
        const ref = await createFinanceRecurring({ kind: 'gasto', category, description: description.trim(), amount: Number(amount), frequency: repeat, anchorDay, nextDate: advanceRecurringDate(date, repeat, anchorDay) }, actorName)
        recurringId = ref.id
      }
      await addExpense(
        {
          ...(recurringId ? { recurringId } : {}),
          category,
          description: description.trim(),
          amount: Number(amount),
          date,
          receipt: receipt ? { name: receipt.name, type: driveFileKind(receipt.mimeType), url: receipt.url, fileId: receipt.fileId } : null,
          notes: notes.trim(),
        },
        actorName
      )
      showToast('Gasto registrado correctamente.')
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
        transition={SPRING}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ador-modal-surface ador-grain w-[420px] rounded-[28px] p-8">
        <h2 className="text-[15px] font-semibold text-[#F5F5F5]">Nuevo Gasto</h2>

        <div className="mt-6 flex flex-col gap-4">
          <div>
            <label className={labelClass} style={labelStyle}>
              Categoría <span style={{ color: '#B8860B' }}>*</span>
            </label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} style={labelStyle}>
              Descripción <span style={{ color: '#B8860B' }}>*</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="¿En qué se gastó?"
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
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass} style={labelStyle}>
              Repetir
            </label>
            <select value={repeat} onChange={(e) => setRepeat(e.target.value)} className={inputClass}>
              <option value="none">No se repite</option>
              {RECURRING_FREQUENCIES.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
            {repeat !== 'none' && (
              <p className="mt-1 text-[11px] text-[#555555]">
                Se registra hoy y volverá a registrarse solo {RECURRING_FREQUENCIES.find((f) => f.id === repeat).label.toLowerCase()}, el día {Number(date.slice(8))}. Lo gestionas desde “Recurrentes”.
              </p>
            )}
          </div>
          <div>
            <label className={labelClass} style={labelStyle}>
              Comprobante
            </label>
            {receipt ? (
              <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#1A1A1A] px-3.5 py-[10px]">
                <FileIcon size={16} style={{ color: '#888888' }} />
                <a href={receipt.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-[13px] text-[#F5F5F5] hover:underline">
                  {receipt.name}
                </a>
                <button type="button" onClick={() => setReceipt(null)} className="text-[12px] text-[#888888] hover:text-[#F5F5F5]">
                  Quitar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={pickReceipt}
                disabled={drive.busy}
                className="flex w-full items-center gap-2 rounded-xl border border-dashed border-white/[0.12] px-3.5 py-[10px] text-left text-[13px] text-[#888888] transition-colors duration-150 hover:border-white/[0.2] disabled:opacity-60"
              >
                <UploadIcon size={15} />
                {drive.busy ? 'Abriendo Google Drive…' : 'Adjuntar desde Google Drive (PDF o foto)'}
              </button>
            )}
            <p className="mt-1 text-[11px] text-[#555555]">El comprobante queda en el Drive de la empresa; aquí se guarda el enlace.</p>
            {drive.prompt}
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
            Registrar Gasto
          </button>
        </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}
