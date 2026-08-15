import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { currencyPEN } from '../../lib/clientStages'
import { confidenceColor } from '../../lib/objetivos'
import { updateObjetivo, deleteObjetivo, setNorthStar } from '../../lib/firestore'
import { withTimeout } from '../../lib/workspace'
import { EditIcon, CheckCircleIcon, CloseIcon } from '../icons'
import Avatar from '../shell/Avatar'
import CheckinModal from './CheckinModal'
import { useToast } from '../../hooks/useToast'

function formatValue(value, unit) {
  if (unit === 'S/') return currencyPEN.format(value)
  return `${Math.round(value)}${unit ? ` ${unit}` : ''}`
}

// Owner avatar + confidence dot + linked-task count + "Check-in" — shared
// by both card types since a milestone can be "en riesgo" just as much as a
// numeric goal can.
function CardFooter({ objetivo, owner, onCheckin }) {
  return (
    <div className="mt-3 flex items-center gap-2 border-t border-white/[0.06] pt-3">
      {owner && <Avatar photoURL={owner.photoDataUrl} displayName={owner.displayName} email={owner.email} size={20} />}
      {objetivo.confidence && (
        <span
          className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
          style={{ background: confidenceColor(objetivo.confidence) }}
          title={objetivo.blocker || undefined}
        />
      )}
      {objetivo.linkedTaskCount > 0 && (
        <span className="text-[11px] text-[#666666]">{objetivo.linkedTaskCount} tarea{objetivo.linkedTaskCount === 1 ? '' : 's'}</span>
      )}
      <button
        type="button"
        onClick={onCheckin}
        className="ml-auto text-[11px] font-medium text-[#1E5FAD] hover:underline"
      >
        Check-in
      </button>
    </div>
  )
}

function KpiCard({ objetivo, owner, actorName, allObjetivoIds }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(objetivo.currentValue || '')
  const [checkingIn, setCheckingIn] = useState(false)
  const showToast = useToast()
  const isCustom = objetivo.metric === 'custom'
  const pct = objetivo.targetValue ? Math.min(100, Math.round((objetivo.currentValue / objetivo.targetValue) * 100)) : 0
  const reached = pct >= 100

  const save = () => {
    const value = Number(draft)
    if (!Number.isNaN(value)) {
      withTimeout(updateObjetivo(objetivo.id, { currentValue: value })).catch((error) =>
        showToast(`No se pudo guardar: ${error.message}`)
      )
    }
    setEditing(false)
  }

  const toggleNorthStar = () => {
    withTimeout(setNorthStar(objetivo.id, allObjetivoIds?.northStarId)).catch((error) =>
      showToast(`No se pudo actualizar: ${error.message}`)
    )
  }

  const remove = () => {
    withTimeout(deleteObjetivo(objetivo.id)).catch((error) => showToast(`No se pudo eliminar: ${error.message}`))
  }

  return (
    <div className="ador-glass ador-grain ador-card-hover rounded-2xl px-6 py-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[14px] font-medium text-[#F5F5F5]">{objetivo.title}</p>
        <div className="flex flex-shrink-0 items-center gap-1">
          {reached && <CheckCircleIcon size={16} style={{ color: '#B8860B' }} />}
          <button
            type="button"
            onClick={toggleNorthStar}
            title="Marcar como Métrica Norte"
            className="flex h-6 w-6 items-center justify-center rounded-full text-[13px] leading-none transition-colors duration-150 hover:bg-white/[0.08]"
            style={{ color: objetivo.isNorthStar ? '#1E5FAD' : '#444444' }}
          >
            ★
          </button>
          {isCustom && !editing && (
            <button
              type="button"
              onClick={() => {
                setDraft(objetivo.currentValue || '')
                setEditing(true)
              }}
              className="flex h-6 w-6 items-center justify-center rounded-full text-[#444444] transition-colors duration-150 hover:bg-white/[0.08] hover:text-[#F5F5F5]"
            >
              <EditIcon size={12} />
            </button>
          )}
          <button
            type="button"
            onClick={remove}
            className="flex h-6 w-6 items-center justify-center rounded-full text-[#444444] transition-colors duration-150 hover:bg-white/[0.08] hover:text-[#F5F5F5]"
          >
            <CloseIcon size={11} />
          </button>
        </div>
      </div>

      {editing ? (
        <div className="mt-3 flex items-center gap-2">
          <input
            type="number"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            className="w-full rounded-lg border border-white/[0.1] bg-[#1A1A1A] px-2.5 py-1.5 text-[14px] text-[#F5F5F5] outline-none focus:border-white/[0.2]"
          />
          <button type="button" onClick={save} className="ador-btn-primary rounded-lg px-3 py-1.5 text-[12px] font-medium">
            Guardar
          </button>
        </div>
      ) : (
        <>
          <div className="mt-3 h-[3px] w-full overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: reached ? '#B8860B' : '#1E5FAD' }}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[13px] font-medium text-[#F5F5F5]">{pct}%</span>
            <span className="text-[12px] text-[#888888]">
              {formatValue(objetivo.currentValue, objetivo.unit)} de {formatValue(objetivo.targetValue, objetivo.unit)}
            </span>
          </div>
        </>
      )}

      <CardFooter objetivo={objetivo} owner={owner} onCheckin={() => setCheckingIn(true)} />

      <AnimatePresence>
        {checkingIn && <CheckinModal objetivo={objetivo} actorName={actorName} onClose={() => setCheckingIn(false)} />}
      </AnimatePresence>
    </div>
  )
}

