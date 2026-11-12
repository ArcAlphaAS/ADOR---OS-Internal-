import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { currencyPEN } from '../../lib/clientStages'
import { metricLabel, objetivoPct, objetivoStatus, objetivoLinks, OBJETIVO_STATUS, confidenceColor } from '../../lib/objetivos'
import { updateObjetivo, deleteObjetivo, setNorthStar } from '../../lib/firestore'
import { withTimeout } from '../../lib/workspace'
import { useToast } from '../../hooks/useToast'
import Avatar from '../shell/Avatar'
import CheckinModal from './CheckinModal'
import ConfirmDeleteModal from '../common/ConfirmDeleteModal'

// Un objetivo como una fila de un tablero de dirección (lista agrupada al estilo de Apple):
// estado, título y responsable; el avance con su marcador de ritmo; y el valor frente a la meta.
// Al tocarla se despliega el detalle (descripción, bloqueo, vínculos, check-in y acciones) sin
// salir de la lista. Todo en grafito y marfil; el color solo aparece en el punto de estado.

const SPRING = { type: 'spring', stiffness: 420, damping: 40 }

function formatValue(value, unit) {
  if (unit === 'S/') return currencyPEN.format(value || 0)
  return `${Math.round(value || 0)}${unit ? ` ${unit}` : ''}`
}

const Chevron = ({ open }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6E6E73" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)' }} aria-hidden>
    <path d="M9 5l7 7-7 7" />
  </svg>
)

function Bar({ pct, color, elapsedPct, showPace }) {
  return (
    <div className="relative py-1.5">
      <div className="h-[5px] overflow-hidden rounded-full bg-white/[0.09]">
        <motion.div className="h-full rounded-full" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} />
      </div>
      {showPace && (
        <span title={`Dónde deberías ir hoy: ${elapsedPct}%`} className="absolute top-0 h-full w-px -translate-x-1/2 bg-white/60" style={{ left: `${elapsedPct}%` }}>
          <span className="absolute -top-px left-1/2 h-[5px] w-[5px] -translate-x-1/2 rounded-full bg-white/80" />
        </span>
      )}
    </div>
  )
}

