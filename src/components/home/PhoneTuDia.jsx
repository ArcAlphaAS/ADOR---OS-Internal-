import { toggleTaskComplete } from '../../lib/firestore'
import { withTimeout, isOverdue } from '../../lib/workspace'
import { useToast } from '../../hooks/useToast'
import { useDayData } from '../../hooks/useDayData'
import { priorityMeta } from '../../lib/workspace'

// "Tu día" para el teléfono: no la tarjeta de computadora apretada, sino una
// pantalla pensada para el pulgar. Una tarjeta plana con tu progreso del día,
// lo más importante ahora con sus dos acciones, la próxima reunión con su botón
// de Meet y las siguientes tareas para completar con un toque.
const hhmm = (v) => new Date(v).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false })

function dueText(task) {
  const due = task.dueDate?.toDate?.()
  if (!due) return 'Sin fecha'
  const days = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(due).setHours(0, 0, 0, 0)) / 86400000)
  if (days > 0) return `Vencida hace ${days} ${days === 1 ? 'día' : 'días'}`
  if (days === 0) return 'Para hoy'
  return due.toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

function untilText(start, inProgress) {
  if (inProgress) return 'En curso ahora'
  const min = Math.round((start.getTime() - Date.now()) / 60000)
  if (min < 1) return 'Ahora'
  if (min < 60) return `en ${min} min`
  const h = Math.floor(min / 60)
  return h < 6 ? `en ${h} h${min % 60 ? ` ${min % 60} min` : ''}` : 'hoy'
}

