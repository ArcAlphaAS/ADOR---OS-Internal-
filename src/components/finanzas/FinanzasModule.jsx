import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useFinanceData } from '../../hooks/useFinanceData'
import SituacionActualCard from './SituacionActualCard'
import FinancialHealthCard from './FinancialHealthCard'
import RequiereAtencion from './RequiereAtencion'
import FinanceDetailPanel from './FinanceDetailPanel'
import FinanceChart from './FinanceChart'
import MovimientosTable from './MovimientosTable'
import QuarterlyGoalCard from './QuarterlyGoalCard'
import RunwayCard from './RunwayCard'
import CategoryBreakdownCard from './CategoryBreakdownCard'
import AddIncomeModal from './AddIncomeModal'
import AddExpenseModal from './AddExpenseModal'

function actorNameFor(user) {
  return user?.displayName || user?.email?.split('@')[0] || 'Usuario'
}

// Redesigned 2026-09-18 from a detailed functional spec: every important
// number here should be actionable ("ver → entender → actuar"), not just
// displayed — Finanzas should read as "así está ADOR, esto está cambiando,
// esto requiere tu atención," not a generic metrics dashboard. See
// CLAUDE.md for the full reasoning on what changed and why.
export default function FinanzasModule({ user, onNavigate }) {
  const data = useFinanceData()
  const [modal, setModal] = useState(null) // null | 'ingreso' | 'gasto'
  const [detailMode, setDetailMode] = useState(null) // null | 'porCobrar' | 'runway'

  const actorName = actorNameFor(user)
  const currentMonthLabel = new Date().toLocaleDateString('es', { month: 'long', year: 'numeric' })

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="mx-auto max-w-[1400px] px-8 py-8"
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-[#F5F5F5]">Finanzas</h1>
          <p className="text-[13px] text-[#888888]">El estado financiero de ADOR, reducido a lo que importa.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setModal('ingreso')}
            className="rounded-full border px-4 py-2 text-[13px] font-medium transition-colors duration-150 hover:bg-[#1E5FAD]/10"
            style={{ borderColor: '#1E5FAD', color: '#1E5FAD' }}
          >
            + Ingreso
          </button>
          <button type="button" onClick={() => setModal('gasto')} className="ador-btn-primary rounded-full px-4 py-2 text-[13px] font-medium">
            + Gasto
          </button>
        </div>
      </div>

      <FinancialHealthCard
        cashBalance={data.cashBalance}
        runwayMonths={data.runwayMonths}
        margenNetoPct={data.margenNetoPct}
        totalPorCobrar={data.totalPorCobrar}
        porCobrarClientCount={data.porCobrarClientCount}
        onOpenPorCobrar={() => setDetailMode('porCobrar')}
        onOpenRunway={() => setDetailMode('runway')}
      />

      <div className="mt-6 flex gap-6">
        <div className="flex w-[66%] flex-col gap-6">
          <SituacionActualCard
            monthLabel={currentMonthLabel.charAt(0).toUpperCase() + currentMonthLabel.slice(1)}
            ingresosDelMes={data.ingresosDelMes}
            gastosDelMes={data.gastosDelMes}
            utilidadNeta={data.utilidadNeta}
            resultDeltaPct={data.resultDeltaPct}
          />
          <FinanceChart series={data.series} />
          <MovimientosTable movements={data.movements} />
        </div>

        <div className="flex w-[34%] flex-col gap-5">
          <RequiereAtencion
            runwayMonths={data.runwayMonths}
            totalPorCobrar={data.totalPorCobrar}
            porCobrarClientCount={data.porCobrarClientCount}
            overdueCount={data.overdueCount}
            categorySpikes={data.categorySpikes}
            onOpenRunway={() => setDetailMode('runway')}
            onOpenPorCobrar={() => setDetailMode('porCobrar')}
          />
          <RunwayCard
            cashBalance={data.cashBalance}
            monthlyBurnRate={data.monthlyBurnRate}
            projectedIn30={data.projectedIn30}
            projectedIn90={data.projectedIn90}
            inflowIn30={data.inflowIn30}
            inflowIn90={data.inflowIn90}
          />
          <CategoryBreakdownCard categoryTotals={data.categoryTotals} />
          <QuarterlyGoalCard quarterKey={data.quarterKey} target={data.quarterlyTarget} recaudado={data.recaudadoTrimestre} />
        </div>
      </div>

      <AnimatePresence>
        {detailMode && (
          <FinanceDetailPanel
            key="finance-detail"
            mode={detailMode}
            pendingPayments={data.pendingPayments}
            categoryTotals={data.categoryTotals}
            monthlyBurnRate={data.monthlyBurnRate}
            cashBalance={data.cashBalance}
            onNavigate={onNavigate}
            onClose={() => setDetailMode(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modal === 'ingreso' && (
          <AddIncomeModal key="add-income" clients={data.clients} actorName={actorName} onClose={() => setModal(null)} />
        )}
        {modal === 'gasto' && <AddExpenseModal key="add-expense" actorName={actorName} onClose={() => setModal(null)} />}
      </AnimatePresence>
    </motion.div>
  )
}
