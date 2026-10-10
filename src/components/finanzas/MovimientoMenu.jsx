import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { updateExpense, deleteExpense, updateManualIncome, deleteManualIncome } from '../../lib/firestore'
import { EXPENSE_CATEGORIES } from '../../lib/finance'
import { withTimeout } from '../../lib/workspace'
import { useToast } from '../../hooks/useToast'
import { SPRING } from '../../lib/motion'

// Right-click (or the ⋯ button) on a row of Movimientos: edit or delete it.
// Only manual entries can change here; income that comes from a client's
// payment is edited in Clientes → Pagos, so its menu just points there.
// Portaled at the cursor (CLAUDE.md §1), clamped to the viewport.
function Item({ label, onClick, danger, hint }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors hover:bg-white/[0.07]"
      style={{ color: danger ? '#EF5350' : '#E8E8E8' }}
    >
      {label}
      {hint && <span className="text-[11px] text-[#888888]">{hint}</span>}
    </button>
  )
}

export function MovimientoMenu({ movement, x, y, onClose, onEdit, onOpenClient }) {
  const showToast = useToast()
  const ref = useRef(null)
  const [pos, setPos] = useState({ left: x, top: y })
  const [confirming, setConfirming] = useState(false)
  const fromClient = movement.type === 'ingreso' && movement.source === 'client'

  useLayoutEffect(() => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    setPos({ left: Math.max(8, Math.min(x, window.innerWidth - r.width - 8)), top: Math.max(8, Math.min(y, window.innerHeight - r.height - 8)) })
  }, [x, y])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onClose, true)
    window.addEventListener('resize', onClose)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onClose, true)
      window.removeEventListener('resize', onClose)
    }
  }, [onClose])

  const remove = async () => {
    onClose()
    try {
      await withTimeout(movement.type === 'gasto' ? deleteExpense(movement.id) : deleteManualIncome(movement.id))
      showToast('Movimiento eliminado.')
    } catch (e) {
      showToast(`No se pudo eliminar: ${e.message}`)
    }
  }

  const label = movement.type === 'ingreso' ? movement.name : movement.description

  return createPortal(
    <>
      <div className="fixed inset-0 z-[998]" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose() }} />
      <motion.div
        ref={ref}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.12, ease: 'easeOut' }}
        className="fixed z-[999] w-[230px]"
        style={{ left: pos.left, top: pos.top, transformOrigin: 'top left' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ador-glass ador-grain rounded-xl p-1.5">
          <p className="truncate px-2.5 pb-1 pt-1.5 text-[12.5px] font-medium text-[#F5F5F5]">{label}</p>
          <div className="my-1 h-px bg-white/[0.08]" />
          {fromClient ? (
            <>
              <p className="px-2.5 py-1.5 text-[11.5px] leading-snug text-[#767676]">Este ingreso viene del pago de un cliente. Se edita en Clientes → Pagos.</p>
              <Item label="Abrir clientes" onClick={() => { onClose(); onOpenClient?.() }} />
            </>
          ) : (
            <>
              <Item label="Editar…" onClick={() => { onClose(); onEdit(movement) }} />
              {confirming ? (
                <Item label="Confirmar: eliminar" danger onClick={remove} />
              ) : (
                <Item label="Eliminar" danger onClick={() => setConfirming(true)} />
              )}
            </>
          )}
        </div>
      </motion.div>
    </>,
    document.body
  )
}

const inputClass =
  'w-full rounded-xl border border-white/[0.08] bg-[#1A1A1A] px-3.5 py-[10px] text-[13px] text-[#F5F5F5] outline-none transition-colors duration-150 focus:border-white/[0.2]'
const labelClass = 'mb-1.5 block text-[11px] font-medium uppercase tracking-[0.06em] text-[#767676]'

export function EditMovimientoModal({ movement, onClose }) {
  const isExpense = movement.type === 'gasto'
  const [description, setDescription] = useState((isExpense ? movement.description : movement.name) || '')
  const [category, setCategory] = useState(movement.category || EXPENSE_CATEGORIES[0])
  const [amount, setAmount] = useState(String(movement.amount ?? ''))
  const [date, setDate] = useState(movement.date || '')
  const [notes, setNotes] = useState(movement.notes || '')
  const [saving, setSaving] = useState(false)
  const showToast = useToast()
  const canSave = description.trim() && Number(amount) > 0 && date

  const save = async () => {
    setSaving(true)
    try {
      const base = { description: description.trim(), amount: Number(amount), date }
      await withTimeout(isExpense ? updateExpense(movement.id, { ...base, category, notes: notes.trim() }) : updateManualIncome(movement.id, base))
      showToast('Movimiento actualizado.')
      onClose()
    } catch (e) {
      showToast(`No se pudo guardar: ${e.message}`)
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
        transition={SPRING}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[420px] px-4"
      >
        <div className="ador-modal-surface ador-grain rounded-[24px] p-7">
          <h2 className="text-[17px] font-semibold text-[#F5F5F5]">{isExpense ? 'Editar gasto' : 'Editar ingreso'}</h2>
          <div className="mt-5 space-y-4">
            <div>
              <label className={labelClass}>Descripción</label>
              <input className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            {isExpense && (
              <div>
                <label className={labelClass}>Categoría</label>
                <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)}>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Monto (S/)</label>
                <input className={inputClass} type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Fecha</label>
                <input className={inputClass} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>
            {isExpense && (
              <div>
                <label className={labelClass}>Notas</label>
                <textarea className={`${inputClass} resize-none`} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            )}
          </div>
          <div className="mt-6 flex justify-end gap-2.5">
            <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-[13px] text-[#B5B5B5] transition-colors hover:text-[#F5F5F5]">
              Cancelar
            </button>
            <button type="button" disabled={!canSave || saving} onClick={save} className="ador-btn-primary rounded-full px-5 py-2 text-[13px] font-medium disabled:opacity-40">
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}