export default function PhoneTuDia({ user, nextMeeting, calendarStatus, onNavigate }) {
  const day = useDayData(user?.uid)
  const showToast = useToast()
  const actor = user?.displayName || user?.email?.split('@')[0] || 'Usuario'
  const pct = day.totalToday ? Math.round((day.completedToday / day.totalToday) * 100) : 0
  const focus = day.focus
  const open = (t) => onNavigate?.('workspace', { type: 'task', id: t.id })
  const complete = (t) => withTimeout(toggleTaskComplete(t, actor)).catch((e) => showToast(`No se pudo actualizar: ${e.message}`))
  if (!day.loaded) {
    return (
      <div className="rounded-[28px] bg-[#1C1C1E] p-5" aria-busy="true" aria-label="Cargando tu día">
        <span className="ador-skeleton block h-[14px] w-[22%] rounded-full" />
        <span className="ador-skeleton mt-3 block h-[26px] w-[78%] rounded-full" />
        <span className="ador-skeleton mt-3 block h-[14px] w-[44%] rounded-full" />
        <span className="ador-skeleton mt-6 block h-[46px] w-full rounded-full" />
      </div>
    )
  }
  const R = 21
  const C = 2 * Math.PI * R

  return (
    <div className="ador-glow rounded-[28px] p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-medium text-[#E8C15A]">Tu día</p>
          <p className="mt-0.5 text-[13px] text-[#8E8E93]">{day.totalToday > 0 ? `${day.completedToday} de ${day.totalToday} ${day.totalToday === 1 ? 'hecha' : 'hechas'}` : 'Sin tareas para hoy'}</p>
        </div>
        {day.totalToday > 0 && (
          <span className="relative flex h-[52px] w-[52px] items-center justify-center">
            <svg width="52" height="52" viewBox="0 0 52 52" className="absolute inset-0 -rotate-90" aria-hidden>
              <circle cx="26" cy="26" r={R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
              <circle cx="26" cy="26" r={R} fill="none" stroke={pct >= 100 ? '#FFD60A' : '#30D158'} strokeWidth="4" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)} style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)' }} />
            </svg>
            <span className="text-[12.5px] font-semibold tabular-nums text-[#F5F5F5]">{pct}%</span>
          </span>
        )}
      </div>

      {focus ? (
        <div className="mt-5">
          <p className="text-[12.5px] text-[#8E8E93]">Lo más importante ahora</p>
          <h2 className="ador-wrap mt-1.5 text-[26px] font-light leading-[1.15] tracking-[-0.02em] text-[#F5F5F5]">{focus.title}</h2>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px]" style={{ color: isOverdue(focus) ? '#D98A86' : '#8E8E93' }}>
            {day.workstreamName(focus) && <span>{day.workstreamName(focus)} ·</span>}
            <span>{dueText(focus)}</span>
            {focus.priority && <span className="rounded-full px-2 py-[1px] text-[11.5px] font-semibold" style={{ background: `${priorityMeta(focus.priority).color}22`, color: priorityMeta(focus.priority).color }}>{priorityMeta(focus.priority).label}</span>}
          </p>
          <div className="mt-4 flex gap-2.5">
            <button type="button" onClick={() => open(focus)} className="ador-btn-primary flex-1 rounded-full py-3 text-[15px] font-semibold">Empezar</button>
            <button type="button" onClick={() => complete(focus)} className="flex-1 rounded-full bg-[#2C2C2E] py-3 text-[15px] font-semibold text-[#F5F5F5]">✓ Completar</button>
          </div>
        </div>
      ) : (
        <div className="mt-5">
          <h2 className="text-[26px] font-light leading-[1.15] tracking-[-0.02em] text-[#F5F5F5]">Nada urgente por ahora.</h2>
          <p className="mt-2 text-[14px] text-[#8E8E93]">
            {day.nextPending ? <>Buen momento para adelantar <button type="button" onClick={() => open(day.nextPending)} className="font-medium text-[#F4EEE2]">«{day.nextPending.title}»</button>.</> : 'Buen momento para avanzar algo importante.'}
          </p>
        </div>
      )}

      <div className="my-5 h-px bg-white/[0.07]" />

      {calendarStatus !== 'ready' ? (
        <button type="button" onClick={() => onNavigate?.('calendario')} className="text-left text-[14px] text-[#8E8E93]">Conecta tu Google Calendar para ver tu próxima reunión →</button>
      ) : nextMeeting ? (
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => onNavigate?.('calendario')} className="min-w-0 flex-1 text-left">
            <span className="block text-[12.5px] text-[#8E8E93]">Próxima reunión · {untilText(nextMeeting.start, nextMeeting.inProgress)}</span>
            <span className="mt-1 flex items-baseline gap-3">
              <span className="text-[34px] font-extralight leading-none tabular-nums tracking-[-0.03em] text-[#F5F5F5]">{hhmm(nextMeeting.start)}</span>
              <span className="min-w-0 truncate text-[15px] text-[#E4E4E4]">{nextMeeting.title}</span>
            </span>
          </button>
          {nextMeeting.meet && (
            <a href={nextMeeting.meet} target="_blank" rel="noreferrer" className="flex-shrink-0 rounded-full bg-[#F5F5F5] px-4 py-2.5 text-[13.5px] font-semibold text-[#0A0A0A]">Unirme</a>
          )}
        </div>
      ) : (
        <p className="text-[14px] text-[#8E8E93]">Sin más reuniones por hoy.</p>
      )}

      {day.upNext.length > 0 && (
        <>
          <div className="my-5 h-px bg-white/[0.07]" />
          <p className="mb-1 text-[12.5px] text-[#8E8E93]">Después</p>
          <ul className="flex flex-col">
            {day.upNext.map((t) => (
              <li key={t.id} className="flex items-center gap-3.5 py-2.5">
                <button type="button" aria-label="Completar" onClick={() => complete(t)} className="h-[24px] w-[24px] flex-shrink-0 rounded-full border-[1.5px]" style={{ borderColor: isOverdue(t) ? '#D98A86' : 'rgba(255,255,255,0.3)' }} />
                <button type="button" onClick={() => open(t)} className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-[15.5px] text-[#F0F0F0]">{t.title}</span>
                  <span className="block truncate text-[12.5px]" style={{ color: isOverdue(t) ? '#D98A86' : '#8E8E93' }}>{[day.workstreamName(t), dueText(t)].filter(Boolean).join(' · ')}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
