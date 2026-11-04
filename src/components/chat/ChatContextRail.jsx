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
    <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.03] p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[13px] font-semibold text-[#F5F5F5]">{title}</span>
        {count != null && (
          <span className="flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-white/[0.08] px-1.5 text-[11.5px] font-medium tabular-nums text-[#C9C9C9]">{count}</span>
        )}
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
          <button type="button" onClick={() => onNavigate?.('calendario')} className="text-left text-[12.5px] text-[#8A8A8A]">
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
                <li key={e.id} className="flex items-stretch gap-3 rounded-2xl bg-white/[0.04] px-3 py-2.5" style={{ opacity: past ? 0.45 : 1 }}>
                  <span className="w-[3px] flex-shrink-0 rounded-full" style={{ background: live ? '#E8C15A' : 'rgba(244,238,226,0.35)' }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium text-[#F0F0F0]">{e.title}</span>
                    <span className="mt-0.5 block text-[12px] tabular-nums text-[#8A8A8A]">
                      {hhmm(e.start)}{e.end ? ` – ${hhmm(e.end)}` : ''}{live ? ' · ahora' : ''}
                    </span>
                  </span>
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
              <li key={t.id} className="flex items-center gap-3 rounded-2xl bg-white/[0.04] px-3 py-2.5">
                <button
                  type="button"
                  aria-label="Marcar como completada"
                  onClick={() => withTimeout(toggleTaskComplete(t, actorName)).catch((err) => showToast(`No se pudo actualizar: ${err.message}`))}
                  className="h-[18px] w-[18px] flex-shrink-0 rounded-full border-[1.5px]"
                  style={{ borderColor: isOverdue(t) ? '#D98A86' : 'rgba(255,255,255,0.32)' }}
                />
                <button type="button" onClick={() => onNavigate?.('workspace', { type: 'task', id: t.id })} className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-[13.5px] text-[#F0F0F0]">{t.title}</span>
                  {isOverdue(t) && <span className="block text-[11.5px] text-[#D98A86]">Vencida</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
        <button type="button" onClick={() => onNavigate?.('workspace')} className="mt-4 text-[12.5px] font-medium text-[#F4EEE2]">
          Ver mi día →
        </button>
      </Card>
    </aside>
  )
}
