import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useFinanceData } from '../../hooks/useFinanceData'
import MetricCards from './MetricCards'
import FinancialHealthCard from './FinancialHealthCard'
import FinanceChart from './FinanceChart'
import MovimientosTable from './MovimientosTable'
import QuarterlyGoalCard from './QuarterlyGoalCard'
import RunwayCard from './RunwayCard'
import CategoryBreakdownCard from './CategoryBreakdownCard'
import NextPaymentCard from './NextPaymentCard'
import AddIncomeModal from './AddIncomeModal'
import AddExpenseModal from './AddExpenseModal'

function actorNameFor(user) {
  return user?.displayName || user?.email?.split('@')[0] || 'Usuario'
}

export default function FinanzasModule({ user }) {
  const data = useFinanceData()
  const [modal, setModal] = useState(null) // null | 'ingreso' | 'gasto'

  const actorName = actorNameFor(user)

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
          <p className="text-[13px] text-[#888888]">El cerebro financiero de ADOR — solo lo que cambia una decisión.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setModal('ingreso')}
            className="rounded-full border px-4 py-2 text-[13px] font-medium transition-colors duration-150 hover:bg-[#1E5FAD]/10"
            style={{ borderColor: '#1E5FAD', color: '#1E5FAD' }}
          >
            + Ingreso Manual
          </button>
          <button
            type="button"
            onClick={() => setModal('gasto')}
            className="ador-btn-primary rounded-full px-4 py-2 text-[13px] font-medium"
          >
            + Gasto
          </button>
        </div>
      </div>

      <FinancialHealthCard
        runwayMonths={data.runwayMonths}
        margenNetoPct={data.margenNetoPct}
        topClientConcentrationPct={data.topClientConcentrationPct}
        topClientName={data.topClientName}
        overdueAmount={data.overdueAmount}
        overdueCount={data.overdueCount}
      />

      <div className="mt-6 flex gap-6">
        <div className="flex w-[68%] flex-col gap-6">
          <MetricCards
            ingresosDelMes={data.ingresosDelMes}
            gastosDelMes={data.gastosDelMes}
            utilidadNeta={data.utilidadNeta}
            ingresosDeltaPct={data.ingresosDeltaPct}
            gastosDeltaPct={data.gastosDeltaPct}
          />
          <FinanceChart series={data.series} />
          <MovimientosTable movements={data.movements} />
        </div>

        <div className="flex w-[32%] flex-col gap-5">
          <QuarterlyGoalCard quarterKey={data.quarterKey} target={data.quarterlyTarget} recaudado={data.recaudadoTrimestre} />
          <RunwayCard
            cashBalance={data.cashBalance}
            monthlyBurnRate={data.monthlyBurnRate}
            projectedIn30={data.projectedIn30}
            projectedIn60={data.projectedIn60}
          />
          <CategoryBreakdownCard categoryTotals={data.categoryTotals} />
          <NextPaymentCard payment={data.nextPayment} />
        </div>
      </div>

      <AnimatePresence>
        {modal === 'ingreso' && (
          <AddIncomeModal key="add-income" clients={data.clients} actorName={actorName} onClose={() => setModal(null)} />
        )}
        {modal === 'gasto' && <AddExpenseModal key="add-expense" actorName={actorName} onClose={() => setModal(null)} />}
      </AnimatePresence>
    </motion.div>
  )
}
