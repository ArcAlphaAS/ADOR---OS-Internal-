import { useEffect } from 'react'
import { subscribeClients, subscribeObjetivos, subscribeTasksForUser } from '../lib/firestore'
import { currencyPEN } from '../lib/clientStages'
import { objetivoPct } from '../lib/objetivos'
import { isPendingFor } from '../lib/workspace'
import { celebrate } from '../lib/celebrate'

// Watches live data and celebrates the moments that matter — a payment
// received, an SPC becoming an SP, a goal reached, a cleared day. It compares
// each snapshot against the previous one, so nothing fires for what was
// already true when the app opened (and a short grace period after the first
// snapshot ignores the cache-then-server catch-up).
const GRACE_MS = 8000
const DAY_KEY = 'ador_moment_cleared_day'

function endOfToday() {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d
}

export function useAchievements(user) {
  useEffect(() => {
    if (!user?.uid || user.uid === 'preview') return undefined
    const uid = user.uid
    const startedAt = Date.now()
    const live = () => Date.now() - startedAt > GRACE_MS

    let prevClients = null
    const unsubClients = subscribeClients((list) => {
      const next = new Map(list.map((c) => [c.id, c]))
      if (prevClients && live()) {
        for (const client of list) {
          const before = prevClients.get(client.id)
          if (!before) continue
          for (const key of ['pago1', 'pago2']) {
            if (before[key]?.status !== 'Recibido' && client[key]?.status === 'Recibido') {
              celebrate({ title: 'Pago recibido', subtitle: `${currencyPEN.format(client[key].amount || 0)} · ${client.name}` })
            }
          }
          if (before.stage !== 'intervencion_activa' && client.stage === 'intervencion_activa') {
            celebrate({ title: 'Nuevo Strategic Partner', subtitle: client.name })
          }
        }
      }
      prevClients = next
    })

    let prevObjetivos = null
    const unsubObjetivos = subscribeObjetivos((list) => {
      const next = new Map(list.map((o) => [o.id, objetivoPct(o)]))
      if (prevObjetivos && live()) {
        for (const o of list) {
          if ((prevObjetivos.get(o.id) ?? 100) < 100 && objetivoPct(o) >= 100) {
            celebrate({ title: 'Objetivo logrado', subtitle: o.title })
          }
        }
      }
      prevObjetivos = next
    })

    let prevTasks = null
    const unsubTasks = subscribeTasksForUser(uid, (list) => {
      const next = new Map(list.map((t) => [t.id, t.status]))
      if (prevTasks && live()) {
        const justDone = list.filter((t) => t.status === 'completado' && prevTasks.get(t.id) && prevTasks.get(t.id) !== 'completado')
        const wasDue = justDone.some((t) => {
          const due = t.dueDate?.toDate?.()
          return due && due <= endOfToday()
        })
        if (wasDue) {
          const remaining = list.filter((t) => {
            const due = t.dueDate?.toDate?.()
            return t.status !== 'completado' && !isPendingFor(t, uid) && due && due <= endOfToday()
          })
          let already = false
          try {
            already = localStorage.getItem(DAY_KEY) === new Date().toDateString()
          } catch {
            /* ignore */
          }
          if (remaining.length === 0 && !already) {
            try {
              localStorage.setItem(DAY_KEY, new Date().toDateString())
            } catch {
              /* ignore */
            }
            celebrate({ title: 'Día despejado', subtitle: 'Completaste todo lo de hoy' })
          }
        }
      }
      prevTasks = next
    })

    return () => {
      unsubClients?.()
      unsubObjetivos?.()
      unsubTasks?.()
    }
  }, [user?.uid])
}
