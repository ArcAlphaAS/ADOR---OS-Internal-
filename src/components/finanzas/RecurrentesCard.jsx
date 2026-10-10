import { useState } from 'react'
import { updateFinanceRecurring, deleteFinanceRecurring } from '../../lib/firestore'
import { currencyPEN } from '../../lib/clientStages'
import { frequencyLabel } from '../../lib/finance'
import { withTimeout } from '../../lib/workspace'
import { useToast } from '../../hooks/useToast'

// Gastos e ingresos que se repiten (suscripciones, hosting, sueldos…). Se
// crean con "Repetir" al registrar un gasto o ingreso; ADOR OS registra solo
// cada ocurrencia cuando llega su fecha (materializeFinanceRecurring). Aquí se
// pausan o se borran — borrar una plantilla no toca lo ya registrado.
function shortDate(key) {
  return new Date(`${key}T00:00:00`).toLocaleDateString('es', { day: 'numeric', month: 'short' }).replace('.', '')
}

export default function RecurrentesCard({ templates }) {
  const showToast = useToast()
  const [confirmDelete, setConfirmDelete] = useState(null)
  if (!templates.length) return null
  const sorted = [...templates].sort((a, b) => (a.nextDate || '').localeCompare(b.nextDate || ''))
  const monthly = templates.filter((t) => t.active && t.kind === 'gasto').reduce((sum, t) => sum + t.amount / ({ monthly: 1, quarterly: 3, yearly: 12 }[t.frequency] || 1), 0)

  const run = (promise) => withTimeout(promise).catch((e) => showToast(`No se pudo guardar: ${e.message}`))

  return (
    <div className="ador-glass ador-grain rounded-[24px] px-7 py-6">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#8A8A8A]">Recurrentes</h3>
        {monthly > 0 && <span className="text-[11.5px] text-[#888888]">≈ {currencyPEN.format(monthly)} al mes en gastos</span>}
      </div>
      <div className="mt-3 flex flex-col divide-y divide-white/[0.06]">
        {sorted.map((t) => (
          <div key={t.id} className="flex items-center gap-2 py-2.5" style={{ opacity: t.active ? 1 : 0.5 }}>
            <span className="text-[13px]" style={{ color: t.kind === 'gasto' ? '#EF8A88' : '#8FD19A' }}>{t.kind === 'gasto' ? '−' : '+'}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] text-[#F0F0F0]">{t.description}</p>
              <p className="text-[11px] text-[#777777]">
                {currencyPEN.format(t.amount)} · {frequencyLabel(t.frequency).toLowerCase()} · {t.active ? `próximo ${t.nextDate ? shortDate(t.nextDate) : '—'}` : 'en pausa'}
              </p>
            </div>
            <button type="button" onClick={() => run(updateFinanceRecurring(t.id, { active: !t.active }))} className="text-[11.5px] text-[#999999] hover:text-[#F5F5F5]">
              {t.active ? 'Pausar' : 'Reanudar'}
            </button>
            <button
              type="button"
              onClick={() => (confirmDelete === t.id ? (setConfirmDelete(null), run(deleteFinanceRecurring(t.id))) : setConfirmDelete(t.id))}
              onBlur={() => setConfirmDelete(null)}
              className="text-[11.5px]"
              style={{ color: confirmDelete === t.id ? '#EF5350' : '#777777' }}
            >
              {confirmDelete === t.id ? '¿Seguro?' : 'Borrar'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
