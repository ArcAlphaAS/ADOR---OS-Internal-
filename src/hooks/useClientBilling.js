import { useEffect } from 'react'
import { subscribeClients, subscribeUsers, materializeClientCobros, claimRenewalNotice, sendRenewalPush } from '../lib/firestore'
import { todayISO, contractStatus } from '../lib/clientStages'

// Creates the cobros of contracts, subscriptions and one-off payments whose
// date has arrived, and sends the renewal push notices of contracts (90, 60,
// 30, 7 days before the end, and when it ends). No server: whoever has ADOR OS
// open runs it when client data arrives and every few hours; a transaction per
// client keeps two devices from creating the same cobro or sending the same
// notice (see materializeClientCobros / claimRenewalNotice).
export function useClientBilling(enabled, uid, name) {
  useEffect(() => {
    if (!enabled || !uid || uid === 'preview') return undefined
    let latest = []
    let users = []
    const run = () => {
      const today = todayISO()
      for (const c of latest) {
        const b = c.billing
        if (b?.active && b.nextDue && b.nextDue <= today && !c.completed && !c.lost) materializeClientCobros(c.id).catch(() => {})
        const status = contractStatus(c)
        if (status?.alert && users.length) {
          // The responsible associate plus every administrator; the person whose
          // app sends it is left out (they already see it in the bell).
          const recipients = [c.assignedTo, ...users.filter((u) => u.isAdmin !== false).map((u) => u.id)].filter(Boolean)
          claimRenewalNotice(c.id, status.end, status.days)
            .then((step) => step !== null && step !== undefined && sendRenewalPush(c, status, recipients, { uid, name }))
            .catch(() => {})
        }
      }
    }
    const offClients = subscribeClients((clients) => {
      latest = clients
      run()
    })
    const offUsers = subscribeUsers((list) => {
      users = list
      run()
    })
    const every = setInterval(run, 6 * 60 * 60 * 1000)
    return () => {
      offClients()
      offUsers()
      clearInterval(every)
    }
  }, [enabled, uid, name])
}
