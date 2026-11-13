import { useEffect, useState } from 'react'
import { subscribeTasksForUser } from '../lib/firestore'
import { isOverdue, isDueToday, isCompletedToday, isPendingFor } from '../lib/workspace'
import { useGoogleCalendar } from './useGoogleCalendar'

// One real, glanceable line for the welcome screen — built from the person's own
// tasks and calendar, never invented. Returns { ready, text }: `text` is '' when
// there's nothing true worth saying (the screen then keeps its generic line).
const rangeToTomorrow = () => {
  const start = new Date()
  const end = new Date()
  end.setDate(end.getDate() + 1)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}
const hhmm = (d) => d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false })
const clip = (s, n = 30) => (s && s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s || '')
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`
const sameDay = (a, b) => a.toDateString() === b.toDateString()

export function useWelcomeBrief(uid, hour) {
  const [tasks, setTasks] = useState(null)
  const [timedOut, setTimedOut] = useState(false)
  // A return from Google's consent screen is spent by the module that started it.
  const returningFromGoogle = typeof window !== 'undefined' && new URL(window.location.href).searchParams.has('code')
  const calendar = useGoogleCalendar(uid && uid !== 'preview' && !returningFromGoogle ? uid : null, { initialRange: rangeToTomorrow })

  useEffect(() => (uid && uid !== 'preview' ? subscribeTasksForUser(uid, setTasks) : undefined), [uid])
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 1600)
    return () => clearTimeout(t)
  }, [])

  const calendarSettled = calendar.status !== 'checking' && calendar.status !== 'connecting'
  const ready = tasks !== null && (calendarSettled || timedOut)
  if (!ready) return { ready: false, text: '', lines: [], stats: null }

  const now = new Date()
  const mine = tasks.filter((t) => t.status !== 'completado' && !isPendingFor(t, uid))
  const vencidas = mine.filter(isOverdue).length
  const hoy = mine.filter((t) => isDueToday(t) && !isOverdue(t)).length
  const cerradas = tasks.filter(isCompletedToday).length
  const events = calendar.status === 'ready'
    ? calendar.events.filter((e) => !e.allDay && e.start && e.end).sort((a, b) => new Date(a.start) - new Date(b.start))
    : []
  const upcoming = events.filter((e) => new Date(e.end) > now)
  const today = upcoming.find((e) => sameDay(new Date(e.start), now) || new Date(e.start) <= now)
  const tomorrowDate = new Date(now.getTime() + 86400000)
  const tomorrow = events.find((e) => sameDay(new Date(e.start), tomorrowDate))

  const parts = []
  if (hour >= 19) {
    // Cierre del día: lo que lograste y lo que viene mañana.
    parts.push(cerradas > 0 ? `Hoy cerraste ${plural(cerradas, 'tarea', 'tareas')}.` : 'Día tranquilo.')
    if (tomorrow) parts.push(`Mañana: ${clip(tomorrow.title)} a las ${hhmm(new Date(tomorrow.start))}.`)
    else {
      const dueTomorrow = mine.filter((t) => {
        const d = t.dueDate?.toDate?.()
        return d && sameDay(d, tomorrowDate)
      }).length
      if (dueTomorrow > 0) parts.push(`Mañana: ${plural(dueTomorrow, 'tarea', 'tareas')}.`)
    }
  } else {
    // Mañana y tarde (y madrugada): lo que te espera hoy.
    const bits = []
    if (hoy > 0) bits.push(`${plural(hoy, 'tarea', 'tareas')} para hoy`)
    if (vencidas > 0) bits.push(plural(vencidas, 'vencida', 'vencidas'))
    parts.push(bits.length ? `${bits.join(' · ')}.` : 'Sin tareas urgentes hoy.')
    if (today) {
      const start = new Date(today.start)
      parts.push(start <= now ? `En curso: ${clip(today.title)}.` : `${clip(today.title)} a las ${hhmm(start)}.`)
    }
  }
  const next = today && new Date(today.start) > now ? { title: today.title, time: hhmm(new Date(today.start)), startMs: new Date(today.start).getTime() } : null
  return { ready: true, text: parts.join(' '), lines: parts, stats: { tareas: hoy + vencidas, vencidas, next } }
}
