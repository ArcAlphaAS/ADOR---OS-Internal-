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
  for (const e of validExpenses) {
    if (e.date.slice(0, 7) !== monthKey) continue
    categoryTotals.set(e.category, (categoryTotals.get(e.category) || 0) + e.amount)
  }

  const qKey = quarterKey(now)
  const recaudadoTrimestre = allIncomes
    .filter((e) => isInQuarter(e.date, qKey))
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

  return {
    ingresosDelMes,
    gastosDelMes,
    utilidadNeta,
    ingresosDeltaPct,
    gastosDeltaPct,
    series,
    movements,
    categoryTotals,
    quarterKey: qKey,
    quarterlyTarget: settings.quarterlyTarget || 0,
    recaudadoTrimestre,
    nextPayment,
    clients,
  }
}