export default function ObjetivoRow({ canManage = false, objetivo, index, owner, actorName, northStarId, elapsedPct, daysLeft, isCurrentQuarter, onNavigate }) {
  const [open, setOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [checkingIn, setCheckingIn] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const showToast = useToast()
  const fail = (what) => (e) => showToast(`No se pudo ${what}: ${e.message}`)

  const o = objetivo
  const isMilestone = o.type === 'milestone'
  const pct = objetivoPct(o)
  const status = OBJETIVO_STATUS[objetivoStatus(o, elapsedPct, isCurrentQuarter)]
  const links = objetivoLinks(o)
  const pace = isCurrentQuarter && !isMilestone ? pct - elapsedPct : null
  const label = o.metric === 'custom' ? o.customLabel || (o.unit === 'S/' ? 'Monto (S/)' : o.unit) || 'Métrica' : metricLabel(o.metric)
  const barColor = pct >= 100 ? '#E8C15A' : status.color === '#EF5350' ? '#EF5350' : '#F4EEE2'
  const lastCheckin = o.lastCheckinAt?.toDate?.() || null
  const since = lastCheckin ? Math.floor((Date.now() - lastCheckin.getTime()) / 86400000) : null
  const stale = isCurrentQuarter && (since === null || since >= 7)
  const checkinText = since === null ? 'Sin check-in esta semana' : since === 0 ? 'Check-in de hoy' : `Check-in hace ${since} ${since === 1 ? 'día' : 'días'}`
  const ownerName = owner ? (owner.displayName || owner.email || '').split(' ')[0] : null
  const valueNow = isCurrentQuarter || o.metric === 'custom' ? formatValue(o.currentValue, o.unit) : '—'

  const saveValue = () => {
    const value = Number(draft)
    if (!Number.isNaN(value)) withTimeout(updateObjetivo(o.id, { currentValue: value })).catch(fail('guardar'))
    setEditing(false)
  }
  const action = 'rounded-full px-3.5 py-1.5 text-[13px] font-medium text-[#F4EEE2] transition-colors hover:bg-white/[0.08]'

  return (
    <article className="ador-wrap" onContextMenu={(e) => { if (e.target.closest?.('input,textarea,a,button')) return; e.preventDefault(); setOpen((v) => !v) }}>
      {/* Fila */}
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 px-5 py-4 text-left transition-colors hover:bg-white/[0.03] md:px-7 md:py-5 lg:grid-cols-[minmax(0,2.3fr)_minmax(0,1.5fr)_minmax(0,1.1fr)_20px] lg:gap-x-8">
        <div className="flex min-w-0 items-start gap-3.5">
          <span className="mt-[7px] h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: status.color }} title={status.label} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
              <h3 className="text-[17px] font-semibold leading-snug tracking-[-0.01em] text-[#F5F5F5]">{o.title}</h3>
              {o.isNorthStar && <span className="text-[11.5px] font-medium uppercase tracking-[0.08em] text-[#E8C15A]">Métrica Norte</span>}
            </div>
            <p className="mt-0.5 truncate text-[13px] text-[#8E8E93]">
              {[status.label, o.foco && o.foco !== 'General' ? o.foco : null, ownerName, isCurrentQuarter ? checkinText : null].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>

        <span className="justify-self-end lg:hidden"><Chevron open={open} /></span>

        <div className="col-span-2 lg:col-span-1">
          {isMilestone ? (
            <p className="text-[14px]" style={{ color: o.completed ? '#E8C15A' : '#A8A8AD' }}>{o.completed ? '✓ Logrado' : 'Hito pendiente'}</p>
          ) : (
            <div className="flex items-center gap-3.5">
              <div className="min-w-0 flex-1"><Bar pct={pct} color={barColor} elapsedPct={elapsedPct} showPace={isCurrentQuarter && elapsedPct > 0 && elapsedPct < 100} /></div>
              <span className="w-11 text-right text-[15px] font-medium tabular-nums text-[#F5F5F5]">{pct}%</span>
            </div>
          )}
        </div>

        <div className="col-span-2 flex items-baseline justify-between gap-2 lg:col-span-1 lg:justify-end lg:text-right">
          {isMilestone ? <span className="text-[13px] text-[#8E8E93] lg:hidden">Hito del trimestre</span> : (
            <p className="tabular-nums">
              <span className="text-[17px] font-semibold text-[#F5F5F5]">{valueNow}</span>
              <span className="ml-1.5 text-[13px] text-[#8E8E93]">de {formatValue(o.targetValue, o.unit)}</span>
            </p>
          )}
        </div>

        <span className="hidden justify-self-end lg:block"><Chevron open={open} /></span>
      </button>

      {/* Detalle */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={SPRING} className="overflow-hidden">
            <div className="grid grid-cols-1 gap-7 border-t border-white/[0.06] px-5 pb-6 pt-5 md:px-7 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-12 lg:pl-[54px]">
              <div className="min-w-0">
                {o.description ? <p className="max-w-[560px] text-[14.5px] leading-relaxed text-[#B5B5BA]">{o.description}</p> : <p className="text-[14px] text-[#6E6E73]">Sin descripción.</p>}
                {o.blocker && (o.confidence === 'rojo' || o.confidence === 'amarillo') && (
                  <p className="mt-3 text-[13.5px] text-[#E0D6C4]"><span className="text-[#8E8E93]">Bloqueo · </span>{o.blocker}</p>
                )}
                {links.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
                    {links.map((l) => (
                      <button key={l.label} type="button" onClick={() => onNavigate?.(l.module)} className="text-[13px] text-[#F4EEE2] hover:underline">{l.label} ↗</button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex min-w-0 flex-col gap-4">
                <dl className="grid grid-cols-3 gap-4">
                  <div><dt className="text-[11.5px] text-[#8E8E93]">{pace !== null ? 'Frente al ritmo' : 'Avance'}</dt><dd className="mt-1 text-[16px] font-medium tabular-nums" style={{ color: pace === null ? '#F5F5F5' : pace >= 0 ? '#7FC98F' : '#E8A25A' }}>{pace !== null ? `${pace >= 0 ? '+' : '−'}${Math.abs(pace)} pts` : `${pct}%`}</dd></div>
                  <div><dt className="text-[11.5px] text-[#8E8E93]">Responsable</dt><dd className="mt-1 flex items-center gap-1.5 truncate text-[16px] font-medium text-[#F5F5F5]">{owner && <Avatar photoURL={owner.photoDataUrl} displayName={owner.displayName} email={owner.email} size={18} />}{ownerName || 'Sin asignar'}</dd></div>
                  <div><dt className="text-[11.5px] text-[#8E8E93]">Restan</dt><dd className="mt-1 text-[16px] font-medium tabular-nums text-[#F5F5F5]">{isCurrentQuarter ? `${daysLeft} días` : '—'}</dd></div>
                </dl>
                {!isMilestone && <p className="text-[12px] uppercase tracking-[0.08em] text-[#6E6E73]">{label}</p>}

                {isCurrentQuarter && (
                  <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.045] px-4 py-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: o.confidence ? confidenceColor(o.confidence) : '#555' }} />
                      <p className="truncate text-[13px]" style={{ color: stale ? '#E8C15A' : '#A8A8AD' }}>{checkinText}{lastCheckin && o.lastCheckinBy ? ` · ${String(o.lastCheckinBy).split(' ')[0]}` : ''}</p>
                    </div>
                    <button type="button" onClick={() => setCheckingIn(true)} className={action}>{lastCheckin ? 'Hacer check-in' : 'Primer check-in'}</button>
                  </div>
                )}

                {editing ? (
                  <div className="flex items-center gap-2">
                    <input type="number" autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') saveValue(); if (e.key === 'Escape') setEditing(false) }} className="w-40 rounded-lg border border-white/[0.14] bg-[#141414] px-3 py-2 text-[16px] text-[#F5F5F5] outline-none" />
                    <button type="button" onClick={saveValue} className="ador-btn-primary rounded-full px-4 py-2 text-[13px] font-medium">Guardar</button>
                    <button type="button" onClick={() => setEditing(false)} className="px-2 text-[13px] text-[#8E8E93]">Cancelar</button>
                  </div>
                ) : (
                  <div className="-ml-3.5 flex flex-wrap items-center gap-x-1 gap-y-1">
                    {isMilestone && (
                      <button type="button" onClick={() => withTimeout(updateObjetivo(o.id, { completed: !o.completed })).catch(fail('actualizar'))} className={action}>{o.completed ? 'Reabrir hito' : 'Marcar como logrado'}</button>
                    )}
                    {!isMilestone && o.metric === 'custom' && <button type="button" onClick={() => { setDraft(String(o.currentValue || '')); setEditing(true) }} className={action}>Actualizar valor</button>}
                    {canManage && !isMilestone && <button type="button" onClick={() => withTimeout(setNorthStar(o.id, northStarId)).catch(fail('actualizar'))} className={action}>{o.isNorthStar ? 'Quitar Métrica Norte' : 'Marcar como Métrica Norte'}</button>}
                    {canManage && <button type="button" onClick={() => setConfirmDelete(true)} className="rounded-full px-3.5 py-1.5 text-[13px] font-medium text-[#FF6B63] transition-colors hover:bg-white/[0.08]">Eliminar…</button>}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>{checkingIn && <CheckinModal objetivo={o} actorName={actorName} onClose={() => setCheckingIn(false)} />}</AnimatePresence>
      {confirmDelete && (
        <ConfirmDeleteModal
          title={`¿Eliminar «${o.title}»?`}
          description="El objetivo, su check-in y su progreso se borran para todo el equipo. Esta acción no se puede deshacer."
          name={o.title}
          onClose={() => setConfirmDelete(false)}
          onConfirm={() => withTimeout(deleteObjetivo(o.id))}
        />
      )}
    </article>
  )
}
