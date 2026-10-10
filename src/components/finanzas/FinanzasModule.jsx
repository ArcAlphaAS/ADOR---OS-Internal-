import { useEffect, useState } from 'react'
import { subscribeFinanceRecurring } from '../../lib/firestore'
import RecurrentesCard from './RecurrentesCard'
import { motion, AnimatePresence } from 'framer-motion'
import { useFinanceData } from '../../hooks/useFinanceData'
import SituacionActualCard from './SituacionActualCard'
import FinanceHero from './FinanceHero'
import ProximosCobrosCard from './ProximosCobrosCard'
import RequiereAtencion from './RequiereAtencion'
import FinanceDetailPanel from './FinanceDetailPanel'
import FinanceChart from './FinanceChart'
import MovimientosTable from './MovimientosTable'
import MetasCard from './MetasCard'
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
  const [recurring, setRecurring] = useState([])
  useEffect(() => subscribeFinanceRecurring(setRecurring), [])

  const actorName = actorNameFor(user)
  const currentMonthLabel = new Date().toLocaleDateString('es', { month: 'long', year: 'numeric' })

  return (
    <motion.div
      initial={false}
      className="mx-auto max-w-[1480px] px-4 pb-16 pt-6 md:px-8 lg:px-12 lg:pt-10"
    >
      <div className="mb-8">
        <h1 className="ador-title">Finanzas</h1>
        <p className="text-[13px] text-[#888888]">El estado financiero de ADOR, reducido a lo que importa.</p>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2 xl:grid-cols-3 xl:gap-8">
        <div className="flex flex-col gap-6 xl:gap-8">
          <FinanceHero
            cashBalance={data.cashBalance}
            runwayMonths={data.runwayMonths}
            margenNetoPct={data.margenNetoPct}
            totalPorCobrar={data.totalPorCobrar}
            porCobrarClientCount={data.porCobrarClientCount}
            estado={data.estadoSalud}
            onOpenPorCobrar={() => setDetailMode('porCobrar')}
            onOpenRunway={() => setDetailMode('runway')}
            onIngreso={() => setModal('ingreso')}
            onGasto={() => setModal('gasto')}
          />
          <RunwayCard
            cashBalance={data.cashBalance}
            monthlyBurnRate={data.monthlyBurnRate}
            projectedIn30={data.projectedIn30}
            projectedIn90={data.projectedIn90}
            inflowIn30={data.inflowIn30}
            inflowIn90={data.inflowIn90}
          />
          <MetasCard
            quarterKey={data.quarterKey}
            quarterlyTarget={data.quarterlyTarget}
            recaudadoTrimestre={data.recaudadoTrimestre}
            annualTarget={data.annualTarget}
            recaudadoAnual={data.recaudadoAnual}
            currentYear={data.currentYear}
          />
        </div>

        <div className="flex flex-col gap-6 xl:gap-8">
          <SituacionActualCard
            monthLabel={currentMonthLabel.charAt(0).toUpperCase() + currentMonthLabel.slice(1)}
            ingresosDelMes={data.ingresosDelMes}
            gastosDelMes={data.gastosDelMes}
            utilidadNeta={data.utilidadNeta}
            resultDeltaPct={data.resultDeltaPct}
            series={data.series}
          />
          <FinanceChart series={data.series} />
          <CategoryBreakdownCard categoryTotals={data.categoryTotals} />
        </div>

        <div className="flex flex-col gap-6 lg:col-span-2 xl:col-span-1 xl:gap-8">
          <RequiereAtencion
            runwayMonths={data.runwayMonths}
            totalPorCobrar={data.totalPorCobrar}
            porCobrarClientCount={data.porCobrarClientCount}
            overdueCount={data.overdueCount}
            categorySpikes={data.categorySpikes}
            onOpenRunway={() => setDetailMode('runway')}
            onOpenPorCobrar={() => setDetailMode('porCobrar')}
          />
          <ProximosCobrosCard pendingPayments={data.pendingPayments} onOpen={() => setDetailMode('porCobrar')} />
          <RecurrentesCard templates={recurring} />
        </div>
      </div>

      <div className="mt-6 xl:mt-8">
        <MovimientosTable movements={data.movements} onNavigate={onNavigate} />
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
