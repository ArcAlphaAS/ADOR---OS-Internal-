import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { applyTaskUpdate } from '../../lib/firestore'
import { withTimeout } from '../../lib/workspace'
import { useToast } from '../../hooks/useToast'
import { useDayData } from '../../hooks/useDayData'
import CardHeader, { CARD_PAD, CARD_RADIUS } from './CardHeader'

// "Cierra tu día": desde las 17:00, un cierre tranquilo. Lo que lograste, lo que
// queda abierto y una sola acción: pasar lo pendiente a mañana (con confirmación),
// para empezar el día siguiente sin arrastrar tareas vencidas. "Listo" lo
// oculta hasta mañana. Sin rachas ni presión: solo cerrar el ciclo.
const dayKey = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}` }
const KEY = 'ador_close_day_dismissed'

export default function CierraTuDiaCard({ user }) {
  const day = useDayData(user?.uid)
  const showToast = useToast()
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(KEY) === dayKey()
    } catch {
      return false
    }
  })
  const [hour, setHour] = useState(() => new Date().getHours())
  useEffect(() => {
    const t = setInterval(() => setHour(new Date().getHours()), 60000)
    return () => clearInterval(t)
  }, [])
  if (hidden || hour < 17 || !user?.uid || user.uid === 'preview') return null
  if (day.completedToday === 0 && day.openToday.length === 0) return null

  const actor = user.displayName || user.email?.split('@')[0] || 'Usuario'
  const left = day.openToday.length
  const done = day.completedToday

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, dayKey())
    } catch {
      // sin almacenamiento
    }
    setHidden(true)
  }
  const moveAll = async () => {
    setBusy(true)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(12, 0, 0, 0)
    try {
      await Promise.all(day.openToday.map((t) => withTimeout(applyTaskUpdate(t, { dueDate: tomorrow }, user.uid, actor))))
      showToast(`${left} ${left === 1 ? 'tarea pasó' : 'tareas pasaron'} a mañana`)
      dismiss()
    } catch (error) {
      showToast(`No se pudo mover: ${error.message}`)
      setBusy(false)
    }
  }

  return (
    <motion.div layout className={`ador-glass ador-grain ${CARD_RADIUS} ${CARD_PAD}`}>
      <CardHeader label="Cierra tu día" dot="#F4EEE2" />
      <p className="mt-3 text-[22px] font-light leading-snug tracking-[-0.01em] text-[#F5F5F5]">
        {done > 0 ? `Hoy cerraste ${done} ${done === 1 ? 'tarea' : 'tareas'}.` : 'Hoy fue un día de avance silencioso.'}
        {left > 0 ? <span className="text-[#8A8A8A]"> Quedan {left} abiertas.</span> : <span className="text-[#8A8A8A]"> No queda nada para hoy.</span>}
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        {left > 0 && !confirm && (
          <button type="button" onClick={() => setConfirm(true)} className="ador-btn-primary rounded-full px-5 py-2.5 text-[13.5px] font-semibold">Pasar lo pendiente a mañana</button>
        )}
        {left > 0 && confirm && (
          <>
            <button type="button" disabled={busy} onClick={moveAll} className="ador-btn-primary rounded-full px-5 py-2.5 text-[13.5px] font-semibold disabled:opacity-60">{busy ? 'Moviendo…' : `Sí, mover ${left} a mañana`}</button>
            <button type="button" onClick={() => setConfirm(false)} className="rounded-full px-4 py-2.5 text-[13.5px] text-[#8E8E93]">Cancelar</button>
          </>
        )}
        <button type="button" onClick={dismiss} className="rounded-full bg-white/[0.07] px-5 py-2.5 text-[13.5px] font-medium text-[#F4EEE2]">Listo por hoy</button>
      </div>
    </motion.div>
  )
}
