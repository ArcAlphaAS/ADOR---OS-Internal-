import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { currencyPEN } from '../../lib/clientStages'
import { metricLabel, objetivoPct, objetivoStatus, objetivoLinks, OBJETIVO_STATUS } from '../../lib/objetivos'
import { updateObjetivo, deleteObjetivo, setNorthStar } from '../../lib/firestore'
import { withTimeout } from '../../lib/workspace'
import { useToast } from '../../hooks/useToast'
import Avatar from '../shell/Avatar'
import CheckinModal from './CheckinModal'
import { SERIF } from '../news/NewsLayout'

// One objetivo as a wide, numbered row (from the user's reference): status
// chip, serif title, description and the modules it's connected to on the
// left; on the right the number, the bar and three facts — pace against
// the quarter, owner, days left. Actions live in the ⋯ menu.

function formatValue(value, unit) {
  if (unit === 'S/') return currencyPEN.format(value || 0)
  return `${Math.round(value || 0)}${unit ? ` ${unit}` : ''}`
}

function Fact({ icon, value, label, color }) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <span className="mt-0.5 flex-shrink-0 text-[#8A8A8A]">{icon}</span>
      <div className="min-w-0">
        <p className="truncate text-[15px] font-medium" style={{ color: color || '#F5F5F5' }}>
          {value}
        </p>
        <p className="truncate text-[11.5px] text-[#7A7A7A]">{label}</p>
      </div>
    </div>
  )
}

const TrendIcon = ({ up }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {up ? <path d="M3 17l6-6 4 4 8-8M15 7h6v6" /> : <path d="M3 7l6 6 4-4 8 8M15 17h6v-6" />}
  </svg>
)
const CalendarSmall = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
    <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </svg>
)

