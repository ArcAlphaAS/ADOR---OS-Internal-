import { useEffect, useState } from 'react'
import { useGoogleCalendar } from '../../hooks/useGoogleCalendar'
import { useDayData } from '../../hooks/useDayData'
import { toggleTaskComplete } from '../../lib/firestore'
import { withTimeout, isOverdue } from '../../lib/workspace'
import { useToast } from '../../hooks/useToast'

// Columna de contexto de Comunicación (de una referencia de diseño de bandeja
// con widgets a la derecha): mientras conversas ves tus reuniones de hoy y tus
// tareas del día, sin salir del chat. Solo en pantallas anchas y cuando no hay
// otro panel (Perfil / Detalles / Hilo) abierto.
const todayRange = () => {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start.getTime() + 86400000)
  return { start, end }
}
const hhmm = (v) => new Date(v).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false })

function Card({ title, count, children }) {
  return (
    <div className="ador-glass ador-grain rounded-[20px] p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#7A7A7A]">{title}</span>
        {count != null && <span className="text-[11px] text-[#767676]">{count}</span>}
      </div>
      {children}
    </div>
  )
}

export default function ChatContextRail({ user, onNavigate }) {
  const showToast = useToast()
  const calendar = useGoogleCalendar(user?.uid, { initialRange: todayRange })
  const day = useDayData(user?.uid)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(t)
  }, [])

  const events = calendar.status === 'ready' ? calendar.events.filter((e) => !e.allDay && e.start).sort((a, b) => new Date(a.start) - new Date(b.start)) : []
  const tasks = [day.focus, ...day.upNext].filter(Boolean)
  const actorName = user?.displayName || user?.email?.split('@')[0] || 'Usuario'

  return (
    <aside className="hidden w-[272px] flex-shrink-0 flex-col gap-4 overflow-y-auto xl:flex">
      <Card title="Reuniones de hoy" count={calendar.status === 'ready' ? events.length : null}>
        {calendar.status !== 'ready' ? (
          <button type="button" onClick={() => onNavigate?.('calendario')} className="text-left text-[12.5px] text-[#7A7A7A] hover:text-[#C9C9C9]">
            Conecta tu Google Calendar para verlas aquí →
          </button>
        ) : events.length === 0 ? (
          <p className="text-[12.5px] text-[#7A7A7A]">Sin reuniones hoy.</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {events.slice(0, 5).map((e) => {
              const live = new Date(e.start).getTime() <= now && new Date(e.end).getTime() > now
              const past = new Date(e.end).getTime() <= now
              return (
                <li key={e.id} className="flex gap-3" style={{ opacity: past ? 0.45 : 1 }}>
                  <span className="w-[38px] flex-shrink-0 text-[12.5px] tabular-nums" style={{ color: live ? '#E8C15A' : '#8A8A8A' }}>{hhmm(e.start)}</span>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-[#E4E4E4]">{e.title}</span>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <Card title="Tus tareas de hoy" count={tasks.length || null}>
        {tasks.length === 0 ? (
          <p className="text-[12.5px] text-[#7A7A7A]">Nada urgente por ahora.</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-start gap-2.5">
                <button
                  type="button"
                  aria-label="Marcar como completada"
                  onClick={() => withTimeout(toggleTaskComplete(t, actorName)).catch((err) => showToast(`No se pudo actualizar: ${err.message}`))}
                  className="mt-[2px] h-[17px] w-[17px] flex-shrink-0 rounded-full border-[1.5px] transition-colors hover:border-[#F4EEE2]"
                  style={{ borderColor: isOverdue(t) ? '#D98A86' : 'rgba(255,255,255,0.3)' }}
                />
                <button type="button" onClick={() => onNavigate?.('workspace', { type: 'task', id: t.id })} className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-[13px] text-[#E4E4E4] hover:text-white">{t.title}</span>
                  {isOverdue(t) && <span className="block text-[11.5px] text-[#D98A86]">Vencida</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
        <button type="button" onClick={() => onNavigate?.('workspace')} className="mt-3 text-[12px] text-[#7A7A7A] transition-colors hover:text-[#F5F5F5]">
          Ver mi día →
        </button>
      </Card>
    </aside>
  )
}