function MilestoneCard({ objetivo, owner, actorName }) {
  const [checkingIn, setCheckingIn] = useState(false)
  const showToast = useToast()

  const toggleCompleted = () => {
    withTimeout(updateObjetivo(objetivo.id, { completed: !objetivo.completed })).catch((error) =>
      showToast(`No se pudo actualizar: ${error.message}`)
    )
  }

  const remove = () => {
    withTimeout(deleteObjetivo(objetivo.id)).catch((error) => showToast(`No se pudo eliminar: ${error.message}`))
  }

  return (
    <div className="ador-glass ador-grain ador-card-hover rounded-2xl px-6 py-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleCompleted}
          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border transition-colors duration-150"
          style={{
            borderColor: objetivo.completed ? '#B8860B' : 'rgba(255,255,255,0.2)',
            background: objetivo.completed ? 'rgba(184,134,11,0.15)' : 'transparent',
            color: '#B8860B',
          }}
        >
          {objetivo.completed && <CheckCircleIcon size={14} />}
        </button>
        <p
          className="flex-1 text-[14px]"
          style={{
            color: objetivo.completed ? '#666666' : '#F5F5F5',
            textDecoration: objetivo.completed ? 'line-through' : 'none',
          }}
        >
          {objetivo.title}
        </p>
        <button
          type="button"
          onClick={remove}
          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[#444444] transition-colors duration-150 hover:bg-white/[0.08] hover:text-[#F5F5F5]"
        >
          <CloseIcon size={11} />
        </button>
      </div>

      <CardFooter objetivo={objetivo} owner={owner} onCheckin={() => setCheckingIn(true)} />

      <AnimatePresence>
        {checkingIn && <CheckinModal objetivo={objetivo} actorName={actorName} onClose={() => setCheckingIn(false)} />}
      </AnimatePresence>
    </div>
  )
}

export default function ObjetivoCard({ objetivo, owner, actorName, northStarId }) {
  return objetivo.type === 'milestone' ? (
    <MilestoneCard objetivo={objetivo} owner={owner} actorName={actorName} />
  ) : (
    <KpiCard objetivo={objetivo} owner={owner} actorName={actorName} allObjetivoIds={{ northStarId }} />
  )
}