export default function ObjetivoRow({ objetivo, index, owner, actorName, northStarId, elapsedPct, daysLeft, isCurrentQuarter, onNavigate }) {
  const [menu, setMenu] = useState(false)
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
  const barColor = pct >= 100 ? '#E8C15A' : status.color === '#EF5350' ? '#EF5350' : '#3B82F6'

  const saveValue = () => {
    const value = Number(draft)
    if (!Number.isNaN(value)) withTimeout(updateObjetivo(o.id, { currentValue: value })).catch(fail('guardar'))
    setEditing(false)
  }

  const menuItem = (text, onClick, danger) => (
    <button
      type="button"
      onClick={() => {
        onClick()
        if (!danger) setMenu(false)
      }}
      className={`w-full px-4 py-2.5 text-left text-[13px] hover:bg-white/[0.05] ${danger ? 'text-[#FF6B63]' : 'text-[#DDDDDD]'}`}
    >
      {text}
    </button>
  )

  return (
    <article
      className={`ador-wrap ador-glass ador-grain relative grid grid-cols-1 gap-6 rounded-[22px] p-5 md:p-7 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-10 ${o.isNorthStar ? 'ador-card-attention' : ''}`}
    >
      {/* Left: what and why */}
      <div className="flex gap-4 md:gap-6">
        <span className="mt-1 text-[15px] font-medium tabular-nums text-[#6A6A6A]">{String(index + 1).padStart(2, '0')}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium" style={{ color: status.color, background: `${status.color}1A` }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: status.color }} />
              {status.label}
            </span>
            {o.isNorthStar && <span className="rounded-full bg-[#E8C15A]/15 px-2.5 py-1 text-[12px] font-medium text-[#E8C15A]">★ Métrica Norte</span>}
            {o.foco && o.foco !== 'General' && <span className="text-[12px] text-[#7A7A7A]">{o.foco}</span>}
          </div>
          <h2 className="mt-3 text-[24px] leading-[1.15] text-[#F5F5F5] md:text-[28px]" style={SERIF}>
            {o.title}
          </h2>
          {o.description && <p className="mt-2 max-w-[560px] text-[14px] leading-relaxed text-[#9A9A9A]">{o.description}</p>}
          {o.blocker && (o.confidence === 'rojo' || o.confidence === 'amarillo') && (
            <p className="mt-2 text-[13px] text-[#CFC6B8]">
              <span className="text-[#8A8A8A]">Bloqueo:</span> {o.blocker}
            </p>
          )}
          {links.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {links.map((l) => (
                <button key={l.label} type="button" onClick={() => onNavigate?.(l.module)} className="rounded-full border border-white/[0.1] bg-white/[0.03] px-3 py-1 text-[12.5px] text-[#BBBBBB] hover:border-white/[0.2] hover:text-[#F5F5F5]">
                  {l.label} ↗
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: the number */}
      <div className="flex flex-col gap-4 border-t border-white/[0.06] pt-5 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#8A8A8A]">{isMilestone ? 'Hito' : label}</p>
          <div className="relative flex items-center gap-2">
            <span className="rounded-full border border-white/[0.1] px-3 py-1 text-[12px] text-[#BBBBBB]">Trimestral</span>
            <button type="button" onClick={() => setMenu((v) => !v)} aria-label="Más opciones" className="flex h-8 w-8 items-center justify-center rounded-full text-[18px] leading-none text-[#AAAAAA] hover:bg-white/[0.06]">
              ⋯
            </button>
            {menu && (
              <div className="absolute right-0 top-10 z-20 w-56 overflow-hidden rounded-xl border border-white/[0.1] bg-[#1C1C1E] shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                {menuItem('Check-in semanal', () => setCheckingIn(true))}
                {!isMilestone && menuItem(o.isNorthStar ? 'Quitar Métrica Norte' : '★ Marcar como Métrica Norte', () => withTimeout(setNorthStar(o.id, northStarId)).catch(fail('actualizar')))}
                {!isMilestone && o.metric === 'custom' && menuItem('Actualizar valor', () => {
                  setDraft(String(o.currentValue || ''))
                  setEditing(true)
                })}
                {menuItem(confirmDelete ? '¿Seguro? Eliminar' : 'Eliminar objetivo', () => (confirmDelete ? withTimeout(deleteObjetivo(o.id)).catch(fail('eliminar')) : setConfirmDelete(true)), true)}
              </div>
            )}
          </div>
        </div>

        {isMilestone ? (
          <button
            type="button"
            onClick={() => withTimeout(updateObjetivo(o.id, { completed: !o.completed })).catch(fail('actualizar'))}
            className="flex items-center gap-3 self-start rounded-2xl border px-4 py-3 transition-colors"
            style={{ borderColor: o.completed ? 'rgba(232,193,90,0.5)' : 'rgba(255,255,255,0.12)', background: o.completed ? 'rgba(232,193,90,0.1)' : 'transparent' }}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full border" style={{ borderColor: o.completed ? '#E8C15A' : 'rgba(255,255,255,0.3)', color: '#E8C15A' }}>
              {o.completed ? '✓' : ''}
            </span>
            <span className="text-[16px] font-medium" style={{ color: o.completed ? '#E8C15A' : '#F5F5F5' }}>
              {o.completed ? 'Logrado' : 'Marcar como logrado'}
            </span>
          </button>
        ) : editing ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveValue()
                if (e.key === 'Escape') setEditing(false)
              }}
              className="w-40 rounded-lg border border-white/[0.14] bg-[#141414] px-3 py-2 text-[18px] text-[#F5F5F5] outline-none"
            />
            <button type="button" onClick={saveValue} className="ador-btn-primary rounded-lg px-3 py-2 text-[12.5px] font-medium">
              Guardar
            </button>
            <button type="button" onClick={() => setEditing(false)} className="px-2 text-[12.5px] text-[#8A8A8A]">
              Cancelar
            </button>
          </div>
        ) : (
          <>
            <p className="text-[26px] font-semibold tabular-nums text-[#F5F5F5] md:text-[30px]">
              {isCurrentQuarter || o.metric === 'custom' ? formatValue(o.currentValue, o.unit) : '—'}
              <span className="text-[16px] font-normal text-[#7A7A7A]"> / {formatValue(o.targetValue, o.unit)}</span>
            </p>
            <div className="flex items-center gap-4">
              <div className="h-[7px] flex-1 overflow-hidden rounded-full bg-white/[0.08]">
                <motion.div className="h-full rounded-full" style={{ background: barColor }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} />
              </div>
              <span className="w-14 text-right text-[17px] font-semibold tabular-nums text-[#F5F5F5]">{pct}%</span>
            </div>
          </>
        )}

        <div className="grid grid-cols-3 gap-3 border-t border-white/[0.06] pt-4">
          {pace !== null ? (
            <Fact icon={<TrendIcon up={pace >= 0} />} value={`${pace >= 0 ? '+' : '−'}${Math.abs(pace)} pts`} label="vs. ritmo del trimestre" color={pace >= 0 ? '#4CAF50' : '#EF5350'} />
          ) : (
            <Fact icon={<TrendIcon up={pct >= 100} />} value={`${pct}%`} label="avance" />
          )}
          <Fact
            icon={owner ? <Avatar photoURL={owner.photoDataUrl} displayName={owner.displayName} email={owner.email} size={18} /> : <span className="text-[14px]">👤</span>}
            value={owner ? (owner.displayName || owner.email || '').split(' ')[0] : 'Sin asignar'}
            label="responsable"
          />
          <Fact icon={<CalendarSmall />} value={isCurrentQuarter ? `${daysLeft} días` : '—'} label={isCurrentQuarter ? 'restantes' : 'otro trimestre'} />
        </div>
      </div>

      <AnimatePresence>{checkingIn && <CheckinModal objetivo={o} actorName={actorName} onClose={() => setCheckingIn(false)} />}</AnimatePresence>
    </article>
  )
}
