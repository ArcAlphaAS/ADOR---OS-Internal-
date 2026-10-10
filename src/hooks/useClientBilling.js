import { useEffect } from 'react'
import { subscribeClients, materializeClientCobros } from '../lib/firestore'
import { todayISO } from '../lib/clientStages'

// Creates the cobros of contracts, subscriptions and one-off payments whose
// date has arrived. No server: whoever has ADOR OS open runs it when client
// data arrives and every few hours; a transaction per client keeps two
// devices from creating the same cobro (see materializeClientCobros).
export function useClientBilling(enabled, uid) {
  useEffect(() => {
    if (!enabled || !uid || uid === 'preview') return undefined
    let latest = []
    const run = () => {
      const today = todayISO()
      for (const c of latest) {
        const b = c.billing
        if (b?.active && b.nextDue && b.nextDue <= today && !c.completed && !c.lost) materializeClientCobros(c.id).catch(() => {})
      }
    }
    const unsub = subscribeClients((clients) => {
      latest = clients
      run()
    })
    const every = setInterval(run, 6 * 60 * 60 * 1000)
    return () => {
      unsub()
      clearInterval(every)
    }
  }, [enabled, uid])
}
