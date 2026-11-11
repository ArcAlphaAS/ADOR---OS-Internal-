import { PageSkeleton, DesktopSkeleton } from '../common/CardSkeleton'
import { useEffect, useState } from 'react'
import { subscribeFinanceRecurring } from '../../lib/firestore'
import RecurrentesCard from './RecurrentesCard'
import { motion, AnimatePresence } from 'framer-motion'
import { useFinanceData } from '../../hooks/useFinanceData'
import SituacionActualCard from './SituacionActualCard'
import FinanceHero from './FinanceHero'
import ProximosCobrosCard from './ProximosCobrosCard'
import { PanoramaDireccionCard, IngresoRecurrenteCard, AntiguedadCobrosCard, IngresosPorClienteCard } from './FinanceInsights'
import RequiereAtencion from './RequiereAtencion'
import FinanceDetailPanel from './FinanceDetailPanel'
import FinanceChart from './FinanceChart'
import MovimientosTable from './MovimientosTable'
import MetasCard from './MetasCard'
import RunwayCard from './RunwayCard'
import CategoryBreakdownCard from './CategoryBreakdownCard'
import AddIncomeModal from './AddIncomeModal'
import AddExpenseModal from './AddExpenseModal'
import PhoneFinanzas from './PhoneFinanzas'
import usePhone from '../../hooks/usePhone'
import { PERIODS, periodStats, monthlySeries, verdictSentence } from '../../lib/financePeriod'

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
  const phone = usePhone()
  const [modal, setModal] = useState(null) // null | 'ingreso' | 'gasto'
  const [detailMode, setDetailMode] = useState(null) // null | 'porCobrar' | 'runway'
  const [recurring, setRecurring] = useState([])
  useEffect(() => subscribeFinanceRecurring(setRecurring), [])

  const actorName = actorNameFor(user)
  const [period, setPeriod] = useState('mes')
  const [selectedMonth, setSelectedMonth] = useState(null)
  const [moreOpen, setMoreOpen] = useState(false)
  const stats = periodStats(data.movements, period)
  const chartSeries = period === 'anio' ? monthlySeries(data.movements, 'anio') : data.series
  const periodMovements = data.movements.filter((m) => (selectedMonth ? m.date.slice(0, 7) === selectedMonth : m.date >= stats.bounds.start && m.date <= stats.bounds.end))

  if (!data.loaded && !phone) return <DesktopSkeleton title="Finanzas" />

  return (
    <motion.div
      initial={false}
      className="mx-auto max-w-[1480px] px-4 pb-16 pt-6 md:px-8 lg:px-12 lg:pt-10"
    >
      {phone ? (
        <>
          <h1 className="ador-title mb-5">Finanzas</h1>
          {!data.loaded ? <PageSkeleton /> : <PhoneFinanzas data={data} onIngreso={() => setModal('ingreso')} onGasto={() => setModal('gasto')} onOpenPorCobrar={() => setDetailMode('porCobrar')} onOpenRunway={() => setDetailMode('runway')} />}
        </>
      ) : (
        <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="ador-title">Finanzas</h1>
          <p className="text-[13px] text-[#888888]">El estado financiero de ADOR, reducido a lo que importa.</p>
        </div>
        <div className="flex items-center gap-0.5 rounded-full bg-white/[0.06] p-0.5">
          {PERIODS.map((p) => (
            <button key={p.id} type="button" onClick={() => { setPeriod(p.id); setSelectedMonth(null) }} className="rounded-full px-4 py-1.5 text-[12.5px] font-medium transition-colors duration-150" style={{ background: period === p.id ? '#F5F5F5' : 'transparent', color: period === p.id ? '#0A0A0A' : '#8A8A8A' }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-[1.7fr_1fr] xl:gap-8">
        <FinanceHero
          cashBalance={data.cashBalance}
          runwayMonths={data.runwayMonths}
          margenNetoPct={data.margenNetoPct}
          totalPorCobrar={data.totalPorCobrar}
          porCobrarClientCount={data.porCobrarClientCount}
          estado={data.estadoSalud}
          sentence={verdictSentence(data)}
          onOpenPorCobrar={() => setDetailMode('porCobrar')}
          onOpenRunway={() => setDetailMode('runway')}
          onIngreso={() => setModal('ingreso')}
          onGasto={() => setModal('gasto')}
        />
        <RequiereAtencion
          runwayMonths={data.runwayMonths}
          totalPorCobrar={data.totalPorCobrar}
          porCobrarClientCount={data.porCobrarClientCount}
          overdueCount={data.overdueCount}
          categorySpikes={data.categorySpikes}
          onOpenRunway={() => setDetailMode('runway')}
          onOpenPorCobrar={() => setDetailMode('porCobrar')}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-2 xl:mt-8 xl:grid-cols-3 xl:gap-8">
        <SituacionActualCard
          monthLabel={stats.bounds.label}
          vsLabel={stats.bounds.prevLabel}
          ingresosDelMes={stats.ingresos}
          gastosDelMes={stats.gastos}
          utilidadNeta={stats.utilidad}
          resultDeltaPct={stats.resultDeltaPct}
          series={data.series}
        />
        <div className="lg:col-span-2 xl:col-span-1">
          <FinanceChart series={chartSeries} selectedMonth={selectedMonth} onSelectMonth={setSelectedMonth} />
        </div>
        <CategoryBreakdownCard categoryTotals={stats.categoryTotals} />
      </div>

      <div className="mt-6 xl:mt-8">
        <MovimientosTable movements={periodMovements} onNavigate={onNavigate} scopeLabel={selectedMonth ? 'mes elegido' : stats.bounds.label} monthFilter={selectedMonth} onClearMonth={() => setSelectedMonth(null)} />
      </div>

      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-2 xl:mt-8 xl:gap-8">
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

      <button type="button" onClick={() => setMoreOpen((v) => !v)} className="mx-auto mt-8 flex items-center gap-2 rounded-full bg-white/[0.06] px-5 py-2.5 text-[13px] font-medium text-[#D5D5D5] transition-colors hover:bg-white/[0.1]">
        {moreOpen ? 'Ocultar detalle' : 'Más detalle'}
        <span style={{ display: 'inline-block', transform: moreOpen ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }}>⌄</span>
      </button>
      <AnimatePresence initial={false}>
        {moreOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
            <div className="grid grid-cols-1 items-start gap-6 pt-6 lg:grid-cols-2 xl:grid-cols-3 xl:gap-8">
              <div className="flex flex-col gap-6 xl:gap-8">
                <IngresoRecurrenteCard clients={data.clients} onNavigate={onNavigate} />
                <RecurrentesCard templates={recurring} />
              </div>
              <div className="flex flex-col gap-6 xl:gap-8">
                <PanoramaDireccionCard clients={data.clients} monthlyBurnRate={data.monthlyBurnRate} quarterlyTarget={data.quarterlyTarget} recaudadoTrimestre={data.recaudadoTrimestre} totalPorCobrar={data.totalPorCobrar} inflowIn90={data.inflowIn90} />
                <IngresosPorClienteCard movements={data.movements} />
              </div>
              <div className="flex flex-col gap-6 lg:col-span-2 xl:col-span-1 xl:gap-8">
                <ProximosCobrosCard pendingPayments={data.pendingPayments} onOpen={() => setDetailMode('porCobrar')} />
                <AntiguedadCobrosCard pendingPayments={data.pendingPayments} onOpen={() => setDetailMode('porCobrar')} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

        </>
      )}

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
