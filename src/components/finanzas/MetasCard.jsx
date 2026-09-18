import { useState } from 'react'
import { motion } from 'framer-motion'
import { currencyPEN } from '../../lib/clientStages'
import { quarterLabel } from '../../lib/finance'
import { setQuarterlyTarget, setAnnualTarget } from '../../lib/firestore'
import { withTimeout } from '../../lib/workspace'
import { useToast } from '../../hooks/useToast'
import { EditIcon, PlusIcon } from '../icons'

// Hand-drawn SVG radial progress — same hand-drawn-not-a-library convention
// as every other chart in Finanzas (FinanceChart.jsx, ProjectionBar) and
// Workspace's own ProgressDonut (HoyRightRail.jsx), reused here instead of
// inventing a third progress-visual style.
function GoalRing({ pct, color }) {
  const radius = 38
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - Math.min(1, pct / 100))
  return (
    <svg width="92" height="92" viewBox="0 0 92 92" className="flex-shrink-0 -rotate-90">
      <circle cx="46" cy="46" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
      <circle
        cx="46"
        cy="46"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  )
}

// Quarterly and annual revenue targets, merged into one card with a
// Trimestre/Año toggle instead of two near-identical cards — same concept
// at a different time scope, direct feedback that two separate cards would
// just crowd the right column. Same robust edit flow RunwayCard got
// (Cancelar + real Escape handler calling the same function, inline
// validation, loading state via withTimeout+toast) rather than the older,
// silently-do-nothing-on-bad-input pattern.
export default function MetasCard({ quarterKey, quarterlyTarget, recaudadoTrimestre, annualTarget, recaudadoAnual, currentYear }) {
  const [period, setPeriod] = useState('trimestre') // 'trimestre' | 'año'
  const [editing, setEditing] = useState(false)
  const showToast = useToast()

  const isQuarter = period === 'trimestre'
  const target = isQuarter ? quarterlyTarget : annualTarget
  const recaudado = isQuarter ? recaudadoTrimestre : recaudadoAnual
  const label = isQuarter ? `Trimestre — ${quarterLabel(quarterKey)}` : `Año ${currentYear}`
  const pct = target ? Math.min(100, Math.round((recaudado / target) * 100)) : 0
  const color = pct >= 100 ? '#4CAF50' : pct >= 60 ? '#1E5FAD' : '#B8860B'

  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const openEdit = () => {
    setDraft(target || '')
    setError('')
    setEditing(true)
  }
  const cancelEdit = () => {
    setDraft(target || '')
    setError('')
    setEditing(false)
  }
  const save = async () => {
    const amount = Number(draft)
    if (draft.toString().trim() === '' || Number.isNaN(amount) || amount <= 0) {
      setError('Ingresa un monto válido.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await withTimeout(isQuarter ? setQuarterlyTarget(amount) : setAnnualTarget(amount))
      setEditing(false)
    } catch (err) {
      showToast(`No se pudo guardar: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="ador-glass ador-grain rounded-[16px] px-6 py-5">
      <div className="flex items-center justify-between">
        <span className="font-medium text-[#444444]" style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Metas
        </span>
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-0.5 rounded-full bg-white/[0.05] p-0.5">
            {[
              { id: 'trimestre', label: 'Trimestre' },
              { id: 'año', label: 'Año' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPeriod(p.id)
                  if (editing) cancelEdit()
                }}
                className="relative rounded-full px-2.5 py-1 text-[10.5px] font-medium transition-colors duration-150"
                style={{ color: period === p.id ? '#F5F5F5' : '#666666' }}
              >
                {period === p.id && (
                  <motion.div layoutId="metas-period-indicator" className="absolute inset-0 rounded-full bg-white/[0.1]" transition={{ type: 'spring', stiffness: 500, damping: 34 }} />
                )}
                <span className="relative">{p.label}</span>
              </button>
            ))}
          </div>
          {!editing && target > 0 && (
            <button type="button" onClick={openEdit} className="flex h-6 w-6 items-center justify-center rounded-full text-[#444444] transition-colors duration-150 hover:bg-white/[0.08] hover:text-[#F5F5F5]">
              <EditIcon size={13} />
            </button>
          )}
        </div>
      </div>

      <p className="mt-2 text-[12px] text-[#666666]">{label}</p>

      {editing ? (
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center gap-1.5 rounded-lg border border-white/[0.1] bg-[#1A1A1A] px-2.5 py-1.5 focus-within:border-white/[0.2]">
              <span className="text-[14px] text-[#666666]">S/</span>
              <input
                type="number"
                min="0"
                autoFocus
                value={draft}
                disabled={saving}
                onChange={(e) => {
                  setDraft(e.target.value)
                  if (error) setError('')
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') save()
                  if (e.key === 'Escape') {
                    e.stopPropagation()
                    cancelEdit()
                  }
                }}
                placeholder="Monto objetivo"
                className="w-full bg-transparent text-[16px] text-[#F5F5F5] outline-none disabled:opacity-50"
              />
            </div>
            <button type="button" onClick={save} disabled={saving} className="ador-btn-primary rounded-lg px-3 py-1.5 text-[12px] font-medium disabled:opacity-60">
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
            <button type="button" onClick={cancelEdit} disabled={saving} className="rounded-lg px-2 py-1.5 text-[12px] text-[#888888] transition-colors duration-150 hover:text-[#F5F5F5] disabled:opacity-50">
              Cancelar
            </button>
          </div>
          {error && <p className="text-[11.5px] text-[#EF5350]">{error}</p>}
          <p className="text-[11px] text-[#444444]">Esc para cerrar sin guardar.</p>
        </div>
      ) : !target ? (
        <button
          type="button"
          onClick={openEdit}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/[0.14] py-3 text-[13px] text-[#666666] transition-colors duration-150 hover:border-white/[0.24] hover:text-[#888888]"
        >
          <PlusIcon size={13} /> Definir meta de {isQuarter ? 'trimestre' : 'año'}
        </button>
      ) : (
        <div className="mt-3 flex items-center gap-5">
          <div className="relative flex h-[92px] w-[92px] flex-shrink-0 items-center justify-center">
            <GoalRing pct={pct} color={color} />
            <span className="absolute text-[17px] font-semibold text-[#F5F5F5]">{pct}%</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[19px] font-semibold text-[#F5F5F5]">{currencyPEN.format(target)}</p>
            <p className="mt-1 text-[12px] text-[#888888]">
              {currencyPEN.format(recaudado)} recaudado
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
