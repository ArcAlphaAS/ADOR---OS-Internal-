import { useEffect } from 'react'
import { materializeFinanceRecurring } from '../lib/firestore'

// Registers recurring expenses/incomes whose date has arrived. No server:
// whoever has Finanzas open (mounted from AppShell for people with access)
// runs it on open and every few hours; a transaction per occurrence stops
// two devices from creating the same one (see materializeFinanceRecurring).
export function useFinanceRecurring(enabled, uid) {
  useEffect(() => {
    if (!enabled || !uid || uid === 'preview') return
    const run = () => materializeFinanceRecurring().catch(() => {})
    const first = setTimeout(run, 8000)
    const every = setInterval(run, 6 * 60 * 60 * 1000)
    return () => {
      clearTimeout(first)
      clearInterval(every)
    }
  }, [enabled, uid])
}
