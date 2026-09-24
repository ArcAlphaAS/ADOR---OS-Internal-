import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { currencyPEN } from '../../lib/clientStages'
import { EXPENSE_CATEGORIES } from '../../lib/finance'
import { CloseIcon, ArrowRightIcon } from '../icons'
import { SHEET, swipeToClose } from '../../lib/motion'

// Slide-in drill-down for the two clickable Salud Financiera metrics — same
// portal + transform-split pattern as every other panel in the app
// (CLAUDE.md §11: the outer motion.div owns the transform, the inner div
// owns .ador-modal-surface's backdrop-filter). Direct request that
// important numbers be actionable ("ver → entender → actuar"), not just
// visible — this is the "entender" step. The real "actuar" step (marcar un
// pago como recibido) already exists for real in Clientes' Ficha → Pagos
// tab, so "Por cobrar" rows deep-link there via onNavigate instead of
// duplicating that UI here.
export default function FinanceDetailPanel({ mode, pendingPayments, categoryTotals, monthlyBurnRate, cashBalance, onNavigate, onClose }) {
  if (!mode) return null

  const title = mode === 'porCobrar' ? 'Por cobrar' : '¿Qué está consumiendo caja?'
  const sortedCategories = EXPENSE_CATEGORIES.filter((c) => categoryTotals.has(c)).sort((a, b) => categoryTotals.get(b) - categoryTotals.get(a))

  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
      <motion.div
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 40, opacity: 0 }}
        transition={SHEET}
        {...swipeToClose('x', onClose)}
        onClick={(e) => e.stopPropagation()}
        className="fixed right-0 top-0 h-full w-full max-w-[420px]"
      >
        <div className="ador-modal-surface ador-grain flex h-full flex-col overflow-y-auto p-7">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-[#F5F5F5]">{title}</h2>
            <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-[#888888] transition-colors duration-150 hover:bg-white/[0.06] hover:text-[#F5F5F5]">
              <CloseIcon size={16} />
            </button>
          </div>

          {mode === 'porCobrar' ? (
            pendingPayments.length === 0 ? (
              <p className="mt-6 text-[13px] text-[#444444]">Nada pendiente de cobro.</p>
            ) : (
              <div className="mt-5 flex flex-col divide-y divide-white/[0.06]">
                {pendingPayments.map((p) => (
                  <button
                    key={`${p.clientId}-${p.label}`}
                    type="button"
                    onClick={() => onNavigate?.('clientes', { type: 'client', id: p.clientId })}
                    className="flex items-center justify-between gap-3 py-3.5 text-left transition-opacity duration-150 hover:opacity-80"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-medium text-[#F5F5F5]">{p.clientName}</p>
                      <p className="truncate text-[11.5px] text-[#888888]">
                        {p.label}
                        {p.date ? ` · vence ${p.date}` : ' · sin fecha'}
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-1.5">
                      <span className="text-[13.5px] font-semibold text-[#B8860B]">{currencyPEN.format(p.amount)}</span>
                      <ArrowRightIcon size={13} className="text-[#444444]" />
                    </div>
                  </button>
                ))}
              </div>
            )
          ) : (
            <div className="mt-5 flex flex-col gap-5">
              <div className="ador-glass rounded-2xl px-4 py-3.5">
                <p className="text-[12px] text-[#888888]">Quema promedio mensual</p>
                <p className="mt-0.5 text-[20px] font-semibold text-[#F5F5F5]">{currencyPEN.format(monthlyBurnRate)}</p>
                <p className="mt-0.5 text-[11px] text-[#666666]">promedio de los últimos 3 meses completos</p>
              </div>

              <div>
                <p className="mb-2 font-medium text-[#444444]" style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Gastos recurrentes — este mes
                </p>
                {sortedCategories.length === 0 ? (
                  <p className="text-[12.5px] text-[#444444]">Sin gastos registrados este mes.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {sortedCategories.map((c) => (
                      <div key={c} className="flex items-center justify-between text-[13px]">
                        <span className="text-[#888888]">{c}</span>
                        <span className="font-medium text-[#F5F5F5]">{currencyPEN.format(categoryTotals.get(c))}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="mb-2 font-medium text-[#444444]" style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Próximos compromisos e ingresos
                </p>
                {pendingPayments.length === 0 ? (
                  <p className="text-[12.5px] text-[#444444]">Sin cobros pendientes programados.</p>
                ) : (
                  <div className="flex flex-col divide-y divide-white/[0.06]">
                    {pendingPayments.slice(0, 5).map((p) => (
                      <div key={`${p.clientId}-${p.label}`} className="flex items-center justify-between py-2 text-[12.5px]">
                        <span className="min-w-0 truncate text-[#888888]">
                          {p.clientName} · {p.date || 'sin fecha'}
                        </span>
                        <span className="flex-shrink-0 font-medium text-[#4CAF50]">+{currencyPEN.format(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <p className="text-[11px] text-[#444444]">Caja actual: {currencyPEN.format(cashBalance)}. Ajustable en la tarjeta de Proyección.</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}
