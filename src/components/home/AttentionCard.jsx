import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import usePhone from '../../hooks/usePhone'
import { applyTaskUpdate } from '../../lib/firestore'
import { withTimeout } from '../../lib/workspace'
import { useToast } from '../../hooks/useToast'
import { useAttention } from '../../hooks/useAttention'
import CardHeader, { CARD_PAD, CARD_RADIUS } from './CardHeader'

// "Necesita tu atención" — the firm-wide list of what's late, cold or stuck,
// ranked, each row one click from fixing it. Quiet when everything's fine.
const LEVEL = { urgent: '#EF5350', warn: '#E8C15A' }
const MAX_ROWS = 6

// "Ocultar hasta mañana": se guarda en este navegador, por día, solo los ids.
const SNOOZE_KEY = 'ador_attention_snooze'
const todayKey = () => new Date().toDateString()
const readSnoozed = () => {
  try {
    const v = JSON.parse(localStorage.getItem(SNOOZE_KEY) || 'null')
    return v && v.day === todayKey() ? v.ids : []
  } catch {
    return []
  }
}

// Icono por tipo de aviso (se deduce del id): cobro, contrato, caja, meta,
// cliente frío, tareas, carga del equipo.
const ICONS = {
  pay: <path d="M3 8h18v10H3zM3 12h18M7 16h3" />,
  contract: <path d="M7 3h8l4 4v14H7zM15 3v4h4M10 12h6M10 16h6" />,
  runway: <path d="M3 17l5-5 4 4 8-9M15 7h5v5" />,
  obj: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.5" /></>,
  stale: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  my: <path d="M9 11l2.5 2.5L17 8M5 4h14v16H5z" />,
  load: <><circle cx="9" cy="9" r="3" /><path d="M3.5 19c.7-3 3-4.5 5.5-4.5s4.8 1.5 5.5 4.5M16 6.5a3 3 0 0 1 0 5.5M17.5 14.5c1.7.5 3 1.8 3.5 4" /></>,
}
const iconFor = (id) => ICONS[String(id).split('-')[0]] || ICONS.my

export default function AttentionCard({ finance, uid, actorName, onNavigate }) {
  const { items: all, loaded } = useAttention(finance, uid)
  const phone = usePhone()
  const showToast = useToast()
  const [snoozed, setSnoozed] = useState(readSnoozed)
  const [busyId, setBusyId] = useState(null)
  const items = all.filter((i) => !snoozed.includes(i.id))
  const shown = items.slice(0, MAX_ROWS)
  const snooze = (id) => {
    const ids = [...snoozed, id]
    setSnoozed(ids)
    try { localStorage.setItem(SNOOZE_KEY, JSON.stringify({ day: todayKey(), ids })) } catch { /* sin almacenamiento */ }
  }
  const runAction = async (item) => {
    if (item.action?.kind !== 'today' || busyId) return
    setBusyId(item.id)
    const d = new Date()
    d.setHours(18, 0, 0, 0)
    const actor = uid
    try {
      await Promise.all(item.action.tasks.map((t) => withTimeout(applyTaskUpdate(t, { dueDate: d }, actor, actorName || 'Usuario'))))
      showToast(`${item.action.tasks.length} ${item.action.tasks.length === 1 ? 'tarea pasó' : 'tareas pasaron'} a hoy`)
    } catch (error) {
      showToast(`No se pudo mover: ${error.message}`)
    } finally {
      setBusyId(null)
    }
  }
  const hasUrgent = items.some((i) => i.level === 'urgent')

  return (
    <div className={`ador-glass ador-grain h-full ${CARD_RADIUS} ${CARD_PAD} ${!loaded || items.length === 0 ? '' : hasUrgent ? 'ador-card-urgent' : 'ador-card-attention'}`}>
      <CardHeader label="Necesita tu atención" count={items.length > 0 ? items.length : null} />
      {loaded && items.length > 0 && (
        <p className="mt-1.5 text-[12.5px] text-[#8A8A8A]">
          {items.filter((i) => i.level === 'urgent').length > 0 ? `${items.filter((i) => i.level === 'urgent').length} urgente${items.filter((i) => i.level === 'urgent').length > 1 ? 's' : ''} · ` : ''}
          {items.filter((i) => i.level !== 'urgent').length} por revisar
        </p>
      )}

      {!loaded ? (
        <div className="mt-4 space-y-3 py-1">
          {[72, 58, 66].map((w) => (
            <div key={w} className="flex items-center gap-3">
              <span className="ador-skeleton h-2 w-2 flex-shrink-0 rounded-full" />
              <span className="ador-skeleton h-3 rounded-full" style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex items-center gap-4 py-7">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-[#E8C15A]/40 text-[#E8C15A]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </span>
          <div>
            <p className="text-[16px] font-light text-[#F5F5F5]">Todo en orden</p>
            <p className="mt-0.5 text-[13px] text-[#8A8A8A]">Nada requiere tu atención ahora mismo.</p>
          </div>
        </div>
      ) : (
        <ul className="ador-stagger mt-4 flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {shown.map((item, i) => {
              const color = LEVEL[item.level]
              return (
                <motion.li
                  key={item.id}
                  layout="position"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -24, transition: { duration: 0.25 } }}
                  transition={{ duration: 0.7, delay: 0.25 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  drag={phone ? 'x' : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={{ left: 0.5, right: 0 }}
                  onDragEnd={(_, info) => { if (info.offset.x < -80) snooze(item.id) }}
                  className="group/row relative"
                >
                  <div className="flex items-center rounded-2xl transition-colors duration-200 hover:bg-white/[0.06]" style={{ background: `${color}12` }}>
                    <button
                      type="button"
                      onClick={() => onNavigate?.(item.target[0], item.target[1])}
                      className="group flex min-w-0 flex-1 items-center gap-3.5 rounded-2xl px-3.5 py-3 text-left"
                    >
                      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full" style={{ background: `${color}24`, color }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{iconFor(item.id)}</svg>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] text-[#F0F0F0]">{item.title}</span>
                        <span className="mt-0.5 block truncate text-[12.5px] text-[#8A8A8A]">{item.detail}</span>
                      </span>
                    </button>
                    <span className="mr-3 flex flex-shrink-0 items-center gap-1.5">
                      {item.action && (
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => runAction(item)}
                          className="rounded-full border border-white/[0.16] px-3 py-1 text-[12px] font-medium text-[#E4E4E4] transition-colors hover:border-[#F4EEE2] hover:text-white disabled:opacity-50"
                        >
                          {busyId === item.id ? '…' : item.action.label}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => snooze(item.id)}
                        title="Ocultar hasta mañana"
                        aria-label="Ocultar hasta mañana"
                        className="flex h-7 w-7 items-center justify-center rounded-full text-[#8A8A8A] opacity-0 transition-opacity hover:bg-white/[0.08] hover:text-[#F5F5F5] focus-visible:opacity-100 group-hover/row:opacity-100 [@media(hover:none)]:hidden"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                      </button>
                    </span>
                  </div>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
      )}
      {snoozed.length > 0 && all.length > 0 && <button type="button" onClick={() => { setSnoozed([]); try { localStorage.removeItem(SNOOZE_KEY) } catch { /* sin almacenamiento */ } }} className="mt-3 text-[12px] text-[#8A8A8A] transition-colors hover:text-[#F5F5F5]">Mostrar {snoozed.length} oculta{snoozed.length === 1 ? '' : 's'} →</button>}
      {items.length > MAX_ROWS && <p className="mt-3 text-[12px] text-[#8A8A8A]">y {items.length - MAX_ROWS} más</p>}
    </div>
  )
}
