import { useEffect, useState } from 'react'
import {
  subscribeClients,
  subscribeExpenses,
  subscribeManualIncomes,
  subscribeFinanceSettings,
} from '../lib/firestore'
import { quarterKey, isInQuarter } from '../lib/finance'

function sumByMonth(entries) {
  const map = new Map()
  for (const e of entries) {
    const monthKey = e.date.slice(0, 7)
    map.set(monthKey, (map.get(monthKey) || 0) + e.amount)
  }
  return map
}

// Ingresos are never entered as a flat monthly total — they're derived from
// real SP payment records (clients/{id}.pago1/pago2, see CLAUDE.md §7/§8)
// plus manual entries for income that doesn't route through a client. This
// mirrors Home's FinanceBlock so both surfaces read the same source of truth.
export function useFinanceData() {
  const [clients, setClients] = useState([])
  const [expenses, setExpenses] = useState([])
  const [manualIncomes, setManualIncomes] = useState([])
  const [settings, setSettings] = useState({})

  useEffect(() => subscribeClients(setClients), [])
  useEffect(() => subscribeExpenses(setExpenses), [])
  useEffect(() => subscribeManualIncomes(setManualIncomes), [])
  useEffect(() => subscribeFinanceSettings(setSettings), [])

  const clientIncomeEntries = []
  for (const client of clients) {
    for (const key of ['pago1', 'pago2']) {
      const payment = client[key]
      if (payment?.status === 'Recibido' && payment.date && payment.amount) {
        clientIncomeEntries.push({
          id: `${client.id}-${key}`,
          name: client.name,
          date: payment.date,
          amount: payment.amount,
          source: 'client',
        })
      }
    }
  }
  const manualIncomeEntries = manualIncomes
    .filter((i) => i.date && i.amount)
    .map((i) => ({
      id: i.id,
      name: i.description,
      date: i.date,
      amount: i.amount,
      source: 'manual',
      clientName: i.clientName,
    }))
  const allIncomes = [...clientIncomeEntries, ...manualIncomeEntries]
  const validExpenses = expenses.filter((e) => e.date && e.amount)

  const now = new Date()
  const monthKey = now.toISOString().slice(0, 7)
  const prevMonthKey = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7)

  const incomeByMonth = sumByMonth(allIncomes)
  const expenseByMonth = sumByMonth(validExpenses)

  const ingresosDelMes = incomeByMonth.get(monthKey) || 0
  const gastosDelMes = expenseByMonth.get(monthKey) || 0
  const ingresosMesAnterior = incomeByMonth.get(prevMonthKey) || 0
  const gastosMesAnterior = expenseByMonth.get(prevMonthKey) || 0

  const ingresosDeltaPct = ingresosMesAnterior
    ? ((ingresosDelMes - ingresosMesAnterior) / ingresosMesAnterior) * 100
    : null
  const gastosDeltaPct = gastosMesAnterior
    ? ((gastosDelMes - gastosMesAnterior) / gastosMesAnterior) * 100
    : null

  const utilidadNeta = ingresosDelMes - gastosDelMes
  const utilidadNetaPrevMonth = ingresosMesAnterior - gastosMesAnterior
  const resultDeltaPct = utilidadNetaPrevMonth ? ((utilidadNeta - utilidadNetaPrevMonth) / Math.abs(utilidadNetaPrevMonth)) * 100 : null

  const monthKeys = []
  for (let i = 5; i >= 0; i--) {
    monthKeys.push(new Date(now.getFullYear(), now.getMonth() - i, 1).toISOString().slice(0, 7))
  }
  const series = monthKeys.map((key) => ({
    month: key,
    ingresos: incomeByMonth.get(key) || 0,
    gastos: expenseByMonth.get(key) || 0,
  }))

  // Single feed for the movements table — every income and expense row,
  // tagged so the table can render one searchable, sortable list instead of
  // two short fixed side-by-side previews.
  const movements = [
    ...allIncomes.map((e) => ({ ...e, type: 'ingreso' })),
    ...validExpenses.map((e) => ({ ...e, type: 'gasto' })),
  ].sort((a, b) => b.date.localeCompare(a.date))

  const categoryTotals = new Map()
  const categoryTotalsPrevMonth = new Map()
  for (const e of validExpenses) {
    if (e.date.slice(0, 7) === monthKey) categoryTotals.set(e.category, (categoryTotals.get(e.category) || 0) + e.amount)
    if (e.date.slice(0, 7) === prevMonthKey) categoryTotalsPrevMonth.set(e.category, (categoryTotalsPrevMonth.get(e.category) || 0) + e.amount)
  }

  const qKey = quarterKey(now)
  const recaudadoTrimestre = allIncomes
    .filter((e) => isInQuarter(e.date, qKey))
    .reduce((sum, e) => sum + e.amount, 0)

  const currentYear = now.getFullYear()
  const recaudadoAnual = allIncomes
    .filter((e) => Number(e.date.slice(0, 4)) === currentYear)
    .reduce((sum, e) => sum + e.amount, 0)

  // Nearest unreceived SP payment — "what's coming in next" is a real
  // decision input (who to follow up with), unlike a static promo card.
  const pendingPayments = []
  for (const client of clients) {
    for (const key of ['pago1', 'pago2']) {
      const payment = client[key]
      if (payment?.status === 'Pendiente' && payment.amount) {
        pendingPayments.push({
          clientId: client.id,
          clientName: client.name,
          amount: payment.amount,
          date: payment.date || null,
          label: key === 'pago1' ? 'Pago 1 (60%)' : 'Pago 2 (40%)',
        })
      }
    }
  }
  pendingPayments.sort((a, b) => {
    if (!a.date) return 1
    if (!b.date) return -1
    return a.date.localeCompare(b.date)
  })
  const nextPayment = pendingPayments[0] || null

  // "Por cobrar" — every pending payment, not just the overdue ones (that's
  // `overdueAmount` below, a distinct, more urgent signal). This is the
  // figure a founder means by "how much are clients into us for right now."
  const totalPorCobrar = pendingPayments.reduce((sum, p) => sum + p.amount, 0)
  const porCobrarClientCount = new Set(pendingPayments.map((p) => p.clientId)).size

  // Forward-looking, unlike every other Finanzas number — those are all
  // this-month/this-quarter actuals. Burn rate is the average of the last 3
  // completed months (excluding the current, still-in-progress one) since a
  // partial current month would understate it. Expected inflows only count
  // pending payments that already have a target date — undated ones can't
  // be placed on a 30/60-day timeline.
  const last3MonthKeys = monthKeys.slice(-4, -1)
  const monthlyBurnRate = last3MonthKeys.length
    ? last3MonthKeys.reduce((sum, key) => sum + (expenseByMonth.get(key) || 0), 0) / last3MonthKeys.length
    : gastosDelMes
  const dailyBurnRate = monthlyBurnRate / 30

  const in30 = new Date(now)
  in30.setDate(now.getDate() + 30)
  const in60 = new Date(now)
  in60.setDate(now.getDate() + 60)
  const in90 = new Date(now)
  in90.setDate(now.getDate() + 90)
  const sumPendingBy = (cutoff) =>
    pendingPayments
      .filter((p) => p.date && new Date(`${p.date}T00:00:00`) <= cutoff)
      .reduce((sum, p) => sum + p.amount, 0)

  const cashBalance = settings.cashBalance || 0
  const inflowIn30 = sumPendingBy(in30) - dailyBurnRate * 30
  const inflowIn60 = sumPendingBy(in60) - dailyBurnRate * 60
  const inflowIn90 = sumPendingBy(in90) - dailyBurnRate * 90
  const projectedIn30 = cashBalance + inflowIn30
  const projectedIn60 = cashBalance + inflowIn60
  const projectedIn90 = cashBalance + inflowIn90

  // Salud Financiera — four signals no other card on this dashboard surfaces
  // on its own, chosen because each answers a different "is the business
  // actually okay" question rather than restating a number shown elsewhere:
  //
  // 1. Runway in months (not just a 30/60-day cash projection) — the
  //    single most-asked founder question, "cuánto tiempo nos queda."
  const runwayMonths = cashBalance && monthlyBurnRate > 0 ? cashBalance / monthlyBurnRate : null

  // 2. Net margin — revenue growing means nothing if it's not profitable;
  //    this is the one figure that answers that directly.
  const margenNetoPct = ingresosDelMes > 0 ? (utilidadNeta / ingresosDelMes) * 100 : null

  // 3. Revenue concentration — a consulting firm this size can look
  //    "healthy" on total revenue while quietly depending on one client for
  //    most of it. Grouped over the trailing 3 months (not just this month,
  //    which could be skewed by a single payment landing on a given date).
  const last3Keys = monthKeys.slice(-3)
  const recentIncomes = allIncomes.filter((e) => last3Keys.includes(e.date.slice(0, 7)))
  const totalRecentIncome = recentIncomes.reduce((sum, e) => sum + e.amount, 0)
  const byClient = new Map()
  for (const e of recentIncomes) {
    const key = e.source === 'client' ? e.name : e.clientName || 'Otros ingresos'
    byClient.set(key, (byClient.get(key) || 0) + e.amount)
  }
  let topClient = null
  for (const [name, amount] of byClient) {
    if (!topClient || amount > topClient.amount) topClient = { name, amount }
  }
  const topClientConcentrationPct = topClient && totalRecentIncome > 0 ? (topClient.amount / totalRecentIncome) * 100 : null

  // 4. Overdue collections — "próximo cobro" (NextPaymentCard) only shows
  //    what's coming; this flags payments whose own date has already passed
  //    without being marked Recibido, which is a distinct, more urgent signal.
  const overduePayments = pendingPayments.filter((p) => p.date && new Date(`${p.date}T00:00:00`) < now)
  const overdueAmount = overduePayments.reduce((sum, p) => sum + p.amount, 0)

  // Category spend spikes — same 15%+ threshold used nowhere else yet, but
  // consistent in spirit with the urgency thresholds already used across
  // this app (e.g. clientStages.js's 7/14-day amber/red). Only compares
  // categories present in both months — a brand-new category isn't a
  // "spike," it's just new spend with no baseline yet.
  const categorySpikes = []
  for (const [category, amount] of categoryTotals) {
    const prev = categoryTotalsPrevMonth.get(category)
    if (!prev) continue
    const pct = ((amount - prev) / prev) * 100
    if (pct >= 15) categorySpikes.push({ category, pct: Math.round(pct) })
  }
  categorySpikes.sort((a, b) => b.pct - a.pct)

  // "Estado" — the one-word summary the health bar leads with. Worst-signal
  // logic, same "one red anywhere means the header reads red" rule already
  // used for the card's overall accent color.
  const isCritico = (runwayMonths !== null && runwayMonths < 2) || overduePayments.length >= 2
  const isAtencion = (runwayMonths !== null && runwayMonths < 4) || overduePayments.length >= 1 || categorySpikes.length > 0
  const estadoSalud = runwayMonths === null && cashBalance === 0 ? null : isCritico ? 'Crítico' : isAtencion ? 'Atención' : 'Estable'

  return {
    ingresosDelMes,
    gastosDelMes,
    utilidadNeta,
    ingresosDeltaPct,
    gastosDeltaPct,
    resultDeltaPct,
    series,
    movements,
    categoryTotals,
    categoryTotalsPrevMonth,
    categorySpikes,
    quarterKey: qKey,
    quarterlyTarget: settings.quarterlyTarget || 0,
    recaudadoTrimestre,
    annualTarget: settings.annualTarget || 0,
    recaudadoAnual,
    currentYear,
    nextPayment,
    pendingPayments,
    totalPorCobrar,
    porCobrarClientCount,
    clients,
    cashBalance,
    monthlyBurnRate,
    projectedIn30,
    projectedIn60,
    projectedIn90,
    inflowIn30,
    inflowIn60,
    inflowIn90,
    runwayMonths,
    margenNetoPct,
    topClientConcentrationPct,
    topClientName: topClient?.name || null,
    overdueAmount,
    overdueCount: overduePayments.length,
    overduePayments,
    estadoSalud,
  }
}
